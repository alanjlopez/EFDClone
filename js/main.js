// ============================================================================
// main.js — boot, input, state machine (menu → base ⇄ raid), save/load
// ============================================================================
'use strict';

const SAVE_KEY='efclaudov_save_v1';
const G={ mode:'menu', paused:false, save:null };
const keys={};
const mouse={x:innerWidth/2, y:innerHeight/2, down:false, clickedFresh:false, overUI:false};

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
    return migrateSave(JSON.parse(raw));
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
  enterBase();
  uiToast('Welcome home. Walk to the ladder and press E to deploy.','good');
  uiToast('The stash and the crafting benches are all down here — walk up and press E.','');
}
function continueGame(){
  const s=loadGame();
  if(!s) return;
  G.save=s;
  enterBase();
}
// you always own the bunker-issue infinite pistol
function ensureBasePistol(){
  const isInf=s=>s && ITEMS[s.id] && ITEMS[s.id].inf;
  if(isInf(G.save.eq.g1)||isInf(G.save.eq.g2)) return;
  if(G.save.inv.some(isInf)||G.save.stash.some(isInf)||G.save.pouch.some(isInf)) return;
  const gun={id:'rustpistol',q:1,ammo:ITEMS.rustpistol.mag,att:{}};
  if(!G.save.eq.g1) G.save.eq.g1=gun;
  else if(!G.save.eq.g2) G.save.eq.g2=gun;
  else if(invAddItem(G.save.inv,gun)) invAddItem(G.save.stash,gun);
  uiToast('⚙️ Bunker-issue Rust Pistol re-issued.','');
}
function enterBase(){
  G.mode='base'; G.paused=false;
  ensureBasePistol();
  uiCloseAllPanels();
  startBaseState();
  uiShowScreen(null);
  uiRefreshAll();
  uiUpdateWeapon();
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
  uiShowScreen(null);
  uiRefreshAll();
  uiUpdateWeapon();
  saveGame();
}

// XP & leveling — each level grants a skill point
function awardXP(n){
  if(!G.save) return;
  G.save.xp=(G.save.xp||0)+n;
  let leveled=0;
  while(G.save.xp >= xpForNext(G.save.level)){
    G.save.xp-=xpForNext(G.save.level);
    G.save.level++; G.save.skillPts++; leveled++;
  }
  if(leveled){
    sfx('levelup');
    uiToast('⬆ LEVEL '+G.save.level+'! +'+leveled+' skill point'+(leveled>1?'s':'')+' — spend at the Skills Terminal.','good');
  }
}

// game.js calls these ---------------------------------------------------------
function handleExtract(zone){
  sfx('extract');
  // tally the haul: kept item stacks + how many raw materials came home
  let count=0, mats=0;
  const matIds=new Set(['scrap','wires','wood','stone','tape','feather']);
  for(const s of G.save.inv){
    if(!s) continue;
    count++;
    if(matIds.has(s.id)) mats+=s.q;
  }
  syncCorpse();
  G.save.stats.extracts++;
  awardXP(20 + RAID.kills*2); // extraction bonus + per-kill XP settle
  const contractMsg=settleContract(zone);
  saveGame();
  G.mode='summary';
  setTimeout(()=>uiShowSummary(zone.name, RAID.kills, RAID.time, count, mats, contractMsg), 600);
}
function handlePlayerDeath(cause){
  sfx('groandie'); sfx('hurt');
  const hadOld = !!G.save.corpse; // one-chance rule: old corpse stash is gone
  // everything on the body drops at the death site —
  // secure pouch, totems & the bunker-issue pistol survive
  const items=[];
  for(let i=0;i<G.save.inv.length;i++){
    if(G.save.inv[i]){ items.push(G.save.inv[i]); G.save.inv[i]=null; }
  }
  for(const k of ['g1','g2','melee']){
    const s=G.save.eq[k];
    if(s && !ITEMS[s.id].inf){ items.push(s); G.save.eq[k]=null; }
  }
  const lost=items.length;
  while(items.length%6!==0 || items.length===0) items.push(null);
  G.save.corpse = lost>0 ? {x:Math.round(P.x), y:Math.round(P.y), items} : null;
  G.save.stats.deaths++;
  saveGame();
  G.mode='dead';
  setTimeout(()=>uiShowDeath(cause,lost,hadOld), 1100);
}
// how far along is the active contract, given this raid's tally?
function contractProgress(zone){
  const c=G.save.contract; if(!c || !RAID) return 0;
  const def=CONTRACT_DEFS[c.id];
  if(def.track==='redExtract') return RAID.redVisited ? 1 : 0; // reached a red zone
  return RAID[def.track]||0;
}
// pay out the active contract if this extraction completed it
function settleContract(zone){
  const c=G.save.contract; if(!c) return null;
  const def=CONTRACT_DEFS[c.id];
  if(contractProgress(zone) < c.need) return null;
  // grant reward
  const parts=[];
  for(const id in def.reward){
    let rid=id, q=def.reward[id];
    if(id==='t_random'){ const t=['t_sturdy','t_swift','t_owl','t_vamp','t_plume']; rid=t[(Math.random()*t.length)|0]; }
    const slot={id:rid,q}; if(ITEMS[rid].type==='gun'){ slot.q=1; slot.ammo=0; slot.att={}; }
    if(invAddItem(G.save.stash,slot)) invAddItem(G.save.inv,slot);
    parts.push(q+'× '+ITEMS[rid].icon+' '+ITEMS[rid].name);
  }
  awardXP(def.xp);
  G.save.contractsDone++;
  G.save.contract=null; G.save.offered=null; // reroll the board next visit
  return '✔ Contract complete: '+def.name+' — +'+def.xp+' XP, '+parts.join(', ');
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
const inPlay=()=> (G.mode==='raid'||G.mode==='base') && !G.paused;
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='tab'){ e.preventDefault(); if(inPlay()) uiToggleInv(); return; }
  if(keys[k]) return; // ignore auto-repeat
  keys[k]=true;
  audio();
  if(!inPlay()){
    if(k==='escape'&&(G.mode==='raid'||G.mode==='base')&&G.paused) togglePause();
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
      else if(uiStationOpen()) uiCloseStation();
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
  if(!inPlay()||mouse.overUI) return;
  const dir=e.deltaY>0?1:-1;
  const slots=[G.save.eq.g1,G.save.eq.g2,G.save.eq.melee];
  for(let step=1;step<=3;step++){
    const idx=(P.active+dir*step+9)%3;
    if(slots[idx]){ switchWeapon(idx); break; }
  }
});

function togglePause(){
  if(G.mode!=='raid'&&G.mode!=='base') return;
  G.paused=!G.paused;
  $('btn-abandon').style.display = (G.mode==='raid')?'block':'none';
  uiShowScreen(G.paused?'pause':null);
}

// ---------------------------------------------------------------------------
// buttons
// ---------------------------------------------------------------------------
$('btn-new').addEventListener('click',newGame);
$('btn-continue').addEventListener('click',continueGame);
$('btn-death-ok').addEventListener('click',()=>enterBase());
$('btn-sum-ok').addEventListener('click',()=>enterBase());
$('btn-resume').addEventListener('click',togglePause);
$('btn-mute').addEventListener('click',()=>{
  sndMuted=!sndMuted;
  $('btn-mute').textContent='Sound: '+(sndMuted?'Off':'On');
});
$('btn-abandon').addEventListener('click',()=>{
  if(G.mode!=='raid'||!RAID||RAID.over){ togglePause(); return; }
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
  if(G.mode!=='menu'){
    if(!G.paused && (G.mode==='raid'||G.mode==='base')) updateRaid(dt);
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
