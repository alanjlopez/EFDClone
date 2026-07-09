// ============================================================================
// ui.js — DOM UI: HUD, inventory grids + drag & drop, loot panel, base
//         station panels (stash/trader/benches), tooltips, screens
// ============================================================================
'use strict';

const $=id=>document.getElementById(id);

// ---------------------------------------------------------------------------
// slot access layer — every grid slot is addressed by (key, index)
// ---------------------------------------------------------------------------
let LOOT=null;     // currently open loot container (raid)
let STATION=null;  // currently open base station object {type,...}
function uiGetSlot(key,i){
  if(key.startsWith('eq:')) return G.save.eq[key.slice(3)];
  if(key==='loot') return LOOT?LOOT.items[i]:null;
  if(key==='inv') return G.save.inv[i];
  if(key==='stash') return G.save.stash[i];
  if(key==='pouch') return G.save.pouch[i];
  return null;
}
function uiSetSlot(key,i,s){
  if(key.startsWith('eq:')){ G.save.eq[key.slice(3)]=s; return; }
  if(key==='loot'){ if(LOOT) LOOT.items[i]=s; return; }
  if(key==='inv') G.save.inv[i]=s;
  else if(key==='stash') G.save.stash[i]=s;
  else if(key==='pouch') G.save.pouch[i]=s;
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
  if(key==='pouch') return G.save.pouch;
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
  // trader open in base: clicking your own items sells them
  if(G.mode==='base' && STATION && STATION.type==='trader' &&
     (key==='inv'||key.startsWith('eq:')||key==='pouch')){
    sellSlot(key,i); return;
  }
  let target=null;
  if(G.mode==='raid'){
    if(key==='loot'){ startLoot(i,null,null); return; } // taking items takes time
    else if(LOOT && key==='inv') target='loot';
  }else if(G.mode==='base' && STATION && STATION.type==='stash'){
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
  if(d.use){ startUse(key,i,s); return; }
}

function sellSlot(key,i){
  const s=uiGetSlot(key,i); if(!s) return;
  const d=ITEMS[s.id];
  if(d.inf){ uiToast('Boris squints. "That junk pistol? Keep it."','bad'); return; }
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
function renderPouchRow(el){
  let h='';
  for(let i=0;i<G.save.pouchSlots;i++) h+=slotHtml('pouch',i,'safeslot');
  el.innerHTML=h;
}
function weightText(){
  const w=calcWeight(), cap=weightCap();
  return 'Weight: '+w.toFixed(1)+' / '+cap.toFixed(0)+' kg'+(w>cap?'  — ENCUMBERED':'')+
         '   ·   💵 $'+G.save.cash;
}

function uiRefreshAll(){
  if($('invpanel').style.display==='block'){
    renderEqRow($('eqrow'));
    renderPouchRow($('pouchgrid'));
    renderGrid($('invgrid'),'inv',G.save.inv.length);
    const wl=$('weightlbl'); wl.textContent=weightText();
    wl.className=calcWeight()>weightCap()?'over':'';
  }
  if(LOOT && $('lootpanel').style.display==='block')
    renderGrid($('lootgrid'),'loot',LOOT.items.length);
  if(STATION && $('stationpanel').style.display==='block')
    renderStationContent();
  uiUpdateWeapon();
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
    // pulling out of a raid container channels; everything else is instant
    if(G.mode==='raid' && drag.key==='loot' && slot.dataset.key!=='loot')
      startLoot(drag.i, slot.dataset.key, +slot.dataset.i);
    else
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
       ' · MAG '+(s.ammo||0)+'/'+d.mag+'</div><div class="tstat">Ammo: '+
       (d.inf?'∞ self-forging':ITEMS[d.ammo].name)+(d.auto?' · AUTO':'')+'</div>';
    if(d.slots && d.slots.length) h+='<div class="tstat">Mod slots: '+d.slots.join(', ')+'</div>';
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
  $('st-enc').classList.toggle('on',!RAID.isBase && calcWeight()>weightCap());
  $('st-hungry').classList.toggle('on',!RAID.isBase && P.energy<=25);
  $('st-thirst').classList.toggle('on',!RAID.isBase && P.hyd<=25);
  // raid-only widgets
  $('timerbox').style.display=RAID.isBase?'none':'block';
  $('basehint').style.display=RAID.isBase?'block':'none';
  const awEl=$('awareness');
  if(RAID.isBase){ awEl.style.display='none'; }
  else{
    awEl.style.display='block';
    const aw=RAID.awareness;
    awEl.className='aw-'+aw;
    awEl.textContent = aw==='spotted' ? '👁 SPOTTED' : aw==='search' ? '❓ SEARCHING…' : '🌿 HIDDEN';
  }
  const zl=$('zonelabel');
  if(!RAID.isBase && RAID.curZone){
    zl.style.display='block';
    zl.textContent=RAID.curZone.def.name.toUpperCase()+' · TIER '+RAID.curZone.def.tier;
    zl.className='ztier'+RAID.curZone.def.tier;
  }else zl.style.display='none';
  const wl=$('weatherlabel');
  const wfx=RAID.isBase?null:WEATHER_FX[RAID.weather];
  if(wfx && wfx.label){ wl.style.display='block'; wl.textContent=wfx.label; }
  else wl.style.display='none';
  if(!RAID.isBase){
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
  }
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
      $('wpnammo').innerHTML=(slot.ammo||0)+' <span class="rsv">/ '+
        (d.inf?'∞':countAmmo(d.ammo)+' '+ITEMS[d.ammo].icon)+'</span>';
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
  if(!show){ if(LOOT) uiCloseLoot(); if(STATION) uiCloseStation(); }
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
  cancelLoot(); // walking away mid-grab drops the channel
  LOOT=null;
  $('lootpanel').style.display='none';
}
const uiLootOpen=()=>!!LOOT && $('lootpanel').style.display==='block';
const uiLootContainer=()=>LOOT;
function uiCloseAllPanels(){
  uiCloseLoot();
  uiCloseStation();
  $('invpanel').style.display='none';
}
$('loottake').addEventListener('click',()=>{
  if(!LOOT || P.use) return;
  // loots one item at a time, each with its own channel
  LOOTALL=true;
  for(let i=0;i<LOOT.items.length;i++)
    if(LOOT.items[i]){ startLoot(i,null,null); return; }
  LOOTALL=false;
});

// ---------------------------------------------------------------------------
// base stations
// ---------------------------------------------------------------------------
function uiOpenStation(st){
  STATION=st;
  $('stationpanel').style.display='block';
  $('invpanel').style.display='block';
  uiRefreshAll();
}
function uiCloseStation(){
  STATION=null;
  $('stationpanel').style.display='none';
}
const uiStationOpen=()=>!!STATION && $('stationpanel').style.display==='block';
const uiStationObj=()=>STATION;

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

function renderStationContent(){
  const L=$('stationcontent');
  const type=STATION.type;
  const bench=BENCH_DEFS[type];
  $('stationtitle').textContent =
    type==='stash' ? '📦 Stash — '+G.save.stash.length+' slots' :
    type==='trader' ? '🧔 Boris the Trader — 💵 $'+G.save.cash :
    bench ? bench.icon+' '+bench.name : '🔧 General Workbench';
  if(type==='stash'){
    L.innerHTML='<div class="stashgrid" id="st-stashgrid"></div>'+
      '<div class="panelhint">Click = move between stash & backpack · Drag for precise placement · Right-click = equip</div>';
    renderGrid($('st-stashgrid'),'stash',G.save.stash.length);
  }
  else if(type==='trader'){
    let h='';
    for(let i=0;i<TRADER_STOCK.length;i++){
      const st=TRADER_STOCK[i], d=ITEMS[st.id];
      h+='<div class="shoprow"><span class="ico">'+d.icon+'</span><span class="pn">'+d.name+
         (st.q>1?' ×'+st.q:'')+'</span><span class="pr">$'+st.price+'</span>'+
         '<button class="small" data-buy="'+i+'"'+(G.save.cash<st.price?' disabled':'')+'>Buy</button></div>';
    }
    h+='<div class="panelhint">Selling: click any item in your <b>backpack / equipment</b> to sell it instantly.</div>';
    L.innerHTML=h;
    L.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>buyStock(+b.dataset.buy)));
  }
  else if(bench){
    // placeholder bench — walkable, inspectable, not yet operational
    let h='<div class="benchbox"><div class="benchicon">'+bench.icon+'</div>'+
      '<div class="benchtag">🚧 UNDER CONSTRUCTION</div>'+
      '<p>Planned services:</p><ul>';
    for(const p of bench.planned) h+='<li>'+p+'</li>';
    h+='</ul><p class="benchwants">Will want: '+bench.wants+'</p>'+
      '<button class="small" disabled>Build (coming soon)</button>'+
      '<div class="panelhint">Stockpile 🪵 Timber and 🪨 Stone — melee-swing trees and rocks out in the field.</div></div>';
    L.innerHTML=h;
  }
  else if(type==='upgrade'){
    let h='';
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
    h+='<div class="panelhint">Scrap Metal and Copper Wires are found in raids — crates & zombie pockets.</div>';
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
  sfx('buy'); saveGame(); uiRefreshAll();
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
  if(k==='pouch3'){ G.save.pouchSlots=3; while(G.save.pouch.length<3) G.save.pouch.push(null); }
  sfx('gacha'); uiToast(u.name+' built!','good');
  saveGame(); uiRefreshAll();
}

// ---------------------------------------------------------------------------
// screens
// ---------------------------------------------------------------------------
function uiShowScreen(name){
  for(const id of ['menu','death','summary','pause'])
    $(id).classList.toggle('flex', id===name);
  $('hud').style.display = (name===null && (G.mode==='raid'||G.mode==='base')) ? 'block':'none';
  if(name===null) uiPrompt(null);
}

// death / summary ------------------------------------------------------------
function uiShowDeath(cause,lost,hadOldCorpse){
  uiShowScreen('death');
  $('deathdetail').innerHTML=
    'Killed by <b>'+cause+'</b>.<br>'+
    (lost>0 ? 'Your gear (<b>'+lost+' items</b>) was dropped where you fell — marked <b style="color:var(--accent)">✕</b> on the minimap next raid.<br>You get <b>one</b> recovery run. Die again and it\'s gone forever.'
            : 'You carried nothing of note.')+
    (hadOldCorpse?'<br><br><span style="color:var(--hp)">Your previous corpse stash was lost to the horde.</span>':'')+
    '<br><br>🔒 Secure pouch items and your ⚙️ Rust Pistol stay with you.';
}
function uiShowSummary(zone,kills,time,items,value){
  uiShowScreen('summary');
  const t=time|0;
  $('sumdetail').innerHTML=
    'Extracted via <b>'+zone+'</b> in <b>'+Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+'</b>.<br>'+
    'Zombies put down: <b>'+kills+'</b><br>'+
    'Backpack: <b>'+items+' items</b> (est. value <b style="color:var(--energy)">$'+value+'</b>)<br>'+
    'Sell junk to Boris, stash the keepers, expand the bunker.';
}
