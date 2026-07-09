// ============================================================================
// world.js — seeded RNG, map generation, tile collision, LOS raycasting,
//            terrain & minimap pre-rendering
// ============================================================================
'use strict';

const TILE = 32, MW = 84, MH = 84;
const T = {GRASS:0, ROAD:1, FLOOR:2, WALL:3, TREE:4, ROCK:5, FENCE:6, CRATE:7, BUSH:8};
const SOLID  = new Set([T.WALL, T.TREE, T.ROCK, T.FENCE, T.CRATE]);
const OPAQUE = new Set([T.WALL, T.TREE, T.ROCK, T.CRATE]); // fences/bushes don't block sight

function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rr    = (rng,a,b)=> a + rng()*(b-a);
const rri   = (rng,a,b)=> Math.floor(rr(rng,a,b+1));
const rpick = (rng,arr)=> arr[Math.floor(rng()*arr.length)];
function rweighted(rng, list){ // list of [value, weight, ...]
  let tot = 0; for(const e of list) tot += e[1];
  let x = rng()*tot;
  for(const e of list){ x -= e[1]; if(x<=0) return e; }
  return list[list.length-1];
}

// ---------------------------------------------------------------------------
// generation. Geometry comes from a fixed layout seed (persistent map), loot
// containers & enemy squads from a per-raid seed.
// ---------------------------------------------------------------------------
const LAYOUT_SEED = 1337;

function genWorld(raidSeed){
  const rng  = mulberry32(LAYOUT_SEED);   // geometry
  const lrng = mulberry32(raidSeed);      // loot & enemies
  const t = new Uint8Array(MW*MH).fill(T.GRASS);
  const at  = (x,y)=> t[y*MW+x];
  const set = (x,y,v)=>{ if(x>=0&&y>=0&&x<MW&&y<MH) t[y*MW+x]=v; };

  // perimeter forest ring
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    const d = Math.min(x,y,MW-1-x,MH-1-y);
    if(d===0) set(x,y,T.ROCK);
    else if(d<3 && rng()<0.75) set(x,y, rng()<0.7?T.TREE:T.ROCK);
  }

  // crossing roads
  const roadY = rri(rng,34,46), roadX = rri(rng,34,46);
  for(let x=2;x<MW-2;x++) for(let k=0;k<4;k++) if(at(x,roadY+k)===T.GRASS) set(x,roadY+k,T.ROAD);
  for(let y=2;y<MH-2;y++) for(let k=0;k<4;k++) if(at(roadX+k,y)===T.GRASS) set(roadX+k,y,T.ROAD);

  // buildings
  const buildings = [];
  let tries = 0;
  while(buildings.length<11 && tries++<450){
    const bw = rri(rng,6,12), bh = rri(rng,5,9);
    const bx = rri(rng,5,MW-6-bw), by = rri(rng,5,MH-6-bh);
    // margin check vs roads & other buildings & spawn area
    let ok = true;
    for(let y=by-2;y<by+bh+2 && ok;y++) for(let x=bx-2;x<bx+bw+2 && ok;x++)
      if(at(x,y)!==T.GRASS) ok=false;
    if(by+bh > MH-14 && bx>MW/2-14 && bx<MW/2+14) ok=false; // keep spawn clearing
    if(!ok) continue;
    for(let y=by;y<by+bh;y++) for(let x=bx;x<bx+bw;x++)
      set(x,y, (y===by||y===by+bh-1||x===bx||x===bx+bw-1) ? T.WALL : T.FLOOR);
    // 1-2 doors on random sides
    const doors = rri(rng,1,2);
    for(let d=0;d<doors;d++){
      const side = rri(rng,0,3);
      if(side===0) set(rri(rng,bx+1,bx+bw-2), by, T.FLOOR);
      if(side===1) set(rri(rng,bx+1,bx+bw-2), by+bh-1, T.FLOOR);
      if(side===2) set(bx, rri(rng,by+1,by+bh-2), T.FLOOR);
      if(side===3) set(bx+bw-1, rri(rng,by+1,by+bh-2), T.FLOOR);
    }
    buildings.push({x:bx,y:by,w:bw,h:bh});
  }

  // scatter clutter
  const scatter = (type, n, clump)=>{
    for(let i=0;i<n;i++){
      const x=rri(rng,4,MW-5), y=rri(rng,4,MH-5);
      if(at(x,y)!==T.GRASS) continue;
      if(y>MH-12 && Math.abs(x-MW/2)<10) continue; // spawn clearing
      set(x,y,type);
      if(clump) for(let c=0;c<rri(rng,0,3);c++){
        const cx=x+rri(rng,-1,1), cy=y+rri(rng,-1,1);
        if(at(cx,cy)===T.GRASS) set(cx,cy,type);
      }
    }
  };
  scatter(T.TREE,110,true); scatter(T.ROCK,26,false); scatter(T.CRATE,22,false);
  scatter(T.BUSH,60,true);
  // fence lines
  for(let f=0;f<8;f++){
    const fx=rri(rng,6,MW-16), fy=rri(rng,6,MH-16), len=rri(rng,4,9), horiz=rng()<0.5;
    for(let k=0;k<len;k++){
      const x=horiz?fx+k:fx, y=horiz?fy:fy+k;
      if(at(x,y)===T.GRASS) set(x,y,T.FENCE);
    }
  }

  // key positions
  const playerSpawn = {x:(MW/2)*TILE, y:(MH-7)*TILE};
  const clear=(cx,cy,r)=>{ for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++)
    if(x>2&&y>2&&x<MW-3&&y<MH-3&&at(x,y)!==T.FLOOR) set(x,y,T.GRASS); };
  clear(MW/2|0, MH-7, 3);
  clear(8,8,3); clear(MW-9,(MH/2)|0,3);
  const extractions = [
    {x:8*TILE, y:8*TILE, r:70, name:'Northwest Camp', time:4},
    {x:(MW-9)*TILE, y:(MH/2)*TILE, r:70, name:'East Gate', time:4},
    {x:playerSpawn.x, y:playerSpawn.y+2*TILE, r:60, name:'Bunker Hatch', time:6},
  ];

  // --------------------- per-raid: loot containers --------------------------
  const containers = [];
  const usedTiles = new Set();
  const addContainer=(type, tx,ty)=>{
    const key=tx+','+ty;
    if(usedTiles.has(key)) return false;
    usedTiles.add(key);
    containers.push({type, x:tx*TILE+TILE/2, y:ty*TILE+TILE/2,
                     items:rollLoot(type,lrng), opened:false});
    return true;
  };
  const freeFloorIn=(b)=>{
    for(let k=0;k<20;k++){
      const x=rri(lrng,b.x+1,b.x+b.w-2), y=rri(lrng,b.y+1,b.y+b.h-2);
      if(at(x,y)===T.FLOOR && !usedTiles.has(x+','+y)) return {x,y};
    }
    return null;
  };
  // building interiors get the good stuff
  for(const b of buildings){
    const n = rri(lrng,1,3);
    for(let i=0;i<n;i++){
      const p=freeFloorIn(b); if(!p) break;
      const type = rweighted(lrng,[['locker',40],['crate',30],['medbox',15],['weaponbox',15]])[0];
      addContainer(type,p.x,p.y);
    }
  }
  // outdoor crates
  let placed=0; tries=0;
  while(placed<12 && tries++<500){
    const x=rri(lrng,5,MW-6), y=rri(lrng,5,MH-6);
    if(at(x,y)!==T.GRASS) continue;
    if(addContainer(lrng()<0.85?'crate':'weaponbox',x,y)) placed++;
  }
  // rare nests
  placed=0; tries=0;
  while(placed<2 && tries++<300){
    const x=rri(lrng,6,MW-7), y=rri(lrng,6,MH-7);
    if(at(x,y)!==T.GRASS) continue;
    if(addContainer('nest',x,y)) placed++;
  }

  // --------------------- per-raid: enemy squads ------------------------------
  const enemySpawns = [];
  const spawnPts = [];
  for(const b of buildings) spawnPts.push({x:(b.x+b.w/2)*TILE, y:(b.y+b.h/2)*TILE});
  spawnPts.push({x:roadX*TILE, y:roadY*TILE});
  for(let i=0;i<4;i++) spawnPts.push({x:rri(lrng,8,MW-8)*TILE, y:rri(lrng,8,MH-8)*TILE});
  let squads=0;
  for(const p of spawnPts.sort(()=>lrng()-0.5)){
    if(squads>=7) break;
    const d = Math.hypot(p.x-playerSpawn.x, p.y-playerSpawn.y);
    if(d < 420) continue;
    const squad = rpick(lrng,SQUADS);
    for(const type of squad)
      enemySpawns.push({type, x:p.x+rr(lrng,-60,60), y:p.y+rr(lrng,-60,60)});
    squads++;
  }

  return {t, at, buildings, containers, extractions, playerSpawn, enemySpawns};
}

function rollLoot(table, rng){
  const def = LOOT_TABLES[table] || LOOT_TABLES.crate;
  const items = [];
  const n = rri(rng, def.rolls[0], def.rolls[1]);
  for(let i=0;i<n;i++){
    const e = rweighted(rng, def.list);
    const id = e[0], q = rri(rng, e[2]||1, e[3]||1);
    const d = ITEMS[id];
    const slot = {id, q};
    if(d.type==='gun'){ slot.q=1; slot.ammo=rri(rng,0,d.mag); slot.att={}; }
    items.push(slot);
  }
  while(items.length<8) items.push(null);
  return items;
}

// ---------------------------------------------------------------------------
// collision & raycasting
// ---------------------------------------------------------------------------
function tileAt(world,x,y){
  const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
  if(tx<0||ty<0||tx>=MW||ty>=MH) return T.ROCK;
  return world.t[ty*MW+tx];
}
const solidAtPx  = (world,x,y)=> SOLID.has(tileAt(world,x,y));
const opaqueAtPx = (world,x,y)=> OPAQUE.has(tileAt(world,x,y));

// circle vs tile-grid: returns corrected {x,y}
function collideCircle(world,x,y,r){
  const minTx=Math.floor((x-r)/TILE), maxTx=Math.floor((x+r)/TILE);
  const minTy=Math.floor((y-r)/TILE), maxTy=Math.floor((y+r)/TILE);
  for(let ty=minTy;ty<=maxTy;ty++) for(let tx=minTx;tx<=maxTx;tx++){
    const tt=(tx<0||ty<0||tx>=MW||ty>=MH)?T.ROCK:world.t[ty*MW+tx];
    if(!SOLID.has(tt)) continue;
    const cx=Math.max(tx*TILE,Math.min(x,(tx+1)*TILE));
    const cy=Math.max(ty*TILE,Math.min(y,(ty+1)*TILE));
    const dx=x-cx, dy=y-cy, d2=dx*dx+dy*dy;
    if(d2<r*r && d2>0.0001){
      const d=Math.sqrt(d2), push=(r-d)/d;
      x+=dx*push; y+=dy*push;
    }else if(d2<=0.0001){
      y = cy>ty*TILE+TILE/2 ? ty*TILE-r : (ty+1)*TILE+r; // degenerate: push out vertically
    }
  }
  return {x,y};
}

// DDA raycast against OPAQUE tiles → distance travelled (capped at maxDist)
function castRay(world,x,y,ang,maxDist){
  const dx=Math.cos(ang), dy=Math.sin(ang);
  let tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
  const stepX=dx>0?1:-1, stepY=dy>0?1:-1;
  const tDeltaX=dx!==0?Math.abs(TILE/dx):Infinity;
  const tDeltaY=dy!==0?Math.abs(TILE/dy):Infinity;
  let tMaxX=dx!==0?((dx>0?(tx+1)*TILE-x:x-tx*TILE)/Math.abs(dx)):Infinity;
  let tMaxY=dy!==0?((dy>0?(ty+1)*TILE-y:y-ty*TILE)/Math.abs(dy)):Infinity;
  let dist=0;
  for(let i=0;i<200;i++){
    if(tMaxX<tMaxY){ dist=tMaxX; tMaxX+=tDeltaX; tx+=stepX; }
    else{ dist=tMaxY; tMaxY+=tDeltaY; ty+=stepY; }
    if(dist>=maxDist) return maxDist;
    if(tx<0||ty<0||tx>=MW||ty>=MH) return dist;
    if(OPAQUE.has(world.t[ty*MW+tx])) return dist;
  }
  return maxDist;
}

// straight-line sight check between two points
function losClear(world,x1,y1,x2,y2){
  const d=Math.hypot(x2-x1,y2-y1);
  if(d<1) return true;
  return castRay(world,x1,y1,Math.atan2(y2-y1,x2-x1),d) >= d-1;
}

// ---------------------------------------------------------------------------
// terrain pre-render
// ---------------------------------------------------------------------------
function prerenderTerrain(world){
  const cv=document.createElement('canvas');
  cv.width=MW*TILE; cv.height=MH*TILE;
  const c=cv.getContext('2d');
  const drng=mulberry32(99);
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    const tt=world.t[y*MW+x], px=x*TILE, py=y*TILE;
    // base
    let base='#2e3d2a';
    if(tt===T.ROAD) base='#3d3a35'; else if(tt===T.FLOOR) base='#4a3c2e';
    else if(tt===T.WALL) base='#23262e';
    c.fillStyle=base; c.fillRect(px,py,TILE,TILE);
    if(tt===T.GRASS||tt===T.BUSH||tt===T.TREE){
      c.fillStyle=drng()<0.5?'#33422e':'#2a382655';
      c.fillRect(px+drng()*24, py+drng()*24, 5,5);
      c.fillStyle='#3a4a3444'; c.fillRect(px+drng()*24, py+drng()*24, 4,4);
    }
    if(tt===T.ROAD){
      c.fillStyle='#46423c'; c.fillRect(px+drng()*24,py+drng()*24,6,3);
      c.fillStyle='#35322d'; c.fillRect(px+drng()*22,py+drng()*22,8,4);
    }
    if(tt===T.FLOOR){
      c.strokeStyle='#00000022'; c.strokeRect(px+.5,py+.5,TILE,TILE);
      c.fillStyle='#52432f33'; c.fillRect(px,py+(x%2)*16,TILE,4);
    }
    if(tt===T.WALL){
      c.fillStyle='#2f333e'; c.fillRect(px,py,TILE,TILE-6);
      c.fillStyle='#3a3f4d'; c.fillRect(px,py,TILE,4);
      c.strokeStyle='#00000044'; c.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
    }
    if(tt===T.TREE){
      c.fillStyle='#00000033'; c.beginPath(); c.ellipse(px+18,py+20,13,9,0,0,7); c.fill();
      c.fillStyle='#1e3320'; c.beginPath(); c.arc(px+16,py+14,13,0,7); c.fill();
      c.fillStyle='#2a4527'; c.beginPath(); c.arc(px+13,py+11,9,0,7); c.fill();
    }
    if(tt===T.ROCK){
      c.fillStyle='#00000033'; c.beginPath(); c.ellipse(px+17,py+21,12,7,0,0,7); c.fill();
      c.fillStyle='#565d68'; c.beginPath(); c.arc(px+16,py+15,11,0,7); c.fill();
      c.fillStyle='#6a7280'; c.beginPath(); c.arc(px+13,py+12,6,0,7); c.fill();
    }
    if(tt===T.FENCE){
      c.fillStyle='#5a4630'; c.fillRect(px,py+12,TILE,5);
      c.fillRect(px+4,py+6,4,18); c.fillRect(px+22,py+6,4,18);
    }
    if(tt===T.CRATE){
      c.fillStyle='#00000033'; c.fillRect(px+4,py+8,26,24);
      c.fillStyle='#7a5c38'; c.fillRect(px+3,py+3,26,26);
      c.strokeStyle='#4a3820'; c.strokeRect(px+3.5,py+3.5,25,25);
      c.beginPath(); c.moveTo(px+3,py+3); c.lineTo(px+29,py+29);
      c.moveTo(px+29,py+3); c.lineTo(px+3,py+29); c.stroke();
    }
    if(tt===T.BUSH){
      c.fillStyle='#33502e'; c.beginPath(); c.arc(px+12,py+18,8,0,7); c.arc(px+21,py+14,7,0,7); c.fill();
    }
  }
  return cv;
}

function prerenderMinimap(world){
  const cv=document.createElement('canvas');
  cv.width=168; cv.height=168;
  const c=cv.getContext('2d'), s=168/MW;
  const cols={[T.GRASS]:'#22301f',[T.ROAD]:'#3d3a35',[T.FLOOR]:'#4a3c2e',[T.WALL]:'#657084',
              [T.TREE]:'#17281a',[T.ROCK]:'#4a505a',[T.FENCE]:'#4a3a26',[T.CRATE]:'#6a4f30',[T.BUSH]:'#2a3f26'};
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    c.fillStyle=cols[world.t[y*MW+x]]||'#000';
    c.fillRect(x*s,y*s,s+0.5,s+0.5);
  }
  return cv;
}
