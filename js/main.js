// ============================================================================
// main.js — boot, input, state machine (menu → bunker → raid → …), save/load
// ============================================================================
'use strict';

const SAVE_KEY='efclaudov_save_v1';
const G={ mode:'menu', paused:false, save:null };
const keys={};
const mouse={x:innerWidth/2, y:innerHeight/2, down:false, clicked:false, clickedFresh:false, overUI:false};

// ---------------------------------------------------------------------------
// save / load
// ---------------------------------------------------------------------------
function saveGame(){
  if(!G.save) return;
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); }catch(e){}
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const s=JSON.parse(raw);
    if(s && s.ver===1) return s;
  }catch(e){}
  return null;
}

// ---------------------------------------------------------------------------
// state transitions
// ---------------------------------------------------------------------------
function showMenu(){
  G.mode='menu';
  uiShowScreen('menu');
  $('btn-continue').disabled = !loadGame();
}
function newGame(){
  if(loadGame() && !confirm('Overwrite the existing save?')) return;
  G.save=starterSave();
  saveGame();
  enterBunker(true);
}
function continueGame(){
  const s=loadGame();
  if(!s) return;
  G.save=s;
  enterBunker(true);
}
function enterBunker(silent){
  G.mode='bunker'; G.paused=false;
  bkTab='stash';
  document.querySelectorAll('#bktabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab==='stash'));
  uiShowScreen('bunker');
  renderBunker();
  saveGame();
}
function deploy(){
  const eq=G.save.eq;
  if(!eq.g1 && !eq.g2 && !eq.melee){
    uiToast('Equip at least one weapon before deploying! (right-click a gun)','bad');
    return;
  }
  G.mode='raid'; G.paused=false;
  uiCloseAllPanels();
  startRaidState();
  dog.x=P.x-30; dog.y=P.y+10;
  uiShowScreen(null);
  uiRefreshAll();
  uiUpdateWeapon();
  saveGame();
}

// game.js calls these ---------------------------------------------------------
function handleExtract(zone){
  sfx('extract');
  // cash items become bunker funds
  let value=0, count=0;
  for(let i=0;i<G.save.inv.length;i++){
    const s=G.save.inv[i];
    if(!s) continue;
    if(s.id==='cash'){ G.save.cash+=s.q; G.save.inv[i]=null; continue; }
    value+=ITEMS[s.id].val*(s.q||1); count++;
  }
  for(let i=0;i<G.save.dog.length;i++){
    const s=G.save.dog[i];
    if(s && s.id==='cash'){ G.save.cash+=s.q; G.save.dog[i]=null; }
  }
  syncCorpse();
  G.save.stats.extracts++;
  saveGame();
  G.mode='summary';
  setTimeout(()=>uiShowSummary(zone.name, RAID.kills, RAID.time, count, value), 600);
}
function handlePlayerDeath(cause){
  sfx('quackdie'); sfx('hurt');
  const hadOld = !!G.save.corpse; // one-chance rule: old corpse stash is gone
  // everything on the body drops at the death site — dog pouch & totems survive
  const items=[];
  for(let i=0;i<G.save.inv.length;i++){
    if(G.save.inv[i]){ items.push(G.save.inv[i]); G.save.inv[i]=null; }
  }
  for(const k of ['g1','g2','melee']){
    if(G.save.eq[k]){ items.push(G.save.eq[k]); G.save.eq[k]=null; }
  }
  const lost=items.length;
  while(items.length%6!==0 || items.length===0) items.push(null);
  G.save.corpse = lost>0 ? {x:Math.round(P.x), y:Math.round(P.y), items} : null;
  G.save.stats.deaths++;
  saveGame();
  G.mode='dead';
  setTimeout(()=>uiShowDeath(cause,lost,hadOld), 1100);
}
// keep save.corpse in sync with the in-raid corpse container after a raid ends
function syncCorpse(){
  if(!RAID) return;
  const c=RAID.containers.find(c=>c.type==='pcorpse');
  if(c){
    const remaining=c.items.filter(s=>s);
    G.save.corpse = remaining.length ? {x:c.x,y:c.y,items:c.items} : null;
    if(!remaining.length) uiToast('Corpse recovered in full.','good');
  }
}

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='tab'){ e.preventDefault(); if(G.mode==='raid'&&!G.paused) uiToggleInv(); return; }
  if(keys[k]) return; // ignore auto-repeat
  keys[k]=true;
  audio();
  if(G.mode!=='raid'||G.paused){
    if(k==='escape'&&G.mode==='raid'&&G.paused) togglePause();
    return;
  }
  switch(k){
    case 'e': keys._e=true; break;
    case 'r': startReload(); break;
    case 'f': quickBandage(); break;
    case '1': switchWeapon(0); break;
    case '2': switchWeapon(1); break;
    case '3': switchWeapon(2); break;
    case 'm': sndMuted=!sndMuted; uiToast('Sound '+(sndMuted?'off':'on'),''); break;
    case 'escape':
      if(uiLootOpen()) uiCloseLoot();
      else if($('invpanel').style.display==='block') uiCloseAllPanels();
      else togglePause();
      break;
  }
});
addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; mouse.down=false;
  if(G.mode==='raid'&&!G.paused) togglePause(); });

addEventListener('mousemove',e=>{
  mouse.x=e.clientX; mouse.y=e.clientY;
  mouse.overUI = e.target!==cvs;
});
cvs.addEventListener('mousedown',e=>{
  audio();
  if(e.button===0){ mouse.down=true; mouse.clickedFresh=true; }
});
addEventListener('mouseup',e=>{ if(e.button===0){ mouse.down=false; } });
addEventListener('wheel',e=>{
  if(G.mode!=='raid'||G.paused||mouse.overUI) return;
  const dir=e.deltaY>0?1:-1;
  const slots=[G.save.eq.g1,G.save.eq.g2,G.save.eq.melee];
  for(let step=1;step<=3;step++){
    const idx=(P.active+dir*step+9)%3;
    if(slots[idx]){ switchWeapon(idx); break; }
  }
});

function togglePause(){
  if(G.mode!=='raid') return;
  G.paused=!G.paused;
  uiShowScreen(G.paused?'pause':null);
}

// ---------------------------------------------------------------------------
// buttons
// ---------------------------------------------------------------------------
$('btn-new').addEventListener('click',newGame);
$('btn-continue').addEventListener('click',continueGame);
$('btn-deploy').addEventListener('click',deploy);
$('btn-death-ok').addEventListener('click',()=>enterBunker());
$('btn-sum-ok').addEventListener('click',()=>enterBunker());
$('btn-resume').addEventListener('click',togglePause);
$('btn-mute').addEventListener('click',()=>{
  sndMuted=!sndMuted;
  $('btn-mute').textContent='Sound: '+(sndMuted?'Off':'On');
});
$('btn-abandon').addEventListener('click',()=>{
  if(!RAID||RAID.over){ togglePause(); return; }
  G.paused=false;
  uiShowScreen(null);
  P.dead=true; RAID.over=true;
  handlePlayerDeath('your own cowardice (abandoned raid)');
});

// ---------------------------------------------------------------------------
// canvas sizing & main loop
// ---------------------------------------------------------------------------
function resize(){ cvs.width=innerWidth; cvs.height=innerHeight; }
addEventListener('resize',resize);
resize();

let lastT=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-lastT)/1000);
  lastT=now;
  if(G.mode==='raid'||G.mode==='dead'||G.mode==='summary'){
    if(!G.paused && G.mode==='raid') updateRaid(dt);
    else if(RAID && (G.mode==='dead'||G.mode==='summary')){
      // let particles settle behind the end screens
      updateParticles(dt); cam.shk=Math.max(0,cam.shk-dt*18);
    }
    if(RAID) renderRaid();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showMenu();
