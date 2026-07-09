// ============================================================================
// world.js — seeded RNG, zoned procedural raid map + walkable home base,
//            tile collision, LOS raycasting, chunked terrain rendering
// ============================================================================
'use strict';

const TILE = 32, MW = 210, MH = 210;
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
// raid map generation. Geometry (zones, roads, buildings, clutter) comes from
// a fixed layout seed — the map is persistent between raids. Loot containers
// & zombie squads reshuffle from a per-raid seed.
// ---------------------------------------------------------------------------
const LAYOUT_SEED = 1337;

function genWorld(raidSeed){
  const rng  = mulberry32(LAYOUT_SEED);   // geometry
  const lrng = mulberry32(raidSeed);      // loot & enemies
  const t = new Uint8Array(MW*MH).fill(T.GRASS);
  const at  = (x,y)=> (x<0||y<0||x>=MW||y>=MH) ? T.ROCK : t[y*MW+x];
  const set = (x,y,v)=>{ if(x>=0&&y>=0&&x<MW&&y<MH) t[y*MW+x]=v; };
  const spawnT = {x:(MW/2)|0, y:MH-10};

  // ---------------- zones: Voronoi seeds, tiered by distance from spawn ----
  const seeds=[{x:spawnT.x, y:spawnT.y-6}]; // zone 0 hugs the spawn
  let guard=0;
  while(seeds.length<ZONE_ORDER.length && guard++<600){
    const p={x:rri(rng,20,MW-20), y:rri(rng,20,MH-20)};
    if(seeds.every(s=>Math.hypot(s.x-p.x,s.y-p.y)>52)) seeds.push(p);
  }
  seeds.sort((a,b)=>
    Math.hypot(a.x-spawnT.x,a.y-spawnT.y) - Math.hypot(b.x-spawnT.x,b.y-spawnT.y));
  const zones = seeds.map((s,i)=>({type:ZONE_ORDER[i], def:ZONE_DEFS[ZONE_ORDER[i]],
                                   cx:s.x, cy:s.y}));
  const zmap = new Uint8Array(MW*MH);
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    let bi=0, bd=Infinity;
    for(let i=0;i<seeds.length;i++){
      const d=(seeds[i].x-x)*(seeds[i].x-x)+(seeds[i].y-y)*(seeds[i].y-y);
      if(d<bd){ bd=d; bi=i; }
    }
    zmap[y*MW+x]=bi;
  }
  const zoneAtT=(x,y)=> zones[zmap[y*MW+x]];

  // ---------------- perimeter ring ----------------
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    const d = Math.min(x,y,MW-1-x,MH-1-y);
    if(d===0) set(x,y,T.ROCK);
    else if(d<3 && rng()<0.75) set(x,y, rng()<0.7?T.TREE:T.ROCK);
  }

  // ---------------- roads: 2 horizontal + 2 vertical ----------------
  const roadYs=[rri(rng,55,85), rri(rng,125,155)];
  const roadXs=[rri(rng,55,85), rri(rng,125,155)];
  for(const ry of roadYs) for(let x=2;x<MW-2;x++)
    for(let k=0;k<4;k++) if(at(x,ry+k)===T.GRASS) set(x,ry+k,T.ROAD);
  for(const rx of roadXs) for(let y=2;y<MH-2;y++)
    for(let k=0;k<4;k++) if(at(rx+k,y)===T.GRASS) set(rx+k,y,T.ROAD);

  // ---------------- buildings, sized & counted per zone ----------------
  const buildings = [];
  const carveBuilding=(bx,by,bw,bh)=>{
    for(let y=by;y<by+bh;y++) for(let x=bx;x<bx+bw;x++)
      set(x,y, (y===by||y===by+bh-1||x===bx||x===bx+bw-1) ? T.WALL : T.FLOOR);
    // exterior doors — big buildings get more
    const doors = 1+Math.round((bw+bh)/14);
    for(let d=0;d<doors;d++){
      const side = rri(rng,0,3);
      if(side===0) set(rri(rng,bx+1,bx+bw-2), by, T.FLOOR);
      if(side===1) set(rri(rng,bx+1,bx+bw-2), by+bh-1, T.FLOOR);
      if(side===2) set(bx, rri(rng,by+1,by+bh-2), T.FLOOR);
      if(side===3) set(bx+bw-1, rri(rng,by+1,by+bh-2), T.FLOOR);
    }
    // interior partitions for warehouses
    if(bw>=12){
      const px=bx+rri(rng,(bw*0.35)|0,(bw*0.65)|0);
      for(let y=by+1;y<by+bh-1;y++) set(px,y,T.WALL);
      set(px, rri(rng,by+1,by+bh-2), T.FLOOR);
      set(px, rri(rng,by+1,by+bh-2), T.FLOOR);
    }
    if(bh>=10){
      const py=by+rri(rng,(bh*0.35)|0,(bh*0.65)|0);
      for(let x=bx+1;x<bx+bw-1;x++) if(at(x,py)===T.FLOOR||at(x,py)===T.GRASS) set(x,py,T.WALL);
      set(rri(rng,bx+1,bx+bw-2), py, T.FLOOR);
      set(rri(rng,bx+1,bx+bw-2), py, T.FLOOR);
    }
    buildings.push({x:bx,y:by,w:bw,h:bh});
  };
  for(const z of zones){
    const B=z.def.bld;
    let placed=0, tries=0;
    while(placed<B.n && tries++<900){
      const bw=rri(rng,B.wMin,B.wMax), bh=rri(rng,B.hMin,B.hMax);
      const bx=rri(rng,5,MW-6-bw), by=rri(rng,5,MH-6-bh);
      if(zoneAtT(bx+((bw/2)|0), by+((bh/2)|0))!==z) continue;
      if(Math.hypot(bx+bw/2-spawnT.x, by+bh/2-spawnT.y)<18) continue; // spawn clearing
      let ok=true;
      for(let y=by-2;y<by+bh+2 && ok;y++) for(let x=bx-2;x<bx+bw+2 && ok;x++)
        if(at(x,y)!==T.GRASS) ok=false;
      if(!ok) continue;
      carveBuilding(bx,by,bw,bh);
      placed++;
    }
  }

  // ---------------- clutter & crops, densities per zone ----------------
  for(let y=3;y<MH-3;y++) for(let x=3;x<MW-3;x++){
    if(at(x,y)!==T.GRASS) continue;
    if(Math.abs(x-spawnT.x)<10 && y>MH-16) continue; // spawn clearing
    const z=zoneAtT(x,y), sc=z.def.scatter;
    if(z.def.crops && (y%7===2||y%7===3) && x%2===0 && rng()<0.7){ set(x,y,T.BUSH); continue; }
    const r=rng();
    if(r<sc.tree) set(x,y,T.TREE);
    else if(r<sc.tree+sc.bush) set(x,y,T.BUSH);
    else if(r<sc.tree+sc.bush+sc.rock) set(x,y,T.ROCK);
    else if(r<sc.tree+sc.bush+sc.rock+sc.crate) set(x,y,T.CRATE);
  }
  // fence lines per zone
  for(const z of zones){
    for(let f=0;f<z.def.fences*2;f++){
      const fx=rri(rng,6,MW-16), fy=rri(rng,6,MH-16);
      if(zoneAtT(fx,fy)!==z) continue;
      const len=rri(rng,4,10), horiz=rng()<0.5;
      for(let k=0;k<len;k++){
        const x=horiz?fx+k:fx, y=horiz?fy:fy+k;
        if(at(x,y)===T.GRASS) set(x,y,T.FENCE);
      }
    }
  }

  // ---------------- key positions ----------------
  const playerSpawn = {x:spawnT.x*TILE, y:spawnT.y*TILE};
  const clear=(cx,cy,r)=>{ for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++)
    if(x>2&&y>2&&x<MW-3&&y<MH-3&&at(x,y)!==T.FLOOR) set(x,y,T.GRASS); };
  clear(spawnT.x, spawnT.y, 4);
  const exSpots=[
    {x:14, y:14, name:'Northwest Camp'},
    {x:MW-15, y:14, name:'Radio Hill'},
    {x:14, y:(MH*0.55)|0, name:'River Crossing'},
    {x:MW-15, y:(MH*0.5)|0, name:'East Gate'},
  ];
  const extractions=[];
  for(const s of exSpots){
    clear(s.x,s.y,4);
    extractions.push({x:s.x*TILE, y:s.y*TILE, r:76, name:s.name, time:4});
  }
  extractions.push({x:playerSpawn.x, y:playerSpawn.y+2*TILE, r:60, name:'Bunker Hatch', time:6});

  // ============ per-raid: loot containers (zone flavored) ============
  const containers = [];
  const usedTiles = new Set();
  const zoneSpice=(items, z)=>{ // fold the zone's signature materials in
    const n=rri(lrng,1,2);
    for(let i=0;i<n;i++){
      const e=rweighted(lrng, z.def.mats);
      const d=ITEMS[e[0]];
      const slot={id:e[0], q:rri(lrng,e[2]||1,e[3]||1)};
      if(d.type==='gun'){ slot.q=1; slot.ammo=rri(lrng,0,d.mag); slot.att={}; }
      invAddItem(items, slot);
    }
    return items;
  };
  const addContainer=(type, tx,ty)=>{
    const key=tx+','+ty;
    if(usedTiles.has(key)) return false;
    usedTiles.add(key);
    const z=zoneAtT(tx,ty);
    containers.push({type, x:tx*TILE+TILE/2, y:ty*TILE+TILE/2,
                     items:zoneSpice(rollLoot(type,lrng), z), opened:false});
    return true;
  };
  const freeFloorIn=(b)=>{
    for(let k=0;k<24;k++){
      const x=rri(lrng,b.x+1,b.x+b.w-2), y=rri(lrng,b.y+1,b.y+b.h-2);
      if(at(x,y)===T.FLOOR && !usedTiles.has(x+','+y)) return {x,y};
    }
    return null;
  };
  // building interiors: container count scales with floor area
  for(const b of buildings){
    const z=zoneAtT(b.x+((b.w/2)|0), b.y+((b.h/2)|0));
    const n=Math.max(1, Math.min(5, Math.round(b.w*b.h/28)+rri(lrng,0,1)));
    for(let i=0;i<n;i++){
      const p=freeFloorIn(b); if(!p) break;
      addContainer(rweighted(lrng, z.def.contW)[0], p.x, p.y);
    }
  }
  // outdoor containers
  let placed=0, tries=0;
  while(placed<34 && tries++<1200){
    const x=rri(lrng,5,MW-6), y=rri(lrng,5,MH-6);
    if(at(x,y)!==T.GRASS) continue;
    const z=zoneAtT(x,y);
    if(addContainer(lrng()<0.8?'crate':rweighted(lrng,z.def.contW)[0], x,y)) placed++;
  }
  // rare nests
  placed=0; tries=0;
  while(placed<5 && tries++<600){
    const x=rri(lrng,6,MW-7), y=rri(lrng,6,MH-7);
    if(at(x,y)!==T.GRASS) continue;
    if(addContainer('nest',x,y)) placed++;
  }

  // ============ per-raid: zombie squads, composition & buffs per zone ============
  const enemySpawns = [];
  for(const z of zones){
    let sq=0, stries=0;
    while(sq<z.def.squadN && stries++<400){
      const x=rri(lrng,8,MW-8), y=rri(lrng,8,MH-8);
      if(zoneAtT(x,y)!==z) continue;
      const px=x*TILE, py=y*TILE;
      if(Math.hypot(px-playerSpawn.x, py-playerSpawn.y)<520) continue;
      const squad=rpick(lrng, z.def.squads);
      for(const type of squad)
        enemySpawns.push({type, x:px+rr(lrng,-70,70), y:py+rr(lrng,-70,70),
                          hpMul:z.def.buff.hp, dmgMul:z.def.buff.dmg});
      sq++;
    }
  }

  return {t, w:MW, h:MH, zones, zmap, buildings, containers, extractions,
          playerSpawn, enemySpawns, stations:[]};
}

// zone lookup by pixel position (null in the base, which has no zones)
function zoneAt(world, px, py){
  if(!world.zmap) return null;
  const tx=Math.max(0,Math.min(world.w-1,Math.floor(px/TILE)));
  const ty=Math.max(0,Math.min(world.h-1,Math.floor(py/TILE)));
  return world.zones[world.zmap[ty*world.w+tx]];
}

// ---------------------------------------------------------------------------
// the walkable home base: hatch room up top, main hall, sewer below
// ---------------------------------------------------------------------------
function genBaseWorld(){
  const w=34, h=26;
  const t=new Uint8Array(w*h).fill(T.WALL);
  const carve=(x1,y1,x2,y2,tt)=>{
    for(let y=y1;y<=y2;y++) for(let x=x1;x<=x2;x++) t[y*w+x]=tt;
  };
  carve(14,2,19,5,T.FLOOR);   // hatch room
  carve(15,5,18,7,T.FLOOR);   // corridor down
  carve(5,7,28,15,T.FLOOR);   // main hall
  carve(6,15,9,17,T.ROAD);    // stairwell to the sewer
  carve(3,17,13,23,T.ROAD);   // sewer room
  const S=TILE;
  const stations=[
    {type:'exit',   x:16.9*S, y:3.2*S,  label:'Deploy to Ground Zero'},
    {type:'stash',  x:7*S,    y:8.8*S,  label:'Open Stash'},
    {type:'bed',    x:7*S,    y:13.6*S, label:'Rest'},
    {type:'trader', x:26.5*S, y:8.8*S,  label:'Trade with Boris'},
    {type:'upgrade',x:26.5*S, y:13.6*S, label:'Use Workbench'},
    {type:'sewer',  x:8*S,    y:21*S,   label:'Kneel at the Chalk Circle'},
  ];
  return {t, w, h, stations, containers:[], extractions:[], enemySpawns:[],
          playerSpawn:{x:17*S, y:11*S}};
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
// collision & raycasting (all take the world so raid & base both work)
// ---------------------------------------------------------------------------
function tileAt(world,x,y){
  const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
  if(tx<0||ty<0||tx>=world.w||ty>=world.h) return T.ROCK;
  return world.t[ty*world.w+tx];
}
const solidAtPx  = (world,x,y)=> SOLID.has(tileAt(world,x,y));
const opaqueAtPx = (world,x,y)=> OPAQUE.has(tileAt(world,x,y));

// circle vs tile-grid: returns corrected {x,y}
function collideCircle(world,x,y,r){
  const minTx=Math.floor((x-r)/TILE), maxTx=Math.floor((x+r)/TILE);
  const minTy=Math.floor((y-r)/TILE), maxTy=Math.floor((y+r)/TILE);
  for(let ty=minTy;ty<=maxTy;ty++) for(let tx=minTx;tx<=maxTx;tx++){
    const tt=(tx<0||ty<0||tx>=world.w||ty>=world.h)?T.ROCK:world.t[ty*world.w+tx];
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
  for(let i=0;i<400;i++){
    if(tMaxX<tMaxY){ dist=tMaxX; tMaxX+=tDeltaX; tx+=stepX; }
    else{ dist=tMaxY; tMaxY+=tDeltaY; ty+=stepY; }
    if(dist>=maxDist) return maxDist;
    if(tx<0||ty<0||tx>=world.w||ty>=world.h) return dist;
    if(OPAQUE.has(world.t[ty*world.w+tx])) return dist;
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
// terrain rendering — the map is far too big for one canvas, so tiles are
// rendered into 512px chunks on demand and kept in a small LRU cache
// ---------------------------------------------------------------------------
const CHUNK_T=16, CHUNK_PX=CHUNK_T*TILE, CHUNK_CACHE_MAX=60;

function createTerrain(world){ return {world, cache:new Map()}; }

function terrainChunk(tr,cx,cy){
  const key=cx+'_'+cy;
  let cv=tr.cache.get(key);
  if(cv){ tr.cache.delete(key); tr.cache.set(key,cv); return cv; } // LRU touch
  cv=document.createElement('canvas');
  cv.width=CHUNK_PX; cv.height=CHUNK_PX;
  const c=cv.getContext('2d');
  const x0=cx*CHUNK_T, y0=cy*CHUNK_T;
  const xEnd=Math.min(x0+CHUNK_T, tr.world.w), yEnd=Math.min(y0+CHUNK_T, tr.world.h);
  for(let ty=y0;ty<yEnd;ty++) for(let tx=x0;tx<xEnd;tx++)
    drawTileArt(c, tr.world, tx, ty, (tx-x0)*TILE, (ty-y0)*TILE);
  tr.cache.set(key,cv);
  if(tr.cache.size>CHUNK_CACHE_MAX){
    const oldest=tr.cache.keys().next().value;
    tr.cache.delete(oldest);
  }
  return cv;
}

function drawTerrain(tr, c, x0,y0,x1,y1){
  const cols=Math.ceil(tr.world.w/CHUNK_T), rows=Math.ceil(tr.world.h/CHUNK_T);
  const c0=Math.max(0,Math.floor(x0/CHUNK_PX)), c1=Math.min(cols-1,Math.floor(x1/CHUNK_PX));
  const r0=Math.max(0,Math.floor(y0/CHUNK_PX)), r1=Math.min(rows-1,Math.floor(y1/CHUNK_PX));
  for(let cy=r0;cy<=r1;cy++) for(let cx=c0;cx<=c1;cx++)
    c.drawImage(terrainChunk(tr,cx,cy), cx*CHUNK_PX, cy*CHUNK_PX);
}

// per-tile art. Deterministic per-tile rng so chunks look identical no matter
// when they're (re)rendered. Grass palette comes from the tile's zone.
function drawTileArt(c, world, x, y, px, py){
  const tt=world.t[y*world.w+x];
  const drng=mulberry32((x*73856093) ^ (y*19349663) ^ 0x9e3779b9);
  const z=world.zmap ? world.zones[world.zmap[y*world.w+x]] : null;
  const gA=z?z.def.grass[0]:'#36462f', gB=z?z.def.grass[1]:'#3d4d35';
  let base=gA;
  if(tt===T.ROAD) base='#454139'; else if(tt===T.FLOOR) base='#524334';
  else if(tt===T.WALL) base='#262a33';
  c.fillStyle=base; c.fillRect(px,py,TILE,TILE);
  if(tt===T.GRASS||tt===T.BUSH||tt===T.TREE){
    c.fillStyle=drng()<0.5?gB:gB+'88';
    c.fillRect(px+drng()*24, py+drng()*24, 5,5);
    c.fillStyle='#ffffff0a'; c.fillRect(px+drng()*24, py+drng()*24, 4,4);
  }
  if(tt===T.ROAD){
    c.fillStyle='#4f4b43'; c.fillRect(px+drng()*24,py+drng()*24,6,3);
    c.fillStyle='#3c3931'; c.fillRect(px+drng()*22,py+drng()*22,8,4);
  }
  if(tt===T.FLOOR){
    c.strokeStyle='#00000022'; c.strokeRect(px+.5,py+.5,TILE,TILE);
    c.fillStyle='#5c4b3533'; c.fillRect(px,py+(x%2)*16,TILE,4);
  }
  if(tt===T.WALL){
    c.fillStyle='#333846'; c.fillRect(px,py,TILE,TILE-6);
    c.fillStyle='#3f4555'; c.fillRect(px,py,TILE,4);
    c.strokeStyle='#00000044'; c.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
  }
  if(tt===T.TREE){
    c.fillStyle='#00000033'; c.beginPath(); c.ellipse(px+18,py+20,13,9,0,0,7); c.fill();
    c.fillStyle='#243d26'; c.beginPath(); c.arc(px+16,py+14,13,0,7); c.fill();
    c.fillStyle='#31512e'; c.beginPath(); c.arc(px+13,py+11,9,0,7); c.fill();
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
    c.fillStyle=z&&z.def.crops?'#6b6b2e':'#3b5c35';
    c.beginPath(); c.arc(px+12,py+18,8,0,7); c.arc(px+21,py+14,7,0,7); c.fill();
  }
}

function prerenderMinimap(world){
  const cv=document.createElement('canvas');
  cv.width=168; cv.height=168;
  const c=cv.getContext('2d'), s=168/world.w;
  const cols={[T.ROAD]:'#454139',[T.FLOOR]:'#524334',[T.WALL]:'#657084',
              [T.TREE]:'#1c301f',[T.ROCK]:'#4a505a',[T.FENCE]:'#4a3a26',[T.CRATE]:'#6a4f30'};
  for(let y=0;y<world.h;y++) for(let x=0;x<world.w;x++){
    const tt=world.t[y*world.w+x];
    if(tt===T.GRASS||tt===T.BUSH){
      const z=world.zmap?world.zones[world.zmap[y*world.w+x]]:null;
      c.fillStyle=z?z.def.grass[0]:'#283a25';
    }else c.fillStyle=cols[tt]||'#000';
    c.fillRect(x*s,y*s,s+0.6,s+0.6);
  }
  return cv;
}
