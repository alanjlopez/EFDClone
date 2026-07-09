// ============================================================================
// game.js — simulation for raids AND the walkable home base: player, zombies,
//           bullets, vision cone fog of war, survival meters, extraction,
//           storm, stations, rendering, synth sfx
// ============================================================================
'use strict';

const cvs = document.getElementById('cv');
const ctx = cvs.getContext('2d');
const mmCv = document.getElementById('mm');
const mmCtx = mmCv.getContext('2d');

// tuning ---------------------------------------------------------------------
const FOV_DEG = 110, VIS_RANGE = 480, NEAR_VIS = 150;
const STORM_WARN = 420, STORM_HIT = 570, STORM_DPS = 8; // longer raids on the big map
const BASE_WEIGHT_CAP = 40;
const PLAYER_R = 13;

let RAID = null;   // live area state (raid or base — base sets .isBase)
let P = null;      // player
const cam = {x:0, y:0, shk:0};
let fogCv=null, fogCtx=null;

// ============================================================================
// sound — tiny WebAudio synth
// ============================================================================
let AC=null, sndMuted=false;
function audio(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(freq,dur,type,vol,slideTo){
  const a=audio(); if(!a||sndMuted) return;
  const o=a.createOscillator(), g=a.createGain();
  o.type=type||'square'; o.frequency.value=freq;
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), a.currentTime+dur);
  g.gain.value=vol||0.12; g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+dur);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime+dur);
}
function noiseHit(dur,vol,freq){
  const a=audio(); if(!a||sndMuted) return;
  const n=Math.floor(a.sampleRate*dur), buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const src=a.createBufferSource(); src.buffer=buf;
  const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq||1200;
  const g=a.createGain(); g.gain.value=vol||0.2;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
function sfx(name){
  switch(name){
    case 'shot':     noiseHit(0.14,0.28,2400); tone(160,0.08,'square',0.10,60); break;
    case 'shotS':    noiseHit(0.08,0.10,900); break;
    case 'boom':     noiseHit(0.30,0.38,900); tone(90,0.2,'square',0.14,40); break;
    case 'rifle':    noiseHit(0.22,0.34,1600); tone(120,0.15,'square',0.12,50); break;
    case 'click':    tone(900,0.03,'square',0.08); break;
    case 'reload':   tone(500,0.05,'square',0.09); setTimeout(()=>tone(700,0.05,'square',0.09),140); break;
    case 'melee':    noiseHit(0.09,0.12,600); break;
    case 'hit':      noiseHit(0.06,0.18,500); break;
    case 'groan':    tone(150,0.28,'sawtooth',0.11,75); break;
    case 'groandie': tone(170,0.5,'sawtooth',0.13,45); noiseHit(0.2,0.08,300); break;
    case 'growl':    tone(110,0.3,'sawtooth',0.15,260); break;
    case 'spit':     noiseHit(0.1,0.14,500); tone(300,0.12,'sawtooth',0.09,140); break;
    case 'hurt':     tone(200,0.15,'sawtooth',0.14,90); break;
    case 'pickup':   tone(660,0.06,'sine',0.12,880); break;
    case 'eat':      noiseHit(0.1,0.1,400); setTimeout(()=>noiseHit(0.1,0.1,400),160); break;
    case 'heal':     tone(520,0.12,'sine',0.10,780); break;
    case 'extract':  tone(520,0.1,'sine',0.12); setTimeout(()=>tone(660,0.1,'sine',0.12),120);
                     setTimeout(()=>tone(880,0.18,'sine',0.12),240); break;
    case 'storm':    tone(60,1.2,'sawtooth',0.16,35); noiseHit(1.0,0.12,220); break;
    case 'gacha':    tone(300,0.1,'sine',0.12,600); setTimeout(()=>tone(600,0.25,'sine',0.14,1200),150); break;
    case 'buy':      tone(760,0.07,'sine',0.1); setTimeout(()=>tone(950,0.07,'sine',0.1),90); break;
    case 'siren':    tone(Math.floor(performance.now()/900)%2?780:590,0.35,'triangle',0.11); break;
    case 'chop':     noiseHit(0.08,0.22,900); tone(170,0.05,'square',0.08); break;
    case 'mine':     noiseHit(0.05,0.16,2400); tone(1100,0.04,'square',0.06); break;
    case 'break':    noiseHit(0.22,0.26,700); tone(120,0.12,'square',0.09,60); break;
  }
}

// ============================================================================
// helpers
// ============================================================================
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const angDiff=(a,b)=>{ let d=(b-a)%(Math.PI*2); if(d>Math.PI)d-=Math.PI*2; if(d<-Math.PI)d+=Math.PI*2; return d; };
const dist2=(x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1;return dx*dx+dy*dy;};

function totemEff(key, def){
  let v = def;
  for(const t of [G.save.eq.t1, G.save.eq.t2]){
    if(!t) continue;
    const e = ITEMS[t.id].eff;
    if(e && e[key]!==undefined) v = (key==='killHeal') ? v + e[key] : v * e[key];
  }
  return v;
}
function calcWeight(){
  let w=0;
  const add=s=>{ if(s) w += (ITEMS[s.id].w||0)*(s.q||1); };
  for(const s of G.save.inv) add(s);
  add(G.save.eq.g1); add(G.save.eq.g2); add(G.save.eq.melee);
  return w; // secure pouch is a weightless sink by design
}
const weightCap=()=> totemEff('weightMul', BASE_WEIGHT_CAP);
function countAmmo(ammoId){
  let n=0;
  for(const s of G.save.inv) if(s && s.id===ammoId) n+=s.q;
  return n;
}
function takeAmmo(ammoId, want){
  let got=0;
  for(let i=0;i<G.save.inv.length && got<want;i++){
    const s=G.save.inv[i];
    if(s && s.id===ammoId){
      const take=Math.min(s.q, want-got); s.q-=take; got+=take;
      if(s.q<=0) G.save.inv[i]=null;
    }
  }
  return got;
}
// add a slot-object into an array inventory; returns leftover slot or null
function invAddItem(arr, slot){
  const d=ITEMS[slot.id];
  if(d.stack>1){
    for(const s of arr){
      if(s && s.id===slot.id && s.q<d.stack){
        const take=Math.min(d.stack-s.q, slot.q); s.q+=take; slot.q-=take;
        if(slot.q<=0) return null;
      }
    }
  }
  for(let i=0;i<arr.length;i++){
    if(!arr[i]){ arr[i]=slot; return null; }
  }
  return slot;
}
function gunStats(slot){
  const d=ITEMS[slot.id];
  let spread=d.spread, recoil=d.recoil, noise=d.noise;
  if(slot.att) for(const k in slot.att){
    const m=ITEMS[slot.att[k]].mods||{};
    if(m.spreadMul) spread*=m.spreadMul;
    if(m.recoilMul) recoil*=m.recoilMul;
    if(m.noiseMul)  noise *=m.noiseMul;
  }
  return {def:d, spread, recoil, noise, silenced: !!(slot.att&&slot.att.muzzle)};
}
function activeWeaponSlot(){
  if(!P) return null;
  if(P.active===0) return G.save.eq.g1;
  if(P.active===1) return G.save.eq.g2;
  return G.save.eq.melee;
}

// ============================================================================
// area setup
// ============================================================================
function makePlayer(spawn){
  return {
    x:spawn.x, y:spawn.y, r:PLAYER_R,
    aim:-Math.PI/2, hp:100, maxhp:100, stam:100, energy:100, hyd:100,
    bleed:false, active: G.save.eq.g1?0:(G.save.eq.g2?1:2),
    fireCd:0, reloadT:0, switchT:0, heat:0, swingT:0, swingAnim:0, use:null,
    hurtT:0, stamDelay:0, walkPhase:0, moving:false, dead:false, speedNow:0,
  };
}
function centerCam(){
  cam.x=P.x-cvs.width/2; cam.y=P.y-cvs.height/2; cam.shk=0;
}

function startRaidState(){
  const world = genWorld((Math.random()*1e9)|0); // fresh map every run
  RAID = {
    world, isBase:false,
    terrain: createTerrain(world),
    mmTerrain: prerenderMinimap(world),
    enemies: [], bullets: [], parts: [], noises: [], pings: [],
    containers: world.containers,
    time: 0, storm: 'none', awareness:'hidden', curZone:null,
    weather: rweighted(Math.random, WEATHERS)[0],
    extractZone: null, extractT: 0, alarmT: 0,
    nodeHp: new Map(), // damaged-but-standing resource nodes
    kills: 0, over: false,
  };
  for(const s of world.enemySpawns){
    const def = ENEMY_DEFS[s.type];
    const hp = Math.round(def.hp*(s.hpMul||1)); // deep zones breed harder zombies
    RAID.enemies.push({
      type:s.type, def, x:s.x, y:s.y, r:def.r, hp, maxhp:hp, dmgMul:s.dmgMul||1,
      dir:Math.random()*7, state:'patrol', stateT:Math.random()*3,
      home:{x:s.x,y:s.y}, tgt:null, lastSeen:null, noLosT:0,
      fireCd:0, burstLeft:(def.atk.burst||1), pauseT:0, strafeDir:1, strafeT:0,
      stuckT:0, avoidA:0, hurtT:0,
    });
  }
  // previous-death corpse run — the world regenerated, so re-home the corpse
  // to the nearest walkable spot at the same coordinates
  if(G.save.corpse){
    const p=snapToWalkable(world, G.save.corpse.x, G.save.corpse.y);
    G.save.corpse.x=Math.round(p.x); G.save.corpse.y=Math.round(p.y);
    RAID.containers.push({type:'pcorpse', x:p.x, y:p.y,
                          items:G.save.corpse.items, opened:false});
  }
  P = makePlayer(world.playerSpawn);
  centerCam();
  G.save.stats.raids++;
  uiToast('Deployed. New ground every run — deeper zones, harder zombies, better materials.', '');
  uiToast('⛈ Purple storm forecast: '+Math.floor(STORM_HIT/60)+':'+
          String(STORM_HIT%60).padStart(2,'0')+'.', 'bad');
  const wfx=WEATHER_FX[RAID.weather];
  if(wfx.toast) uiToast(wfx.toast, '');
}

function startBaseState(){
  const world = genBaseWorld();
  RAID = {
    world, isBase:true,
    terrain: createTerrain(world), mmTerrain:null,
    enemies: [], bullets: [], parts: [], noises: [], pings: [],
    containers: [],
    time: 0, storm:'none', awareness:'hidden',
    extractZone:null, extractT:0, kills:0, over:false,
  };
  P = makePlayer(world.playerSpawn);
  centerCam();
}

function addNoise(x,y,r,owner){
  if(!RAID.isBase) r*=WEATHER_FX[RAID.weather].noise; // rain muffles everything
  RAID.noises.push({x,y,r,owner});
}

// ============================================================================
// update
// ============================================================================
function updateRaid(dt){
  if(!RAID || RAID.over) return;
  RAID.time += dt;
  if(!RAID.isBase){
    updateStorm(dt);
    const z=zoneAt(RAID.world,P.x,P.y);
    if(z && z!==RAID.curZone){
      RAID.curZone=z;
      uiToast('Entering <b>'+z.def.name+'</b> — Tier '+z.def.tier, z.def.tier>=3?'bad':'');
    }
  }
  updatePlayer(dt);
  // extraction runs before the AI so its alarm noise is heard this same frame
  if(!RAID.isBase) updateExtraction(dt);
  for(const e of RAID.enemies) updateEnemy(e, dt);
  RAID.enemies = RAID.enemies.filter(e=>e.hp>0);
  updateBullets(dt);
  updateParticles(dt);
  for(const p of RAID.pings) p.t+=dt;
  RAID.pings = RAID.pings.filter(p=>p.t<2 && p.e.hp>0);
  updateAwareness();
  RAID.noises.length = 0;
  cam.shk = Math.max(0, cam.shk - dt*18);
  // camera follows with slight aim lean
  const tx = P.x - cvs.width/2 + (mouse.x - cvs.width/2)*0.12;
  const ty = P.y - cvs.height/2 + (mouse.y - cvs.height/2)*0.12;
  cam.x = lerp(cam.x, tx, Math.min(1, dt*7));
  cam.y = lerp(cam.y, ty, Math.min(1, dt*7));
  uiUpdateHUD();
}

// how aware is the horde of you, overall?
function updateAwareness(){
  let aw='hidden';
  for(const e of RAID.enemies){
    if(e.state==='combat'){
      if(e.noLosT<5){ aw='spotted'; break; }
      aw='search';
    }else if(e.state==='investigate' && aw==='hidden') aw='search';
  }
  RAID.awareness=aw;
}

function updateStorm(dt){
  if(RAID.storm==='none' && RAID.time>=STORM_WARN){
    RAID.storm='warn'; sfx('storm');
    uiToast('⛈ PURPLE STORM approaching — extract within '+Math.round((STORM_HIT-STORM_WARN)/60*10)/10+' min!', 'bad');
  }
  if(RAID.storm==='warn' && RAID.time>=STORM_HIT){
    RAID.storm='active'; sfx('storm');
    uiToast('⛈ THE STORM IS HERE. Radiation everywhere — RUN.', 'bad');
  }
  if(RAID.storm==='active'){
    damagePlayer(STORM_DPS*dt, 'the Purple Storm', true);
    if(Math.random()<dt*8) spawnPart(P.x+(Math.random()-0.5)*900, P.y+(Math.random()-0.5)*600,
      (Math.random()-0.5)*40, 120+Math.random()*160, 1.2, '#a45de0', 2.5);
  }
}

function playerSpeed(){
  let sp = 150 * totemEff('speedMul',1);
  const sprinting = keys['shift'] && P.stam>0.5 && P.moving && !P.use;
  if(sprinting) sp *= 1.55;
  if(!RAID.isBase){
    if(P.hyd<=25) sp *= 0.85;
    if(calcWeight()>weightCap()) sp *= 0.62;
  }
  if(P.use) sp *= 0.6;
  return {sp, sprinting};
}

function updatePlayer(dt){
  if(P.dead) return;
  const inBase=RAID.isBase;
  // aim
  P.aim = Math.atan2(mouse.y + cam.y - P.y, mouse.x + cam.x - P.x);
  // movement
  let mx=0,my=0;
  if(keys['w'])my--; if(keys['s'])my++; if(keys['a'])mx--; if(keys['d'])mx++;
  const mlen=Math.hypot(mx,my);
  P.moving = mlen>0;
  const {sp, sprinting} = playerSpeed();
  P.speedNow = sp;
  if(P.moving){
    mx/=mlen; my/=mlen;
    const np = collideCircle(RAID.world, P.x+mx*sp*dt, P.y+my*sp*dt, P.r);
    P.x=np.x; P.y=np.y;
    P.walkPhase += dt*(sprinting?14:9);
  }
  // stamina
  if(sprinting){ P.stam=Math.max(0,P.stam-16*dt); P.stamDelay=0.8; }
  else{
    P.stamDelay=Math.max(0,P.stamDelay-dt);
    if(P.stamDelay<=0){
      let regen=13; if(!inBase && P.energy<=25) regen*=0.5;
      P.stam=Math.min(100,P.stam+regen*dt);
    }
  }
  // survival meters tick only out in the field
  if(!inBase){
    P.energy = Math.max(0, P.energy - (0.14 + (sprinting?0.10:0))*dt);
    P.hyd    = Math.max(0, P.hyd    - (0.18 + (sprinting?0.14:0))*dt);
    if(P.energy<=0) damagePlayer(0.6*dt, 'starvation', true);
    if(P.hyd<=0)    damagePlayer(1.0*dt, 'dehydration', true);
    if(P.bleed)     damagePlayer(1.5*dt, 'bleeding out', true);
    if(calcWeight()>weightCap() && P.moving) P.stam=Math.max(0,P.stam-5*dt);
  }
  // timers
  P.fireCd=Math.max(0,P.fireCd-dt);
  P.switchT=Math.max(0,P.switchT-dt);
  P.swingT=Math.max(0,P.swingT-dt);
  P.swingAnim=Math.max(0,P.swingAnim-dt);
  P.hurtT=Math.max(0,P.hurtT-dt);
  P.heat=Math.max(0,P.heat-dt*7);
  // reload
  if(P.reloadT>0){
    P.reloadT-=dt;
    if(P.reloadT<=0){
      const slot=activeWeaponSlot();
      if(slot && ITEMS[slot.id].type==='gun'){
        const d=ITEMS[slot.id];
        if(d.inf) slot.ammo=d.mag;
        else slot.ammo=(slot.ammo||0)+takeAmmo(d.ammo, d.mag-(slot.ammo||0));
        sfx('reload'); uiRefreshAll();
      }
    }
  }
  // item use channel
  if(P.use){
    P.use.t+=dt;
    if(P.use.t>=P.use.dur){ finishUse(); }
  }
  // fire input (clickedFresh buffers taps shorter than one frame)
  if(inBase) mouse.clickedFresh=false; // safe zone
  else if((mouse.down || mouse.clickedFresh) && !uiPointerBusy()) tryAttack();
  // interact scanning
  updateInteract();
}

function tryAttack(){
  if(P.dead || P.use || P.switchT>0 || P.reloadT>0) return;
  const slot=activeWeaponSlot();
  if(!slot){ if(mouse.clickedFresh){ sfx('click'); } mouse.clickedFresh=false; return; }
  const d=ITEMS[slot.id];
  if(d.type==='melee'){
    if(P.swingT<=0 && P.stam>=d.stam){
      P.swingT = 1/d.rate; P.swingAnim = 0.22;
      P.stam-=d.stam;
      sfx('melee');
      let hitAny=false;
      for(const e of RAID.enemies){
        const dd=Math.hypot(e.x-P.x,e.y-P.y);
        // anything actually touching you gets hit regardless of swing arc
        const pointBlank = dd < e.r+P.r+6;
        if(dd < d.mrange+e.r &&
           (pointBlank || Math.abs(angDiff(P.aim, Math.atan2(e.y-P.y,e.x-P.x))) < d.arc*Math.PI/360)){
          damageEnemy(e, d.dmg, true);
          const kb=90/Math.max(1,dd);
          e.x+=(e.x-P.x)*kb*0.4; e.y+=(e.y-P.y)*kb*0.4;
          hitAny=true;
        }
      }
      if(hitAny) sfx('hit');
      else chopNode(d); // no zombie in the way? maybe a tree/rock/crate pile
      addNoise(P.x,P.y,120,'player');
    }
    mouse.clickedFresh=false;
    return;
  }
  // gun
  if(!d.auto && !mouse.clickedFresh) return;
  if(P.fireCd>0) return;
  if((slot.ammo||0)<=0){
    if(mouse.clickedFresh){ sfx('click'); startReload(); }
    mouse.clickedFresh=false;
    return;
  }
  mouse.clickedFresh=false;
  const gs=gunStats(slot);
  slot.ammo--;
  P.fireCd=60/d.rpm;
  P.heat=Math.min(9, P.heat+gs.recoil);
  const moveAdd = P.moving ? (P.speedNow/230)*3 : 0;
  let spreadDeg = gs.spread + P.heat + moveAdd;
  if(P.hyd<=25) spreadDeg*=1.4;
  const pellets=d.pellets||1;
  // bullets spawn at the body, not the muzzle — point-blank shots must connect
  const mx=P.x+Math.cos(P.aim)*6, my=P.y+Math.sin(P.aim)*6;
  for(let i=0;i<pellets;i++){
    const a=P.aim+(Math.random()-0.5)*spreadDeg*Math.PI/180;
    RAID.bullets.push({x:mx,y:my,vx:Math.cos(a)*d.vel,vy:Math.sin(a)*d.vel,
                       dmg:d.dmg,owner:'p',dist:0,maxRange:d.range,px:mx,py:my});
  }
  spawnPart(P.x+Math.cos(P.aim)*22,P.y+Math.sin(P.aim)*22,
            Math.cos(P.aim)*60,Math.sin(P.aim)*60,0.07,'#ffdf91',7,'flash');
  cam.shk=Math.min(7, cam.shk+gs.recoil*1.2);
  addNoise(P.x,P.y,gs.noise,'player');
  sfx(gs.silenced?'shotS':(d.ammo==='ammo_12'?'boom':(d.ammo==='ammo_762'&&!d.auto?'rifle':'shot')));
  uiUpdateWeapon();
}

// -------- resource mining: melee swings fell trees, crack rocks, smash crates
function chopNode(meleeDef){
  if(RAID.isBase) return;
  const world=RAID.world;
  for(const dist of [18,34,50]){
    if(dist>meleeDef.mrange+14) break;
    const tx=Math.floor((P.x+Math.cos(P.aim)*dist)/TILE);
    const ty=Math.floor((P.y+Math.sin(P.aim)*dist)/TILE);
    if(tx<1||ty<1||tx>=world.w-1||ty>=world.h-1) continue;
    const tt=world.t[ty*world.w+tx];
    const nd=NODE_DEFS[tt];
    if(!nd) continue;
    const key=tx+','+ty;
    let hp=RAID.nodeHp.has(key)?RAID.nodeHp.get(key):nd.hp;
    hp-=meleeDef.dmg;
    sfx(nd.sfx);
    const cx=tx*TILE+TILE/2, cy=ty*TILE+TILE/2;
    for(let i=0;i<5;i++)
      spawnPart(cx,cy,(Math.random()-0.5)*180,(Math.random()-0.5)*180,0.5,nd.color,3);
    cam.shk=Math.min(5,cam.shk+1.2);
    if(hp<=0){
      RAID.nodeHp.delete(key);
      world.t[ty*world.w+tx]=T.GRASS;          // fell it
      terrainDirtyTile(RAID.terrain, tx, ty);  // re-render that chunk
      mmPaintTile(tx,ty);                      // keep the minimap honest
      sfx('break');
      for(let i=0;i<10;i++)
        spawnPart(cx,cy,(Math.random()-0.5)*260,(Math.random()-0.5)*260,0.8,nd.color,3.5);
      const drops=[{id:nd.drop[0], q:nd.drop[1]+Math.floor(Math.random()*(nd.drop[2]-nd.drop[1]+1))}];
      if(nd.bonus && Math.random()<nd.bonus[1]) drops.push({id:nd.bonus[0], q:1});
      for(const s of drops){
        const label=s.q+'× '+ITEMS[s.id].icon+' '+ITEMS[s.id].name;
        if(invAddItem(G.save.inv, s)){ gameDropItem(s); uiToast(label+' (backpack full — dropped)','bad'); }
        else uiToast('+'+label,'good');
      }
      sfx('pickup'); uiRefreshAll();
    }else RAID.nodeHp.set(key,hp);
    return; // one node per swing
  }
}
function mmPaintTile(tx,ty){
  if(!RAID.mmTerrain) return;
  const c=RAID.mmTerrain.getContext('2d'), s=168/RAID.world.w;
  const z=zoneAt(RAID.world, tx*TILE, ty*TILE);
  c.fillStyle=z?z.def.grass[0]:'#283a25';
  c.fillRect(tx*s,ty*s,s+0.6,s+0.6);
}

function startReload(){
  const slot=activeWeaponSlot();
  if(!slot) return;
  const d=ITEMS[slot.id];
  if(d.type!=='gun' || P.reloadT>0 || (slot.ammo||0)>=d.mag) return;
  if(!d.inf && countAmmo(d.ammo)<=0){ uiToast('No '+ITEMS[d.ammo].name+' left!', 'bad'); sfx('click'); return; }
  P.reloadT=d.reload; sfx('click');
}

function switchWeapon(idx){
  if(idx===P.active || P.dead) return;
  const tgt=[G.save.eq.g1,G.save.eq.g2,G.save.eq.melee][idx];
  if(!tgt) return;
  P.active=idx; P.switchT=0.35; P.reloadT=0;
  sfx('click'); uiUpdateWeapon();
}

// -------- item use ----------------------------------------------------------
function startUse(key, i, slot){
  if(P.use || P.dead) return;
  if(RAID.isBase){ uiToast('You are rested — no need right now. (Try the bed if not.)',''); return; }
  const d=ITEMS[slot.id];
  if(!d.use) return;
  if(d.type==='med' && !P.bleed && P.hp>=P.maxhp){ uiToast('Already at full health.',''); return; }
  P.use={key, i, id:slot.id, t:0, dur:d.use, label:(d.type==='med'?'Using ':'Consuming ')+d.name};
}
function finishUse(){
  const u=P.use; P.use=null;
  const s=uiGetSlot(u.key,u.i);
  if(!s || s.id!==u.id) return; // moved away mid-use
  const d=ITEMS[s.id];
  if(d.hp) P.hp=Math.min(P.maxhp, P.hp+d.hp);
  if(d.stopBleed && P.bleed){ P.bleed=false; uiToast('Bleeding stopped.','good'); }
  if(d.energy) P.energy=Math.min(100,P.energy+d.energy);
  if(d.hyd) P.hyd=Math.min(100,P.hyd+d.hyd);
  sfx(d.type==='med'?'heal':'eat');
  s.q--; if(s.q<=0) uiSetSlot(u.key,u.i,null);
  uiRefreshAll();
}
function quickBandage(){
  if(P.use||P.dead||RAID.isBase) return;
  for(let i=0;i<G.save.inv.length;i++){
    const s=G.save.inv[i];
    if(s && ITEMS[s.id].type==='med'){ startUse('inv',i,s); return; }
  }
  uiToast('No meds in backpack!','bad');
}

// -------- interaction -------------------------------------------------------
const CONT_NAMES={crate:'Wooden Crate', locker:'Locker', medbox:'Medical Box',
  weaponbox:'Weapon Case', nest:'Golden Nest', zcorpse:'Zombie Corpse',
  pcorpse:'YOUR CORPSE', bag:'Dropped Bag'};
function findInteractable(){
  let best=null, bd=52*52;
  for(const c of RAID.containers){
    const d2=dist2(P.x,P.y,c.x,c.y);
    if(d2<bd && c.items.some(s=>s)){ bd=d2; best=c; }
  }
  return best;
}
function updateInteract(){
  if(RAID.isBase){ updateBaseInteract(); return; }
  const c=findInteractable();
  if(uiLootOpen()){
    const oc=uiLootContainer();
    if(oc && dist2(P.x,P.y,oc.x,oc.y)>80*80) uiCloseLoot();
    uiPrompt(null);
    keys._e=false;
    return;
  }
  uiPrompt(c ? '<b>E</b> — Search '+CONT_NAMES[c.type] : null);
  if(c && keys._e){ keys._e=false; c.opened=true; uiOpenLoot(c); sfx('pickup'); }
  keys._e=false;
}
function updateBaseInteract(){
  if(uiStationOpen()){
    const os=uiStationObj();
    if(os && dist2(P.x,P.y,os.x,os.y)>95*95) uiCloseStation();
    uiPrompt(null);
    keys._e=false;
    return;
  }
  let best=null, bd=62*62;
  for(const st of RAID.world.stations){
    const d2=dist2(P.x,P.y,st.x,st.y);
    if(d2<bd){ bd=d2; best=st; }
  }
  uiPrompt(best ? '<b>E</b> — '+best.label : null);
  if(best && keys._e){
    keys._e=false;
    if(best.type==='exit'){ deploy(); return; }
    if(best.type==='bed'){
      P.hp=P.maxhp; P.stam=100; P.energy=100; P.hyd=100; P.bleed=false;
      sfx('heal'); uiToast('You rest. All vitals restored.','good');
      return;
    }
    uiOpenStation(best); sfx('pickup');
  }
  keys._e=false;
}
function gameDropItem(slot){
  // merge into a nearby dropped bag or make a new one at the player's feet
  let bag=null;
  for(const c of RAID.containers)
    if(c.type==='bag' && dist2(P.x,P.y,c.x,c.y)<40*40){ bag=c; break; }
  if(!bag){
    bag={type:'bag', x:P.x+Math.cos(P.aim)*26, y:P.y+Math.sin(P.aim)*26, items:new Array(8).fill(null), opened:true};
    RAID.containers.push(bag);
  }
  const left=invAddItem(bag.items, slot);
  if(left){ uiToast('Bag is full!','bad'); return left; }
  return null;
}

// -------- extraction --------------------------------------------------------
function updateExtraction(dt){
  let zone=null;
  for(const z of RAID.world.extractions)
    if(dist2(P.x,P.y,z.x,z.y)<z.r*z.r){ zone=z; break; }
  if(zone && !P.dead){
    if(RAID.extractZone!==zone){
      RAID.extractZone=zone; RAID.extractT=0; RAID.alarmT=0;
      sfx('extract');
      uiToast('🚨 Extraction alarm at '+zone.name+' — the horde is coming!','bad');
    }
    RAID.extractT+=dt;
    // the alarm blares — every zombie in earshot converges on you
    RAID.alarmT-=dt;
    if(RAID.alarmT<=0){
      RAID.alarmT=0.9;
      sfx('siren');
      addNoise(P.x,P.y,950,'player');
    }
    uiExtractBar('Extracting — '+zone.name+' 🚨', RAID.extractT/zone.time);
    if(RAID.extractT>=zone.time){ RAID.over=true; handleExtract(zone); }
  }else{
    RAID.extractZone=null; RAID.extractT=0;
    uiExtractBar(null,0);
  }
}

// -------- damage ------------------------------------------------------------
function damagePlayer(dmg, src, env){
  if(!P || P.dead || RAID.over || RAID.isBase) return;
  P.hp-=dmg;
  if(!env){
    P.hurtT=0.35; cam.shk=Math.min(9,cam.shk+3);
    if(dmg>=8 && !P.bleed && Math.random()<0.3){ P.bleed=true; uiToast('🩸 You are bleeding! Use a bandage (F).','bad'); }
    sfx('hurt');
    for(let i=0;i<5;i++) spawnPart(P.x,P.y,(Math.random()-0.5)*160,(Math.random()-0.5)*160,0.5,'#d97757',3);
  }
  if(P.hp<=0){ P.hp=0; P.dead=true; RAID.over=true; handlePlayerDeath(src); }
}
// flips an enemy to combat, with a "spotted" ping if it happened off-screen
function alertEnemy(e){
  if(e.state==='combat') return;
  e.state='combat'; e.noLosT=0;
  sfx('growl');
  spawnPart(e.x,e.y-e.r-8,0,-30,0.8,'#ff5a5a',5,'mark');
  RAID.pings.push({e, t:0});
}
function damageEnemy(e, dmg, fromPlayer){
  if(e.def.armor) dmg*= (1-e.def.armor);
  e.hp-=dmg; e.hurtT=0.25;
  for(let i=0;i<4;i++) spawnPart(e.x,e.y,(Math.random()-0.5)*170,(Math.random()-0.5)*170,0.55,
    Math.random()<0.6?'#8fae56':'#c23b3b',3);
  if(fromPlayer){
    e.lastSeen={x:P.x,y:P.y}; e.noLosT=0;
    alertEnemy(e);
  }
  if(e.hp<=0) killEnemy(e);
  else sfx('groan');
}
function killEnemy(e){
  RAID.kills++; G.save.stats.kills++;
  sfx('groandie');
  P.hp=Math.min(P.maxhp, P.hp+totemEff('killHeal',0));
  for(let i=0;i<10;i++) spawnPart(e.x,e.y,(Math.random()-0.5)*260,(Math.random()-0.5)*260,0.9,
    Math.random()<0.5?'#8fae56':'#c23b3b',3.5);
  // corpse loot
  const items=rollLoot('zombie', Math.random);
  if(e.def.gunDrop && Math.random()<e.def.gunDrop[1]){
    const gid=e.def.gunDrop[0];
    invAddItem(items,{id:gid,q:1,ammo:(Math.random()*ITEMS[gid].mag)|0,att:{}});
  }
  if(Math.random()<0.7){
    const q=Math.max(1,Math.round((1+Math.floor(Math.random()*2))*totemEff('featherMul',1)));
    invAddItem(items,{id:'feather',q});
  }
  RAID.containers.push({type:'zcorpse', x:e.x, y:e.y, items, opened:false, zType:e.type});
}

// ============================================================================
// zombie AI
// ============================================================================
function enemyCanSeePlayer(e){
  if(P.dead) return false;
  const d=Math.hypot(P.x-e.x,P.y-e.y);
  if(d>e.def.vision*WEATHER_FX[RAID.weather].enemyVis) return false;
  const a=Math.atan2(P.y-e.y,P.x-e.x);
  if(d>80 && Math.abs(angDiff(e.dir,a))>e.def.fov*Math.PI/360) return false;
  return losClear(RAID.world,e.x,e.y,P.x,P.y);
}
function enemyMove(e, tx, ty, speed, dt){
  const a0=Math.atan2(ty-e.y,tx-e.x);
  const a=a0+e.avoidA;
  const ox=e.x, oy=e.y;
  let nx=e.x+Math.cos(a)*speed*dt, ny=e.y+Math.sin(a)*speed*dt;
  // soft separation so the horde doesn't stack
  for(const o of RAID.enemies){
    if(o===e) continue;
    const d2v=dist2(e.x,e.y,o.x,o.y);
    if(d2v<28*28 && d2v>1){
      const d=Math.sqrt(d2v);
      nx+=(e.x-o.x)/d*30*dt; ny+=(e.y-o.y)/d*30*dt;
    }
  }
  const np=collideCircle(RAID.world,nx,ny,e.r);
  e.x=np.x; e.y=np.y;
  // never stack on top of the player — stop at arm's length
  const pd=Math.hypot(e.x-P.x,e.y-P.y), minD=e.r+P.r+3;
  if(pd<minD && pd>0.01){
    e.x=P.x+(e.x-P.x)/pd*minD; e.y=P.y+(e.y-P.y)/pd*minD;
  }
  const moved=Math.hypot(e.x-ox,e.y-oy);
  if(moved < speed*dt*0.35){
    e.stuckT+=dt;
    if(e.stuckT>0.25){ e.avoidA = (Math.random()<0.5?1:-1)*(0.6+Math.random()*0.9); e.stuckT=0; }
  }else{
    e.stuckT=Math.max(0,e.stuckT-dt);
    e.avoidA*= (1-Math.min(1,dt*2.5));
  }
  if(moved>0.5) e.dir=lerp2Angle(e.dir, Math.atan2(e.y-oy,e.x-ox), dt*8);
}
function lerp2Angle(a,b,t){ return a+angDiff(a,b)*Math.min(1,t); }

function updateEnemy(e, dt){
  e.stateT+=dt; e.fireCd=Math.max(0,e.fireCd-dt); e.pauseT=Math.max(0,e.pauseT-dt);
  e.hurtT=Math.max(0,e.hurtT-dt);
  // hearing
  for(const n of RAID.noises){
    if(dist2(e.x,e.y,n.x,n.y) < n.r*n.r){
      if(e.state==='combat'){ if(n.owner==='player'){ e.lastSeen={x:n.x,y:n.y}; } }
      else{
        e.state='investigate'; e.stateT=0;
        e.tgt={x:n.x+(Math.random()-0.5)*60, y:n.y+(Math.random()-0.5)*60};
      }
    }
  }
  const sees=enemyCanSeePlayer(e);
  if(sees){
    alertEnemy(e);
    e.lastSeen={x:P.x,y:P.y}; e.noLosT=0;
  }else if(e.state==='combat'){ e.noLosT+=dt; }

  const atk=e.def.atk;
  if(e.state==='patrol'){
    if(!e.tgt || e.stateT>rrConst(e,3,7)){
      e.stateT=0;
      e.tgt={x:e.home.x+(Math.random()-0.5)*300, y:e.home.y+(Math.random()-0.5)*300};
    }
    if(e.tgt && dist2(e.x,e.y,e.tgt.x,e.tgt.y)>24*24) enemyMove(e,e.tgt.x,e.tgt.y,e.def.speed*0.5,dt);
  }
  else if(e.state==='investigate'){
    if(e.tgt && dist2(e.x,e.y,e.tgt.x,e.tgt.y)>30*30){
      enemyMove(e,e.tgt.x,e.tgt.y,e.def.speed*0.85,dt);
    }else{
      e.dir+=dt*1.6; // look around
      if(e.stateT>5){ e.state='patrol'; e.stateT=0; e.tgt=null; }
    }
  }
  else if(e.state==='combat'){
    const ls=e.lastSeen||{x:P.x,y:P.y};
    const d=Math.hypot(P.x-e.x,P.y-e.y);
    if(atk.kind==='melee'){
      if(sees || e.noLosT<4){
        enemyMove(e, sees?P.x:ls.x, sees?P.y:ls.y, e.def.speed, dt);
        if(sees) e.dir=lerp2Angle(e.dir,Math.atan2(P.y-e.y,P.x-e.x),dt*10);
        if(d<atk.range+P.r && e.fireCd<=0 && sees){
          e.fireCd=1/atk.rof;
          damagePlayer(atk.dmg*e.dmgMul, 'a '+e.def.name);
        }
      }else{ e.state='investigate'; e.stateT=0; e.tgt=ls; }
      return;
    }
    // ranged (Spitter)
    if(sees){
      e.dir=lerp2Angle(e.dir, Math.atan2(P.y-e.y,P.x-e.x), dt*7);
      const pref=atk.range*0.65;
      if(d>pref) enemyMove(e,P.x,P.y,e.def.speed,dt);
      else if(d<atk.range*0.3) enemyMove(e,e.x*2-P.x,e.y*2-P.y,e.def.speed*0.8,dt);
      else{
        e.strafeT-=dt;
        if(e.strafeT<=0){ e.strafeDir*=-1; e.strafeT=1+Math.random()*1.4; }
        const pa=Math.atan2(P.y-e.y,P.x-e.x)+Math.PI/2*e.strafeDir;
        enemyMove(e,e.x+Math.cos(pa)*50,e.y+Math.sin(pa)*50,e.def.speed*0.6,dt);
        e.dir=lerp2Angle(e.dir, Math.atan2(P.y-e.y,P.x-e.x), dt*9);
      }
      // spit
      if(d<atk.range && e.pauseT<=0 && e.fireCd<=0 &&
         Math.abs(angDiff(e.dir,Math.atan2(P.y-e.y,P.x-e.x)))<0.22){
        e.fireCd=1/atk.rof;
        const pellets=atk.pellets||1;
        for(let i=0;i<pellets;i++){
          const a=e.dir+(Math.random()-0.5)*atk.spread*Math.PI/180;
          RAID.bullets.push({x:e.x+Math.cos(e.dir)*20,y:e.y+Math.sin(e.dir)*20,
            vx:Math.cos(a)*atk.vel,vy:Math.sin(a)*atk.vel,dmg:atk.dmg*e.dmgMul,owner:'e',
            dist:0,maxRange:atk.range*1.4,px:e.x,py:e.y,acid:atk.acid,src:'a '+e.def.name});
        }
        spawnPart(e.x+Math.cos(e.dir)*20,e.y+Math.sin(e.dir)*20,0,0,0.12,'#b8e04a',5,'flash');
        addNoise(e.x,e.y,atk.noise,'enemy');
        sfx('spit'); // audible even when unseen — that's the warning
        e.burstLeft--;
        if(e.burstLeft<=0){ e.burstLeft=atk.burst; e.pauseT=atk.pause; }
      }
    }else{
      if(e.noLosT>6){ e.state='investigate'; e.stateT=0; e.tgt=ls; }
      else if(dist2(e.x,e.y,ls.x,ls.y)>30*30) enemyMove(e,ls.x,ls.y,e.def.speed*0.9,dt);
    }
  }
}
function rrConst(e,a,b){ return a + (Math.abs(Math.sin(e.home.x*13.37+e.home.y))* (b-a)); }

// ============================================================================
// bullets & particles
// ============================================================================
function updateBullets(dt){
  const bs=RAID.bullets;
  for(let i=bs.length-1;i>=0;i--){
    const b=bs[i];
    const step=Math.hypot(b.vx,b.vy)*dt;
    const n=Math.ceil(step/8);
    let dead=false;
    b.px=b.x; b.py=b.y;
    for(let k=0;k<n && !dead;k++){
      b.x+=b.vx*dt/n; b.y+=b.vy*dt/n; b.dist+=step/n;
      if(opaqueAtPx(RAID.world,b.x,b.y)){
        spawnPart(b.x,b.y,0,0,0.15,b.acid?'#9adf3a':'#cfc9a8',2.5); dead=true; break;
      }
      const fall=b.dist>b.maxRange*0.6 ? lerp(1,0.55,(b.dist-b.maxRange*0.6)/(b.maxRange*0.4)) : 1;
      if(b.owner==='p'){
        for(const e of RAID.enemies){
          if(e.hp>0 && dist2(b.x,b.y,e.x,e.y)<(e.r+2)*(e.r+2)){
            damageEnemy(e,b.dmg*fall,true); sfx('hit'); dead=true; break;
          }
        }
      }else if(!P.dead && dist2(b.x,b.y,P.x,P.y)<(P.r+2)*(P.r+2)){
        damagePlayer(b.dmg*fall, b.src||'a zombie'); dead=true;
      }
      if(b.dist>=b.maxRange) dead=true;
    }
    if(dead) bs.splice(i,1);
  }
}
function spawnPart(x,y,vx,vy,life,color,size,kind){
  RAID.parts.push({x,y,vx,vy,t:0,life,color,size,kind:kind||'dot'});
}
function updateParticles(dt){
  const ps=RAID.parts;
  for(let i=ps.length-1;i>=0;i--){
    const p=ps[i]; p.t+=dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vx*=1-dt*3; p.vy*=1-dt*3;
    if(p.t>=p.life) ps.splice(i,1);
  }
}

// ============================================================================
// vision
// ============================================================================
function playerVisRange(){
  let r=VIS_RANGE*totemEff('visionMul',1);
  if(!RAID.isBase) r*=WEATHER_FX[RAID.weather].vis;
  if(RAID.storm==='active') r*=0.55;
  return r;
}
function visibleAt(x,y){
  if(RAID.isBase) return true;
  const d=Math.hypot(x-P.x,y-P.y);
  if(d<NEAR_VIS) return losClear(RAID.world,P.x,P.y,x,y);
  if(d<playerVisRange() &&
     Math.abs(angDiff(P.aim, Math.atan2(y-P.y,x-P.x))) < FOV_DEG*Math.PI/360)
    return losClear(RAID.world,P.x,P.y,x,y);
  return false;
}

// ============================================================================
// rendering
// ============================================================================
function renderRaid(){
  const w=cvs.width, h=cvs.height;
  ctx.fillStyle='#0a0c10'; ctx.fillRect(0,0,w,h);
  const sx=(Math.random()-0.5)*cam.shk, sy=(Math.random()-0.5)*cam.shk;
  ctx.save();
  ctx.translate(-cam.x+sx, -cam.y+sy);

  drawTerrain(RAID.terrain, ctx, cam.x-64, cam.y-64, cam.x+w+64, cam.y+h+64);
  if(RAID.isBase) drawStations();
  else drawExtractions();
  // cull world furniture to the viewport — the big map has a lot of it
  const vx0=cam.x-80, vy0=cam.y-80, vx1=cam.x+w+80, vy1=cam.y+h+80;
  for(const c of RAID.containers){
    if(c.x<vx0||c.x>vx1||c.y<vy0||c.y>vy1) continue;
    drawContainer(c);
  }
  drawPlayer();
  for(const e of RAID.enemies) if(visibleAt(e.x,e.y)) drawZombie(e);
  // bullets (fog will mask distant ones)
  for(const b of RAID.bullets){
    if(b.acid){
      ctx.fillStyle='#9adf3a';
      ctx.beginPath(); ctx.arc(b.x,b.y,3.5,0,7); ctx.fill();
      ctx.fillStyle='#9adf3a66';
      ctx.beginPath(); ctx.arc(b.px,b.py,2.2,0,7); ctx.fill();
    }else{
      ctx.lineWidth=2;
      ctx.strokeStyle=b.owner==='p'?'#ffe9a8cc':'#ff9a7acc';
      ctx.beginPath(); ctx.moveTo(b.px,b.py); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
  }
  for(const p of RAID.parts){
    const a=1-p.t/p.life;
    ctx.globalAlpha=a;
    if(p.kind==='flash'){
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(1+p.t*20),0,7); ctx.fill();
    }else if(p.kind==='mark'){
      ctx.fillStyle=p.color; ctx.font='bold 18px sans-serif'; ctx.fillText('!',p.x-3,p.y);
    }else{
      ctx.fillStyle=p.color; ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();

  if(RAID.isBase) drawBaseAmbience();
  else{ drawFog(sx,sy); drawSpottedPings(); }
  drawScreenFx();
  drawCrosshair();
  if(!RAID.isBase) drawMinimap();
}

function drawFog(sx,sy){
  const w=cvs.width,h=cvs.height;
  if(!fogCv||fogCv.width!==w||fogCv.height!==h){
    fogCv=document.createElement('canvas'); fogCv.width=w; fogCv.height=h;
    fogCtx=fogCv.getContext('2d');
  }
  const f=fogCtx;
  f.globalCompositeOperation='source-over';
  f.clearRect(0,0,w,h);
  f.fillStyle=RAID.storm==='active'?'rgba(26,8,34,0.86)':'rgba(8,10,18,0.80)';
  f.fillRect(0,0,w,h);
  const px=P.x-cam.x+sx, py=P.y-cam.y+sy;
  const range=playerVisRange();
  const grad=f.createRadialGradient(px,py,10,px,py,range);
  grad.addColorStop(0,'rgba(255,255,255,0.98)');
  grad.addColorStop(0.75,'rgba(255,255,255,0.88)');
  grad.addColorStop(1,'rgba(255,255,255,0)');
  f.globalCompositeOperation='destination-out';
  // cone polygon
  f.fillStyle=grad;
  f.beginPath();
  f.moveTo(px,py);
  const half=FOV_DEG*Math.PI/360, n=68;
  for(let i=0;i<=n;i++){
    const a=P.aim-half+(2*half)*i/n;
    const d=castRay(RAID.world,P.x,P.y,a,range);
    f.lineTo(px+Math.cos(a)*d, py+Math.sin(a)*d);
  }
  f.closePath(); f.fill();
  // near-vision ring (see a little all around)
  const ngrad=f.createRadialGradient(px,py,5,px,py,NEAR_VIS);
  ngrad.addColorStop(0,'rgba(255,255,255,0.92)');
  ngrad.addColorStop(1,'rgba(255,255,255,0)');
  f.fillStyle=ngrad;
  f.beginPath();
  f.moveTo(px,py);
  for(let i=0;i<=36;i++){
    const a=i/36*Math.PI*2;
    const d=castRay(RAID.world,P.x,P.y,a,NEAR_VIS);
    f.lineTo(px+Math.cos(a)*d, py+Math.sin(a)*d);
  }
  f.closePath(); f.fill();
  ctx.drawImage(fogCv,0,0);
}

// red edge-of-screen "!" when something you can't see has spotted you
function drawSpottedPings(){
  const w=cvs.width,h=cvs.height,m=42;
  for(const p of RAID.pings){
    const e=p.e;
    if(visibleAt(e.x,e.y)) continue;
    let x=e.x-cam.x, y=e.y-cam.y;
    x=clamp(x,m,w-m); y=clamp(y,m,h-m);
    const a=clamp(1.6-p.t,0,1);
    ctx.globalAlpha=a;
    ctx.fillStyle='#c22b2b';
    ctx.beginPath(); ctx.arc(x,y,13,0,7); ctx.fill();
    ctx.strokeStyle='#ff8a7a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x,y,13+p.t*10,0,7); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
    ctx.fillText('!',x,y+5.5);
    ctx.textAlign='left';
    ctx.globalAlpha=1;
  }
}

function drawBaseAmbience(){
  const w=cvs.width,h=cvs.height;
  const g=ctx.createRadialGradient(w/2,h/2,h*0.28,w/2,h/2,h*0.85);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(1,'rgba(4,6,12,0.55)');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(217,150,87,0.045)'; // warm lamp tint
  ctx.fillRect(0,0,w,h);
}

function drawScreenFx(){
  const w=cvs.width,h=cvs.height;
  if(P.hurtT>0){
    ctx.fillStyle='rgba(200,30,30,'+(P.hurtT*0.55)+')';
    ctx.fillRect(0,0,w,h);
  }
  if(P.hp<30 && !P.dead && !RAID.isBase){
    const a=0.15+0.1*Math.sin(RAID.time*6);
    const g=ctx.createRadialGradient(w/2,h/2,h*0.3,w/2,h/2,h*0.75);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(160,20,20,'+a+')');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  }
  if(RAID.storm==='active'){
    ctx.fillStyle='rgba(120,50,190,'+(0.10+0.05*Math.sin(RAID.time*3))+')';
    ctx.fillRect(0,0,w,h);
  }
  // weather
  if(!RAID.isBase && RAID.weather==='rain'){
    ctx.strokeStyle='rgba(150,180,220,0.28)'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<44;i++){
      const x=Math.random()*w, y=Math.random()*h;
      ctx.moveTo(x,y); ctx.lineTo(x-4,y+13);
    }
    ctx.stroke();
    ctx.fillStyle='rgba(90,120,170,0.05)'; ctx.fillRect(0,0,w,h);
  }
  if(!RAID.isBase && RAID.weather==='fog'){
    ctx.fillStyle='rgba(170,180,195,0.07)'; ctx.fillRect(0,0,w,h);
  }
}

function drawCrosshair(){
  if(P.dead) return;
  const x=mouse.x,y=mouse.y;
  if(RAID.isBase){ // simple dot cursor in the safe zone
    ctx.fillStyle='#e8e2d9';
    ctx.beginPath(); ctx.arc(x,y,3,0,7); ctx.fill();
    ctx.strokeStyle='#e8e2d966';
    ctx.beginPath(); ctx.arc(x,y,7,0,7); ctx.stroke();
    return;
  }
  const slot=activeWeaponSlot();
  let gap=8;
  if(slot && ITEMS[slot.id].type==='gun'){
    const gs=gunStats(slot);
    const moveAdd=P.moving?(P.speedNow/230)*3:0;
    gap=6+(gs.spread+P.heat+moveAdd)*2.2;
  }
  ctx.strokeStyle='#e8e2d9'; ctx.lineWidth=1.6;
  ctx.beginPath();
  ctx.moveTo(x-gap-6,y); ctx.lineTo(x-gap,y);
  ctx.moveTo(x+gap,y);   ctx.lineTo(x+gap+6,y);
  ctx.moveTo(x,y-gap-6); ctx.lineTo(x,y-gap);
  ctx.moveTo(x,y+gap);   ctx.lineTo(x,y+gap+6);
  ctx.stroke();
  ctx.fillStyle='#d97757'; ctx.fillRect(x-1,y-1,2,2);
}

// -------- actors ------------------------------------------------------------
function drawPlayer(){
  const {x,y}=P;
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x,y+9,13,6,0,0,7); ctx.fill();
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(P.aim);
  const bob=1+Math.sin(P.walkPhase)*0.04*(P.moving?1:0);
  ctx.scale(bob,bob);
  // gun / melee
  const slot=activeWeaponSlot();
  if(slot){
    const d=ITEMS[slot.id];
    if(d.type==='gun'){
      ctx.fillStyle='#2b2f38';
      const len=d.ammo==='ammo_762'||d.ammo==='ammo_12'?20:14;
      ctx.fillRect(6,4,len,4);
      ctx.fillStyle='#454b58'; ctx.fillRect(6,4,5,5);
      if(slot.att&&slot.att.muzzle){ ctx.fillStyle='#111'; ctx.fillRect(6+len,4.5,6,3); }
    }else if(d.type==='melee'){
      const sw = P.swingAnim>0 ? Math.sin((0.22-P.swingAnim)/0.22*Math.PI)*1.6 : 0;
      ctx.rotate(sw-0.3);
      ctx.fillStyle='#9aa2b0'; ctx.fillRect(8,3,13,3);
      ctx.fillStyle='#6b5537'; ctx.fillRect(5,2.5,4,4);
      ctx.rotate(-(sw-0.3));
    }
  }
  // starburst body — the claude creature
  ctx.fillStyle='#d97757';
  for(let i=0;i<8;i++){
    ctx.save(); ctx.rotate(i*Math.PI/4 + Math.sin(P.walkPhase*0.5)*0.06);
    ctx.beginPath(); ctx.ellipse(8.5,0,6.5,3.4,0,0,7); ctx.fill();
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0,0,9,0,7); ctx.fill();
  ctx.strokeStyle='#b85c3f'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(0,0,9,0,7); ctx.stroke();
  // face (rotates with aim → always "looking" where you aim)
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(4,-3.2,2.4,0,7); ctx.arc(4,3.2,2.4,0,7); ctx.fill();
  ctx.fillStyle='#1a1a1a';
  ctx.beginPath(); ctx.arc(4.9,-3.2,1.2,0,7); ctx.arc(4.9,3.2,1.2,0,7); ctx.fill();
  ctx.restore();
}

function drawZombie(e){
  const d=e.def;
  // shadow (not rotated)
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(e.x,e.y+8,e.r,e.r*0.45,0,0,7); ctx.fill();
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.rotate(e.dir);
  if(e.hurtT>0){ ctx.filter='brightness(1.9)'; }
  const shamble=Math.sin(performance.now()/220 + e.home.x)*0.12;
  // reaching arms
  ctx.fillStyle=d.color;
  ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.2;
  for(const s of [-1,1]){
    ctx.save();
    ctx.rotate(s*(0.4+shamble*s));
    ctx.beginPath(); ctx.ellipse(e.r*0.9,0,e.r*0.62,3.4,0,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#c9b892'; // hands
    ctx.beginPath(); ctx.arc(e.r*1.42,0,3,0,7); ctx.fill();
    ctx.fillStyle=d.color;
    ctx.restore();
  }
  // torso (shoulders)
  ctx.beginPath(); ctx.ellipse(0,0,e.r,e.r*0.85,0,0,7); ctx.fill(); ctx.stroke();
  // torn clothes patch
  ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(-e.r*0.25,e.r*0.2,e.r*0.5,e.r*0.35,0.5,0,7); ctx.fill();
  // brute pauldrons
  if(e.type==='brute'){
    ctx.fillStyle='#41564a';
    ctx.beginPath(); ctx.arc(0,-e.r*0.75,e.r*0.4,0,7); ctx.arc(0,e.r*0.75,e.r*0.4,0,7); ctx.fill();
  }
  // head
  ctx.fillStyle='#b7c789';
  if(e.type==='runner') ctx.fillStyle='#cfa87a';
  if(e.type==='brute') ctx.fillStyle='#8fa892';
  ctx.beginPath(); ctx.arc(e.r*0.4,0,e.r*0.52,0,7); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.stroke();
  // eyes — dull red
  ctx.fillStyle=e.state==='combat'?'#ff3b2b':'#7a1f1f';
  ctx.beginPath(); ctx.arc(e.r*0.72,-3.2,1.7,0,7); ctx.arc(e.r*0.72,3.2,1.7,0,7); ctx.fill();
  // spitter's glowing maw
  if(e.type==='spitter'){
    ctx.fillStyle='#c8f04a';
    ctx.beginPath(); ctx.arc(e.r*0.88,0,2.8,0,7); ctx.fill();
  }
  ctx.filter='none';
  ctx.restore();
  // hp bar when damaged
  if(e.hp<e.maxhp){
    ctx.fillStyle='#000a'; ctx.fillRect(e.x-14,e.y-e.r-11,28,4);
    ctx.fillStyle='#e05252'; ctx.fillRect(e.x-14,e.y-e.r-11,28*(e.hp/e.maxhp),4);
  }
  // awareness icon: ! spotted you · ? searching · 💤 oblivious
  ctx.textAlign='center';
  if(e.state==='combat'){
    ctx.fillStyle='#ff5a4a'; ctx.font='bold 15px sans-serif';
    ctx.fillText('!', e.x, e.y-e.r-15);
  }else if(e.state==='investigate'){
    ctx.fillStyle='#ffd257'; ctx.font='bold 14px sans-serif';
    ctx.fillText('?', e.x, e.y-e.r-15);
  }else{
    ctx.globalAlpha=0.75; ctx.font='11px sans-serif';
    ctx.fillText('💤', e.x, e.y-e.r-13);
    ctx.globalAlpha=1;
  }
  ctx.textAlign='left';
}

// -------- world furniture ----------------------------------------------------
function drawContainer(c){
  ctx.save();
  ctx.translate(c.x,c.y);
  const empty=!c.items.some(s=>s);
  ctx.globalAlpha = empty?0.5:1;
  switch(c.type){
    case 'crate':
      ctx.fillStyle='#8a6636'; ctx.fillRect(-11,-9,22,18);
      ctx.strokeStyle='#54401e'; ctx.strokeRect(-11,-9,22,18);
      ctx.strokeRect(-11,-3,22,0.5);
      break;
    case 'locker':
      ctx.fillStyle='#5a6474'; ctx.fillRect(-9,-12,18,24);
      ctx.strokeStyle='#333c48'; ctx.strokeRect(-9,-12,18,24);
      ctx.fillStyle='#333c48'; ctx.fillRect(2,-2,3,4);
      break;
    case 'medbox':
      ctx.fillStyle='#e8e4dc'; ctx.fillRect(-10,-8,20,16);
      ctx.fillStyle='#d04040'; ctx.fillRect(-2,-6,4,12); ctx.fillRect(-6,-2,12,4);
      break;
    case 'weaponbox':
      ctx.fillStyle='#57633f'; ctx.fillRect(-14,-8,28,16);
      ctx.strokeStyle='#38422a'; ctx.strokeRect(-14,-8,28,16);
      ctx.fillStyle='#38422a'; ctx.fillRect(-14,-2,28,2);
      break;
    case 'nest':
      ctx.fillStyle='#a08040'; ctx.beginPath(); ctx.arc(0,0,12,0,7); ctx.fill();
      ctx.fillStyle='#6e5626'; ctx.beginPath(); ctx.arc(0,0,7,0,7); ctx.fill();
      if(!empty){
        ctx.fillStyle='#ffd257';
        ctx.beginPath(); ctx.ellipse(0,-1,4.5,5.5,0,0,7); ctx.fill();
        ctx.globalAlpha=0.35+0.25*Math.sin(performance.now()/300);
        ctx.strokeStyle='#ffd257'; ctx.beginPath(); ctx.arc(0,0,15,0,7); ctx.stroke();
        ctx.globalAlpha=1;
      }
      break;
    case 'zcorpse':{
      const col=(ENEMY_DEFS[c.zType]||ENEMY_DEFS.shambler).color;
      ctx.rotate(0.9);
      ctx.fillStyle=col; ctx.globalAlpha=0.8;
      ctx.beginPath(); ctx.ellipse(0,0,14,8,0,0,7); ctx.fill();
      ctx.fillStyle='#b7c789';
      ctx.beginPath(); ctx.arc(11,2,5.5,0,7); ctx.fill();
      ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.4;
      ctx.beginPath(); // X eyes
      ctx.moveTo(9,0); ctx.lineTo(12,3); ctx.moveTo(12,0); ctx.lineTo(9,3);
      ctx.stroke();
      break;}
    case 'pcorpse':
      ctx.fillStyle='#d97757'; ctx.fillRect(-10,-12,20,24);
      ctx.fillStyle='#b85c3f'; ctx.fillRect(-10,-12,20,7);
      ctx.strokeStyle='#7e3d28'; ctx.strokeRect(-10,-12,20,24);
      ctx.strokeRect(-4,-2,8,6);
      if(!empty){
        ctx.globalAlpha=0.4+0.3*Math.sin(performance.now()/250);
        ctx.strokeStyle='#d97757'; ctx.beginPath(); ctx.arc(0,0,18,0,7); ctx.stroke();
      }
      break;
    case 'bag':
      ctx.fillStyle='#7a6a4a'; ctx.beginPath(); ctx.arc(0,0,8,0,7); ctx.fill();
      ctx.fillStyle='#54462c'; ctx.fillRect(-3,-9,6,4);
      break;
  }
  ctx.restore();
}

function drawExtractions(){
  for(const z of RAID.world.extractions){
    ctx.save();
    ctx.translate(z.x,z.y);
    const alarmed = RAID.extractZone===z;
    ctx.strokeStyle=alarmed
      ? 'rgba(255,'+(90+80*Math.abs(Math.sin(performance.now()/160)))+',74,0.9)'
      : 'rgba(87,217,143,0.75)';
    ctx.lineWidth=alarmed?3.5:2.5;
    ctx.setLineDash([12,9]);
    ctx.lineDashOffset=-performance.now()/40;
    ctx.beginPath(); ctx.arc(0,0,z.r,0,7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(87,217,143,0.07)';
    ctx.beginPath(); ctx.arc(0,0,z.r,0,7); ctx.fill();
    // flag
    ctx.fillStyle='#54462c'; ctx.fillRect(-2,-34,4,34);
    ctx.fillStyle='#57d98f';
    const wv=Math.sin(performance.now()/300)*3;
    ctx.beginPath(); ctx.moveTo(2,-34); ctx.lineTo(24+wv,-28); ctx.lineTo(2,-21); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(232,226,217,0.85)';
    ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
    ctx.fillText(z.name, 0, -42);
    ctx.textAlign='left';
    ctx.restore();
  }
}

// -------- home base stations --------------------------------------------------
function drawStations(){
  const now=performance.now();
  for(const st of RAID.world.stations){
    ctx.save();
    ctx.translate(st.x,st.y);
    switch(st.type){
      case 'exit':
        ctx.fillStyle='#54462c'; ctx.fillRect(-12,-16,4,34); ctx.fillRect(8,-16,4,34);
        ctx.fillStyle='#7a6a4a';
        for(let i=0;i<5;i++) ctx.fillRect(-12,-14+i*7,24,3);
        ctx.fillStyle='rgba(87,217,143,'+(0.5+0.3*Math.sin(now/350))+')';
        ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
        ctx.fillText('▲',0,-22);
        break;
      case 'stash':
        ctx.fillStyle='#00000044'; ctx.fillRect(-16,-8,34,24);
        ctx.fillStyle='#8a6636'; ctx.fillRect(-17,-13,34,24);
        ctx.fillStyle='#6e5024'; ctx.fillRect(-17,-13,34,9);
        ctx.strokeStyle='#43310f'; ctx.strokeRect(-17,-13,34,24);
        ctx.fillStyle='#d9a957'; ctx.fillRect(-3,-6,6,6);
        break;
      case 'bed':
        ctx.fillStyle='#3d4654'; ctx.fillRect(-14,-20,28,40);
        ctx.fillStyle='#5a6474'; ctx.fillRect(-12,-18,24,36);
        ctx.fillStyle='#e8e4dc'; ctx.fillRect(-12,-18,24,10);
        ctx.strokeStyle='#23262e'; ctx.strokeRect(-14,-20,28,40);
        break;
      case 'trader':
        // counter
        ctx.fillStyle='#6e5024'; ctx.fillRect(-20,10,40,8);
        ctx.strokeStyle='#43310f'; ctx.strokeRect(-20,10,40,8);
        // Boris
        ctx.fillStyle='rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0,6,11,4,0,0,7); ctx.fill();
        ctx.fillStyle='#5c5148'; // coat
        ctx.beginPath(); ctx.ellipse(0,-2,11,9,0,0,7); ctx.fill();
        ctx.fillStyle='#c9a37a'; // head
        ctx.beginPath(); ctx.arc(0,-8,6,0,7); ctx.fill();
        ctx.fillStyle='#4a3a26'; // magnificent beard
        ctx.beginPath(); ctx.arc(0,-5.5,5,0.3,Math.PI-0.3); ctx.fill();
        ctx.fillStyle='#1a1a1a';
        ctx.beginPath(); ctx.arc(-2,-9,0.9,0,7); ctx.arc(2,-9,0.9,0,7); ctx.fill();
        break;
      case 'upgrade':
        ctx.fillStyle='#6e5024'; ctx.fillRect(-18,-10,36,20);
        ctx.strokeStyle='#43310f'; ctx.strokeRect(-18,-10,36,20);
        ctx.fillStyle='#9aa2b0'; ctx.fillRect(-12,-5,10,3); // wrench-ish
        ctx.fillStyle='#d97757'; ctx.fillRect(4,-6,6,6);
        ctx.fillStyle='#454b58'; ctx.fillRect(2,3,12,3);
        break;
      case 'gunsmith': // bench with a stripped rifle + tarp — not finished
        ctx.fillStyle='#4a4234'; ctx.fillRect(-18,-10,36,20);
        ctx.strokeStyle='#2c2618'; ctx.strokeRect(-18,-10,36,20);
        ctx.fillStyle='#2b2f38'; ctx.fillRect(-12,-3,22,4);
        ctx.fillStyle='#454b58'; ctx.fillRect(-12,-3,6,6);
        ctx.fillStyle='rgba(232,226,217,0.25)'; ctx.fillRect(2,-10,16,9); // dust tarp
        break;
      case 'equip': // bench with a half-sewn backpack
        ctx.fillStyle='#4a4234'; ctx.fillRect(-18,-10,36,20);
        ctx.strokeStyle='#2c2618'; ctx.strokeRect(-18,-10,36,20);
        ctx.fillStyle='#6b5537'; ctx.fillRect(-9,-6,12,13);
        ctx.fillStyle='#54462c'; ctx.fillRect(-9,-6,12,5);
        ctx.strokeStyle='#e8e2d955'; ctx.beginPath();
        ctx.moveTo(5,4); ctx.lineTo(13,-4); ctx.stroke(); // thread
        break;
      case 'medbay': // gurney + cross, sheet still folded
        ctx.fillStyle='#8a9099'; ctx.fillRect(-16,-9,32,18);
        ctx.fillStyle='#e8e4dc'; ctx.fillRect(-14,-7,20,14);
        ctx.fillStyle='#d04040'; ctx.fillRect(8,-6,4,12); ctx.fillRect(4,-2,12,4);
        break;
    }
    // label
    ctx.fillStyle='rgba(232,226,217,0.55)';
    ctx.font='11px sans-serif'; ctx.textAlign='center';
    ctx.fillText(st.label, 0, -30);
    ctx.textAlign='left';
    ctx.restore();
  }
}

// -------- minimap ------------------------------------------------------------
function drawMinimap(){
  const s=168/(RAID.world.w*TILE);
  mmCtx.clearRect(0,0,168,168);
  mmCtx.drawImage(RAID.mmTerrain,0,0);
  for(const z of RAID.world.extractions){
    mmCtx.fillStyle='#57d98f';
    mmCtx.beginPath();
    mmCtx.moveTo(z.x*s,z.y*s-5); mmCtx.lineTo(z.x*s-4,z.y*s+3); mmCtx.lineTo(z.x*s+4,z.y*s+3);
    mmCtx.closePath(); mmCtx.fill();
  }
  for(const c of RAID.containers) if(c.type==='pcorpse'&&c.items.some(x=>x)){
    mmCtx.strokeStyle='#d97757'; mmCtx.lineWidth=2;
    mmCtx.beginPath();
    mmCtx.moveTo(c.x*s-4,c.y*s-4); mmCtx.lineTo(c.x*s+4,c.y*s+4);
    mmCtx.moveTo(c.x*s+4,c.y*s-4); mmCtx.lineTo(c.x*s-4,c.y*s+4);
    mmCtx.stroke();
  }
  // player + facing
  mmCtx.fillStyle='#fff';
  mmCtx.beginPath(); mmCtx.arc(P.x*s,P.y*s,3,0,7); mmCtx.fill();
  mmCtx.strokeStyle='#fff9'; mmCtx.lineWidth=1.5;
  mmCtx.beginPath(); mmCtx.moveTo(P.x*s,P.y*s);
  mmCtx.lineTo(P.x*s+Math.cos(P.aim)*9, P.y*s+Math.sin(P.aim)*9); mmCtx.stroke();
  if(RAID.storm!=='none'){
    mmCtx.strokeStyle=RAID.storm==='active'?'#a45de0':'#a45de088';
    mmCtx.lineWidth=3; mmCtx.strokeRect(1,1,166,166);
  }
}
