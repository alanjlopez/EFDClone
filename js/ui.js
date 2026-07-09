// ============================================================================
// ui.js — DOM UI: HUD, inventory grids + drag & drop, loot panel, bunker,
//         tooltips, toasts, screens
// ============================================================================
'use strict';

const $=id=>document.getElementById(id);

// ---------------------------------------------------------------------------
// slot access layer — every grid slot is addressed by (key, index)
// ---------------------------------------------------------------------------
let LOOT=null; // currently open loot container
function uiGetSlot(key,i){
  if(key.startsWith('eq:')) return G.save.eq[key.slice(3)];
  if(key==='loot') return LOOT?LOOT.items[i]:null;
  if(key==='inv') return G.save.inv[i];
  if(key==='stash') return G.save.stash[i];
  if(key==='dog') return G.save.dog[i];
  return null;
}
function uiSetSlot(key,i,s){
  if(key.startsWith('eq:')){ G.save.eq[key.slice(3)]=s; return; }
  if(key==='loot'){ if(LOOT) LOOT.items[i]=s; return; }
  if(key==='inv') G.save.inv[i]=s;
  else if(key==='stash') G.save.stash[i]=s;
  else if(key==='dog') G.save.dog[i]=s;
}
function slotAccepts(key,s){
  if(!s) return true;
  const t=ITEMS[s.id].type;
  if(key==='eq:g1'||key==='eq:g2') return t==='gun';
  if(key==='eq:melee') return t==='melee';
  if(key==='eq:t1'||key==='eq:t2') return t==='totem';
  return true;
}
function listArr(key){
  if(key==='inv') return G.save.inv;
  if(key==='stash') return G.save.stash;
  if(key==='dog') return G.save.dog.slice(0,G.save.dogSlots);
  if(key==='loot') return LOOT?LOOT.items:[];
  return null;
}

function moveSlot(fk,fi,tk,ti){
  if(fk===tk && fi===ti) return;
  const src=uiGetSlot(fk,fi); if(!src) return;
  const dst=uiGetSlot(tk,ti);
  const sd=ITEMS[src.id];
  // stack merge
  if(dst && dst.id===src.id && sd.stack>1 && dst.q<sd.stack){
    const take=Math.min(sd.stack-dst.q, src.q);
    dst.q+=take; src.q-=take;
    if(src.q<=0) uiSetSlot(fk,fi,null);
    uiRefreshAll(); return;
  }
  // attach onto a gun
  if(dst && sd.type==='att' && ITEMS[dst.id].type==='gun'){
    const gd=ITEMS[dst.id];
    if(gd.slots && gd.slots.includes(sd.slot)){
      dst.att=dst.att||{};
      if(!dst.att[sd.slot]){
        dst.att[sd.slot]=src.id;
        src.q--; if(src.q<=0) uiSetSlot(fk,fi,null);
        sfx('reload'); uiToast(sd.name+' attached to '+gd.name,'good');
        uiRefreshAll(); return;
      }else{ uiToast(gd.name+' already has a '+sd.slot+'.','bad'); return; }
    }else{ uiToast(gd.name+' has no '+sd.slot+' slot.','bad'); return; }
  }
  // swap with type checks
  if(!slotAccepts(tk,src) || !slotAccepts(fk,dst)){ uiToast("That doesn't fit there.",'bad'); return; }
  uiSetSlot(tk,ti,src); uiSetSlot(fk,fi,dst);
  uiRefreshAll();
}

// quick transfer: click behaviour depends on context
function quickTransfer(key,i){
  const s=uiGetSlot(key,i); if(!s) return;
  // trader tab in bunker: clicking your own items sells them
  if(G.mode==='bunker' && bkTab==='trader' && (key==='inv'||key.startsWith('eq:')||key==='dog')){
    sellSlot(key,i); return;
  }
  let target=null;
  if(G.mode==='raid'){
    if(key==='loot') target='inv';
    else if(LOOT && (key==='inv')) target='loot';
  }else if(G.mode==='bunker'){
    if(key==='inv') target='stash';
    else if(key==='stash') target='inv';
  }
  if(!target) return;
  const arr=listArr(target);
  uiSetSlot(key,i,null);
  const left=invAddItem(arr,s);
  if(left) { uiSetSlot(key,i,left); uiToast('No room!','bad'); }
  else sfx('pickup');
  uiRefreshAll();
}

// right-click smart action
function smartAction(key,i,alt){
  const s=uiGetSlot(key,i); if(!s) return;
  const d=ITEMS[s.id];
  if(alt && d.type==='gun' && s.att && Object.keys(s.att).length){
    const arr=listArr(key==='stash'?'stash':'inv');
    for(const k of Object.keys(s.att)){
      const left=invAddItem(arr,{id:s.att[k],q:1});
      if(left){ uiToast('No room to strip mods.','bad'); break; }
      delete s.att[k];
    }
    uiRefreshAll(); return;
  }
  if(d.type==='gun'){
    const tgt = !G.save.eq.g1 ? 'eq:g1' : (!G.save.eq.g2 ? 'eq:g2' : 'eq:g1');
    moveSlot(key,i,tgt,0); return;
  }
  if(d.type==='melee'){ moveSlot(key,i,'eq:melee',0); return; }
  if(d.type==='totem'){
    const tgt = !G.save.eq.t1 ? 'eq:t1' : (!G.save.eq.t2 ? 'eq:t2' : 'eq:t1');
    moveSlot(key,i,tgt,0); return;
  }
  if(d.type==='att'){
    for(const gk of ['eq:g1','eq:g2']){
      const g=uiGetSlot(gk,0);
      if(g && ITEMS[g.id].slots && ITEMS[g.id].slots.includes(d.slot) && !(g.att&&g.att[d.slot])){
        g.att=g.att||{}; g.att[d.slot]=s.id;
        s.q--; if(s.q<=0) uiSetSlot(key,i,null);
        sfx('reload'); uiToast(d.name+' attached to '+ITEMS[g.id].name,'good');
        uiRefreshAll(); return;
      }
    }
    uiToast('No equipped gun takes a '+d.slot+'.','bad'); return;
  }
  if(d.use){
    if(G.mode==='raid'){ startUse(key,i,s); }
    else uiToast('You are rested — no need right now.','');
    return;
  }
}

function sellSlot(key,i){
  const s=uiGetSlot(key,i); if(!s) return;
  const d=ITEMS[s.id];
  if(d.type==='cash'){ G.save.cash+=s.q; uiSetSlot(key,i,null); }
  else{
    const v=d.val*(s.q||1);
    G.save.cash+=v; uiSetSlot(key,i,null);
    uiToast('Sold '+d.name+(s.q>1?' ×'+s.q:'')+' for $'+v,'good');
  }
  sfx('buy'); saveGame(); uiRefreshAll();
}

// ---------------------------------------------------------------------------
// grid rendering
// ---------------------------------------------------------------------------
function slotHtml(key,i,cls,tag){
  const s=uiGetSlot(key,i);
  let inner = tag?('<div class="eqtag">'+tag+'</div>'):'';
  if(s){
    const d=ITEMS[s.id];
    let badges='';
    if((s.q||1)>1) badges+='<span class="qty">'+s.q+'</span>';
    if(d.type==='gun') badges+='<span class="mag">'+(s.ammo||0)+'/'+d.mag+'</span>';
    if(s.att && Object.keys(s.att).length) badges+='<span class="att">+'+Object.keys(s.att).length+'</span>';
    inner='<div class="itm'+(d.rare?' rare':'')+'" data-key="'+key+'" data-i="'+i+'">'+d.icon+badges+'</div>';
  }
  return '<div class="slot '+(cls||'')+'" data-key="'+key+'" data-i="'+i+'">'+inner+'</div>';
}
function renderGrid(el,key,len,cls){
  let h='';
  for(let i=0;i<len;i++) h+=slotHtml(key,i,cls);
  el.innerHTML=h;
}
function renderEqRow(el){
  el.innerHTML =
    slotHtml('eq:g1',0,'eqslot','GUN 1') + slotHtml('eq:g2',0,'eqslot','GUN 2') +
    slotHtml('eq:melee',0,'eqslot','MELEE') + slotHtml('eq:t1',0,'eqslot','TOTEM') +
    slotHtml('eq:t2',0,'eqslot','TOTEM');
}
function renderDogRow(el){
  let h='';
  for(let i=0;i<G.save.dogSlots;i++) h+=slotHtml('dog',i,'dogslot');
  el.innerHTML=h;
}
function weightText(){
  const w=calcWeight(), cap=weightCap();
  return 'Weight: '+w.toFixed(1)+' / '+cap.toFixed(0)+' kg'+(w>cap?'  — ENCUMBERED':'');
}

function uiRefreshAll(){
  if(G.mode==='raid'){
    if($('invpanel').style.display==='block'){
      renderEqRow($('eqrow'));
      renderDogRow($('doggrid'));
      renderGrid($('invgrid'),'inv',G.save.inv.length);
      const wl=$('weightlbl'); wl.textContent=weightText();
      wl.className=calcWeight()>weightCap()?'over':'';
    }
    if(LOOT && $('lootpanel').style.display==='block')
      renderGrid($('lootgrid'),'loot',LOOT.items.length);
    uiUpdateWeapon();
  }else if(G.mode==='bunker'){
    renderBunker();
  }
}

// ---------------------------------------------------------------------------
// drag & drop + tooltip
// ---------------------------------------------------------------------------
let DRAG=null, dragMoved=false, dragStart={x:0,y:0};
const ghost=$('ghost'), tooltip=$('tooltip');

document.addEventListener('mousedown',e=>{
  const itm=e.target.closest('.itm');
  if(itm && e.button===0){
    DRAG={key:itm.dataset.key, i:+itm.dataset.i};
    dragMoved=false; dragStart={x:e.clientX,y:e.clientY};
    const s=uiGetSlot(DRAG.key,DRAG.i);
    ghost.textContent=s?ITEMS[s.id].icon:'';
    e.preventDefault();
  }
});
document.addEventListener('mousemove',e=>{
  if(DRAG){
    if(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>6) dragMoved=true;
    if(dragMoved){
      ghost.style.display='block';
      ghost.style.left=(e.clientX-14)+'px'; ghost.style.top=(e.clientY-16)+'px';
      tooltip.style.display='none';
    }
  }
  // tooltip
  if(!DRAG||!dragMoved){
    const itm=e.target.closest('.itm');
    if(itm){
      const s=uiGetSlot(itm.dataset.key,+itm.dataset.i);
      if(s){ showTooltip(s,e.clientX,e.clientY); return; }
    }
    tooltip.style.display='none';
  }
});
document.addEventListener('mouseup',e=>{
  if(!DRAG) return;
  const drag=DRAG; DRAG=null;
  ghost.style.display='none';
  if(e.button!==0) return;
  if(!dragMoved){ quickTransfer(drag.key,drag.i); return; }
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const slot=el && el.closest ? el.closest('.slot') : null;
  if(slot){
    moveSlot(drag.key,drag.i, slot.dataset.key, +slot.dataset.i);
  }else if(G.mode==='raid' && el===cvs && drag.key!=='loot'){
    const s=uiGetSlot(drag.key,drag.i);
    if(s){
      uiSetSlot(drag.key,drag.i,null);
      const left=gameDropItem(s);
      if(left) uiSetSlot(drag.key,drag.i,left);
      else uiToast('Dropped '+ITEMS[s.id].name+'.','');
      uiRefreshAll();
    }
  }
});
document.addEventListener('contextmenu',e=>{
  const itm=e.target.closest('.itm');
  if(itm){
    e.preventDefault();
    smartAction(itm.dataset.key,+itm.dataset.i,e.altKey);
  }else if(e.target===cvs) e.preventDefault();
});

function showTooltip(s,x,y){
  const d=ITEMS[s.id];
  let h='<div class="tname">'+d.icon+' '+d.name+'</div><div class="ttype">'+d.type+
        ' · '+(d.w*(s.q||1)).toFixed(1)+'kg · $'+d.val*(s.q||1)+'</div>';
  if(d.type==='gun'){
    h+='<div class="tstat">DMG '+d.dmg+(d.pellets?('×'+d.pellets):'')+' · RPM '+d.rpm+
       ' · MAG '+(s.ammo||0)+'/'+d.mag+'</div><div class="tstat">Ammo: '+ITEMS[d.ammo].name+
       (d.auto?' · AUTO':'')+'</div>';
    if(d.slots) h+='<div class="tstat">Mod slots: '+d.slots.join(', ')+'</div>';
    if(s.att) for(const k in s.att) h+='<div class="tstat">↳ '+ITEMS[s.att[k]].name+'</div>';
  }
  if(d.type==='melee') h+='<div class="tstat">DMG '+d.dmg+' · '+d.rate+'/s · stamina '+d.stam+'</div>';
  if(d.desc) h+='<div class="tdesc">'+d.desc+'</div>';
  tooltip.innerHTML=h;
  tooltip.style.display='block';
  const r=tooltip.getBoundingClientRect();
  tooltip.style.left=Math.min(x+16, innerWidth-r.width-8)+'px';
  tooltip.style.top=Math.min(y+16, innerHeight-r.height-8)+'px';
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function uiUpdateHUD(){
  if(!P||!RAID) return;
  $('b-hp').style.width=(P.hp/P.maxhp*100)+'%';
  $('b-st').style.width=P.stam+'%';
  $('b-en').style.width=P.energy+'%';
  $('b-hy').style.width=P.hyd+'%';
  $('st-bleed').classList.toggle('on',P.bleed);
  $('st-enc').classList.toggle('on',calcWeight()>weightCap());
  $('st-hungry').classList.toggle('on',P.energy<=25);
  $('st-thirst').classList.toggle('on',P.hyd<=25);
  const t=RAID.time|0;
  $('timer').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  const sw=$('stormwarn');
  if(RAID.storm==='warn'){
    const left=Math.max(0,STORM_HIT-RAID.time)|0;
    sw.style.display='block';
    sw.textContent='⛈ STORM IN '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
  }else if(RAID.storm==='active'){
    sw.style.display='block'; sw.textContent='⛈ PURPLE STORM — EXTRACT NOW';
  }else sw.style.display='none';
  $('stormvig').style.display=RAID.storm==='active'?'block':'none';
  // use channel bar
  const ws=activeWeaponSlot();
  if(P.use) uiUseBar(P.use.label, P.use.t/P.use.dur);
  else if(P.reloadT>0 && ws) uiUseBar('Reloading…', 1-P.reloadT/ITEMS[ws.id].reload);
  else uiUseBar(null,0);
}
function uiUpdateWeapon(){
  const slot=activeWeaponSlot();
  if(!slot){ $('wpnname').textContent='Unarmed'; $('wpnammo').innerHTML='—'; }
  else{
    const d=ITEMS[slot.id];
    $('wpnname').textContent=d.name;
    if(d.type==='gun')
      $('wpnammo').innerHTML=(slot.ammo||0)+' <span class="rsv">/ '+countAmmo(d.ammo)+' '+ITEMS[d.ammo].icon+'</span>';
    else $('wpnammo').innerHTML='🗡';
  }
  const names=[G.save.eq.g1,G.save.eq.g2,G.save.eq.melee].map((s,i)=>{
    const n=s?ITEMS[s.id].name.split(' ')[0]:'—';
    return P&&P.active===i?('<b>['+(i+1)+'] '+n+'</b>'):('['+(i+1)+'] '+n);
  });
  $('wpnslots').innerHTML=names.join(' · ');
}
function uiUseBar(label,frac){
  const el=$('usebar');
  if(!label){ el.style.display='none'; return; }
  el.style.display='block';
  el.querySelector('.ablabel').textContent=label;
  el.querySelector('.abfill').style.width=(frac*100)+'%';
}
function uiExtractBar(label,frac){
  const el=$('extractbar');
  if(!label){ el.style.display='none'; return; }
  el.style.display='block';
  el.querySelector('.ablabel').textContent=label;
  el.querySelector('.abfill').style.width=(frac*100)+'%';
}
function uiPrompt(html){
  const el=$('prompt');
  if(!html){ el.style.display='none'; return; }
  el.style.display='block'; el.innerHTML=html;
}
function uiToast(msg,cls){
  const d=document.createElement('div');
  d.className='toast '+(cls||''); d.innerHTML=msg;
  $('toasts').appendChild(d);
  setTimeout(()=>d.remove(),4000);
  while($('toasts').children.length>6) $('toasts').firstChild.remove();
}
function uiPointerBusy(){ return mouse.overUI || !!DRAG; }

// ---------------------------------------------------------------------------
// panels
// ---------------------------------------------------------------------------
function uiToggleInv(){
  const el=$('invpanel');
  const show=el.style.display!=='block';
  el.style.display=show?'block':'none';
  if(!show && LOOT) uiCloseLoot();
  uiRefreshAll();
}
function uiOpenLoot(c){
  LOOT=c;
  $('lootpanel').style.display='block';
  $('loottitle').textContent=CONT_NAMES[c.type]||'Container';
  $('invpanel').style.display='block';
  uiRefreshAll();
}
function uiCloseLoot(){
  LOOT=null;
  $('lootpanel').style.display='none';
}
const uiLootOpen=()=>!!LOOT && $('lootpanel').style.display==='block';
const uiLootContainer=()=>LOOT;
function uiCloseAllPanels(){
  uiCloseLoot();
  $('invpanel').style.display='none';
}
$('loottake').addEventListener('click',()=>{
  if(!LOOT) return;
  for(let i=0;i<LOOT.items.length;i++){
    const s=LOOT.items[i];
    if(!s) continue;
    LOOT.items[i]=null;
    const left=invAddItem(G.save.inv,s);
    if(left){ LOOT.items[i]=left; uiToast('Backpack full!','bad'); break; }
  }
  sfx('pickup'); uiRefreshAll();
});

// ---------------------------------------------------------------------------
// screens
// ---------------------------------------------------------------------------
function uiShowScreen(name){
  for(const id of ['menu','bunker','death','summary','pause'])
    $(id).classList.toggle('flex', id===name);
  $('hud').style.display = (name===null && G.mode==='raid') ? 'block':'none';
  if(name===null) uiPrompt(null);
}

// ---------------------------------------------------------------------------
// bunker
// ---------------------------------------------------------------------------
let bkTab='stash';
for(const b of document.querySelectorAll('#bktabs button')){
  b.addEventListener('click',()=>{
    bkTab=b.dataset.tab;
    document.querySelectorAll('#bktabs button').forEach(x=>x.classList.toggle('on',x===b));
    renderBunker();
  });
}
function countItem(id){
  let n=0;
  for(const arr of [G.save.inv,G.save.stash])
    for(const s of arr) if(s&&s.id===id) n+=s.q;
  return n;
}
function consumeItem(id,want){
  let need=want;
  for(const arr of [G.save.stash,G.save.inv]){
    for(let i=0;i<arr.length&&need>0;i++){
      const s=arr[i];
      if(s&&s.id===id){ const t=Math.min(s.q,need); s.q-=t; need-=t; if(s.q<=0) arr[i]=null; }
    }
  }
  return want-need;
}

function renderBunker(){
  $('bkcash').textContent='$'+G.save.cash;
  renderEqRow($('bk-eqrow'));
  renderDogRow($('bk-doggrid'));
  renderGrid($('bk-invgrid'),'inv',G.save.inv.length);
  $('bk-weightlbl').textContent=weightText();
  const L=$('bkleft');
  if(bkTab==='stash'){
    L.innerHTML='<h3>📦 Stash — '+G.save.stash.length+' slots</h3><div class="stashgrid" id="bk-stashgrid"></div>'+
      '<div id="bkhint">Click = move between stash & backpack · Drag for precise placement · Right-click = equip</div>';
    renderGrid($('bk-stashgrid'),'stash',G.save.stash.length);
  }
  else if(bkTab==='trader'){
    let h='<h3>🦆 Boris the Trader</h3>';
    for(let i=0;i<TRADER_STOCK.length;i++){
      const st=TRADER_STOCK[i], d=ITEMS[st.id];
      h+='<div class="shoprow"><span class="ico">'+d.icon+'</span><span class="pn">'+d.name+
         (st.q>1?' ×'+st.q:'')+'</span><span class="pr">$'+st.price+'</span>'+
         '<button class="small" data-buy="'+i+'"'+(G.save.cash<st.price?' disabled':'')+'>Buy</button></div>';
    }
    h+='<div id="bkhint">Selling: click any item in your <b>backpack / equipment</b> on the right to sell it instantly.</div>';
    L.innerHTML=h;
    L.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>buyStock(+b.dataset.buy)));
  }
  else if(bkTab==='sewer'){
    const n=countItem('feather');
    L.innerHTML='<div id="sewerbox"><div class="circle">🕯️</div>'+
      '<h3>The Chalk Circle</h3>'+
      '<p>Beneath the bunker, something listens.<br>Sacrifice <b>'+GACHA_COST+' Fading Feathers</b> for a random Totem.<br>'+
      'You hold <span id="feathercount">'+n+'</span> feathers.</p>'+
      '<button class="primary" id="btn-gacha"'+(n<GACHA_COST?' disabled':'')+'>Sacrifice '+GACHA_COST+' 🪶</button>'+
      '<div id="gacharesult"></div></div>';
    $('btn-gacha').addEventListener('click',doGacha);
  }
  else if(bkTab==='upgrades'){
    let h='<h3>🔧 Base Expansion</h3>';
    for(const k in UPGRADE_DEFS){
      const u=UPGRADE_DEFS[k], owned=G.save.upgrades[k];
      let cost='$'+u.cash;
      for(const m in u.mats) cost+=' + '+u.mats[m]+'× '+ITEMS[m].name;
      let can=G.save.cash>=u.cash;
      for(const m in u.mats) if(countItem(m)<u.mats[m]) can=false;
      h+='<div class="upcard"><h4>'+u.icon+' '+u.name+'</h4><p>'+u.desc+'</p>'+
        (owned?'<div class="cost" style="color:var(--stam)">✔ BUILT</div>'
              :'<div class="cost">'+cost+'</div><button class="small" data-up="'+k+'"'+(can?'':' disabled')+'>Build</button>')+
        '</div>';
    }
    h+='<div id="bkhint">Scrap Metal and Copper Wires are found in raids — crates & duck pockets.</div>';
    L.innerHTML=h;
    L.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>buyUpgrade(b.dataset.up)));
  }
}
function buyStock(i){
  const st=TRADER_STOCK[i], d=ITEMS[st.id];
  if(G.save.cash<st.price){ uiToast('Not enough cash.','bad'); return; }
  const slot={id:st.id,q:st.q};
  if(d.type==='gun'){ slot.q=1; slot.ammo=0; slot.att={}; }
  const left=invAddItem(G.save.inv,slot)&&invAddItem(G.save.stash,slot);
  if(left){ uiToast('No room anywhere!','bad'); return; }
  G.save.cash-=st.price;
  sfx('buy'); saveGame(); renderBunker();
}
function doGacha(){
  if(countItem('feather')<GACHA_COST) return;
  consumeItem('feather',GACHA_COST);
  const id=rweighted(Math.random,GACHA)[0];
  let left=invAddItem(G.save.stash,{id,q:1});
  if(left) left=invAddItem(G.save.inv,left);
  sfx('gacha'); saveGame();
  renderBunker(); // refresh feather count & button state
  const g=$('gacharesult');
  if(g) g.textContent='The circle hums… you receive '+ITEMS[id].icon+' '+ITEMS[id].name+'!'+
    (left?' …but you had no room. It rolls into the dark.':'');
}
function buyUpgrade(k){
  const u=UPGRADE_DEFS[k];
  if(G.save.upgrades[k]) return;
  if(G.save.cash<u.cash) return;
  for(const m in u.mats) if(countItem(m)<u.mats[m]) return;
  G.save.cash-=u.cash;
  for(const m in u.mats) consumeItem(m,u.mats[m]);
  G.save.upgrades[k]=true;
  if(k==='stash2') for(let i=0;i<32;i++) G.save.stash.push(null);
  if(k==='dog3'){ G.save.dogSlots=3; while(G.save.dog.length<3) G.save.dog.push(null); }
  sfx('gacha'); uiToast(u.name+' built!','good');
  saveGame(); renderBunker();
}

// death / summary ------------------------------------------------------------
function uiShowDeath(cause,lost,hadOldCorpse){
  uiShowScreen('death');
  $('deathdetail').innerHTML=
    'Killed by <b>'+cause+'</b>.<br>'+
    (lost>0 ? 'Your gear (<b>'+lost+' items</b>) was dropped where you fell — marked <b style="color:var(--accent)">✕</b> on the minimap next raid.<br>You get <b>one</b> recovery run. Die again and it\'s gone forever.'
            : 'You carried nothing of note.')+
    (hadOldCorpse?'<br><br><span style="color:var(--hp)">Your previous corpse stash was lost to the ducks.</span>':'')+
    '<br><br>🐕 Dog pouch items came home safely.';
}
function uiShowSummary(zone,kills,time,items,value){
  uiShowScreen('summary');
  const t=time|0;
  $('sumdetail').innerHTML=
    'Extracted via <b>'+zone+'</b> in <b>'+Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+'</b>.<br>'+
    'Ducks neutralized: <b>'+kills+'</b><br>'+
    'Backpack: <b>'+items+' items</b> (est. value <b style="color:var(--energy)">$'+value+'</b>)<br>'+
    'Sell junk to Boris, stash the keepers, expand the bunker.';
}
