// ============================================================================
// data.js — item definitions, loot tables, enemy archetypes, crafting benches
// ============================================================================
'use strict';

// ---------- items -----------------------------------------------------------
// type: gun | melee | ammo | food | drink | med | junk | valuable | feather
//       | att | totem
// ONE-SHOT META (this branch): every gun kills in a single hit — dmg is set
// beyond any buffed zombie's hp even through armor and range falloff. The
// balance lives in magazine size, fire rate, reload, spread and noise.
const ITEMS = {
  // --- guns (one-shot dmg, rpm, spread deg, recoil deg/shot, noise px) ---
  rustpistol:{name:'Rust Pistol', type:'gun', icon:'⚙️', w:0.5, val:0, dmg:999, rpm:280, auto:false,
              mag:4,  reload:1.3, spread:4.5, recoil:1.5, ammo:null, inf:true, vel:850, range:440, noise:440,
              slots:[], desc:'Bunker-issue sidearm. Forges its own rounds — four in the mag, then a ' +
              'long lonely reload. Never leaves you, even in death.'},
  makarov:   {name:'PM Makarov', type:'gun', icon:'🔫', w:0.8, val:140, dmg:999, rpm:330, auto:false,
              mag:5,  reload:1.5, spread:3.2, recoil:1.6, ammo:'ammo_9', vel:920, range:520, noise:460,
              slots:['muzzle','optic'], desc:'A proper sidearm. Five rounds, five bodies — if you aim.'},
  scrapsmg:  {name:'Scrap SMG', type:'gun', icon:'🪛', w:2.2, val:320, dmg:999, rpm:640, auto:true,
              mag:10, reload:2.2, spread:6.5, recoil:0.9, ammo:'ammo_9', vel:880, range:420, noise:500,
              slots:['muzzle','optic','grip'], desc:'Welded together from bunker pipes. Ten rounds go fast.'},
  pumpgun:   {name:'Pump Shotgun', type:'gun', icon:'🔩', w:3.2, val:390, dmg:999, pellets:6, rpm:65, auto:false,
              mag:2,  reload:2.8, spread:9, recoil:5, ammo:'ammo_12', vel:820, range:300, noise:640,
              slots:['muzzle','grip'], desc:'Two shells. Each pellet drops a zombie — crowd eraser up close.'},
  huntrifle: {name:'Hunting Rifle', type:'gun', icon:'🎯', w:3.5, val:540, dmg:999, rpm:45, auto:false,
              mag:2,  reload:2.6, spread:0.8, recoil:4, ammo:'ammo_762', vel:1400, range:950, noise:720,
              slots:['muzzle','optic'], desc:'One shot, one kill. Two, then you reload.'},
  ak_rustov:  {name:'AK Rustov', type:'gun', icon:'💥', w:3.6, val:820, dmg:999, rpm:480, auto:true,
              mag:12, reload:2.4, spread:4.5, recoil:1.3, ammo:'ammo_762', vel:1100, range:640, noise:660,
              slots:['muzzle','optic','grip'], desc:'The classic. A dozen guaranteed kills per mag.'},
  // --- melee (dmg, rate swings/s, range px, arc deg, stam cost) ---
  cleaver:   {name:'Rusty Cleaver', type:'melee', icon:'🔪', w:0.7, val:60, dmg:24, rate:2.1, mrange:56,
              arc:100, stam:12, desc:'Found in the bunker kitchen. Still sharp-ish.'},
  nailbat:   {name:'Nail Bat', type:'melee', icon:'🏏', w:1.4, val:160, dmg:38, rate:1.3, mrange:72,
              arc:120, stam:18, desc:'Regulation size. Non-regulation nails.'},
  // --- ammo ---
  ammo_9:    {name:'9mm Rounds', type:'ammo', icon:'🔸', w:0.012, val:2, stack:40, desc:'Pistol & SMG food.'},
  ammo_12:   {name:'12g Shells', type:'ammo', icon:'🔻', w:0.045, val:5, stack:20, desc:'For the Pump Shotgun.'},
  ammo_762:  {name:'7.62 Rounds', type:'ammo', icon:'🔶', w:0.02, val:4, stack:40, desc:'Rifle rounds.'},
  // --- meds (heal HP) ---
  bandage:   {name:'Bandage', type:'med', icon:'🩹', w:0.1, val:35, stack:5, use:1.6, hp:25,
              desc:'+25 HP.'},
  medkit:    {name:'Field Medkit', type:'med', icon:'💊', w:0.6, val:130, use:3.5, hp:60,
              desc:'+60 HP.'},
  // --- food (small HP) ---
  bread:     {name:'Stale Bread', type:'food', icon:'🍞', w:0.3, val:18, stack:3, use:1.5, hp:12,
              desc:'+12 HP. Crunchy in the wrong way.'},
  beans:     {name:'Canned Beans', type:'food', icon:'🥫', w:0.5, val:32, use:2.0, hp:28,
              desc:'+28 HP. The extraction classic.'},
  choc:      {name:'Chocolate Bar', type:'food', icon:'🍫', w:0.1, val:25, stack:4, use:1.0, hp:8,
              desc:'+8 HP, fast.'},
  // --- drink (recharge shield) ---
  water:     {name:'Shield Cell', type:'drink', icon:'🔋', w:0.6, val:24, use:1.4, shield:40,
              desc:'+40 shield. Snaps into your rig.'},
  soda:      {name:'Bunker Cola', type:'drink', icon:'🥤', w:0.4, val:20, stack:3, use:1.0, shield:22,
              desc:'+22 shield. Fizzy static.'},
  // --- junk / materials ---
  scrap:     {name:'Scrap Metal', type:'junk', icon:'🔩', w:0.5, val:15, stack:10,
              desc:'Base building material. Smash crate piles for more.'},
  wires:     {name:'Copper Wires', type:'junk', icon:'🧵', w:0.2, val:22, stack:10, desc:'Base building material.'},
  wood:      {name:'Timber', type:'junk', icon:'🪵', w:0.8, val:10, stack:10,
              desc:'Chopped from trees with a melee swing. The benches will want plenty.'},
  stone:     {name:'Stone', type:'junk', icon:'🪨', w:1.2, val:8, stack:10,
              desc:'Broken off rocks with a melee swing. Heavy, but walls need it.'},
  spoon:     {name:'Bent Spoon', type:'junk', icon:'🥄', w:0.1, val:8, stack:10, desc:'Iconic. Worthless. Iconic.'},
  tape:      {name:'Duct Tape', type:'junk', icon:'⚫', w:0.2, val:30, stack:5, desc:'Fixes 60% of everything.'},
  // --- valuables (no cash economy — these RECYCLE into crafting materials) ---
  goldbar:   {name:'Gold Bar', type:'valuable', icon:'🪙', w:0.6, val:500, rare:true,
              desc:'Dense and precious. Recycle it at the Workbench for a pile of materials.'},
  watch:     {name:'Old Watch', type:'valuable', icon:'⌚', w:0.1, val:150,
              desc:'Still ticking. Full of tiny parts — recycle for wires.'},
  figurine:  {name:'Cat Figurine', type:'valuable', icon:'🐈', w:0.2, val:230, rare:true,
              desc:'Limited edition. Recycles into good materials.'},
  // --- embers (feed the Equipment Bench: craft Totems) ---
  feather:   {name:'Fading Ember', type:'feather', icon:'🔥', w:0.05, val:25, stack:20,
              desc:'Still warm. The Equipment Bench forges Totems from these.'},
  // --- attachments ---
  silencer:  {name:'Silencer', type:'att', icon:'🔕', w:0.4, val:210, slot:'muzzle',
              mods:{noiseMul:0.25, spreadMul:0.9}, desc:'Muzzle. Noise −75%. The horde hears nothing.'},
  reddot:    {name:'Red Dot Sight', type:'att', icon:'🔴', w:0.3, val:150, slot:'optic',
              mods:{spreadMul:0.7}, desc:'Optic. Spread −30%.'},
  grip:      {name:'Rubber Grip', type:'att', icon:'🤝', w:0.3, val:110, slot:'grip',
              mods:{recoilMul:0.55}, desc:'Grip. Recoil −45%.'},
  // --- totems (equip 2 max) ---
  t_sturdy:  {name:'Totem: Sturdy II', type:'totem', icon:'🗿', w:0.2, val:400, rare:true,
              eff:{weightMul:1.3}, desc:'+30% carry weight.'},
  t_swift:   {name:'Totem: Swift', type:'totem', icon:'🌀', w:0.2, val:400, rare:true,
              eff:{speedMul:1.1}, desc:'+10% move speed.'},
  t_owl:     {name:'Totem: Night Owl', type:'totem', icon:'🦉', w:0.2, val:400, rare:true,
              eff:{visionMul:1.2}, desc:'+20% vision range.'},
  t_vamp:    {name:'Totem: Leech', type:'totem', icon:'🧛', w:0.2, val:450, rare:true,
              eff:{killHeal:5}, desc:'+5 HP per kill.'},
  t_plume:   {name:'Totem: Kindling', type:'totem', icon:'🎐', w:0.2, val:350, rare:true,
              eff:{featherMul:2}, desc:'Zombies drop twice the embers.'},
};

// ---------- loot tables ------------------------------------------------------
// entry: [id, weight, qmin, qmax]
const LOOT_TABLES = {
  crate: {rolls:[2,3], list:[
    ['scrap',25,1,3],['spoon',10,1,2],['tape',12,1,1],['wires',15,1,2],['bread',9,1,1],
    ['soda',8,1,1],['wood',12,1,2],['ammo_9',9,6,14],['choc',6,1,2],
  ]},
  locker: {rolls:[2,3], list:[
    ['wires',16,1,3],['ammo_9',10,8,18],['ammo_762',8,6,14],['bandage',12,1,2],['reddot',5,1,1],
    ['grip',5,1,1],['silencer',3,1,1],['watch',7,1,1],['scrapsmg',4,1,1],['makarov',6,1,1],
    ['tape',9,1,2],['water',8,1,1],
  ]},
  medbox: {rolls:[2,2], list:[
    ['bandage',40,1,2],['medkit',16,1,1],['water',22,1,1],['soda',12,1,1],['choc',10,1,1],
  ]},
  weaponbox: {rolls:[2,3], list:[
    ['makarov',18,1,1],['scrapsmg',14,1,1],['pumpgun',11,1,1],['huntrifle',7,1,1],['ak_rustov',4,1,1],
    ['silencer',6,1,1],['grip',8,1,1],['reddot',8,1,1],['ammo_9',20,10,24],['ammo_12',14,4,10],
    ['ammo_762',16,8,20],
  ]},
  nest: {rolls:[2,3], list:[
    ['goldbar',26,1,1],['figurine',20,1,1],['feather',30,2,4],['watch',13,1,1],
    // nests are where totems hide
    ['t_sturdy',4,1,1],['t_swift',4,1,1],['t_owl',3,1,1],['t_vamp',3,1,1],['t_plume',3,1,1],
  ]},
  zombie: {rolls:[2,3], list:[
    ['feather',20,1,2],['ammo_9',14,5,12],['ammo_12',6,2,5],['ammo_762',8,4,10],['bread',9,1,1],
    ['soda',8,1,1],['bandage',8,1,1],['spoon',6,1,1],['scrap',10,1,2],['wires',6,1,1],['choc',5,1,1],
  ]},
  elite: {rolls:[2,3], list:[
    ['feather',22,2,4],['scrap',16,2,4],['wires',12,1,3],['medkit',10,1,1],['ammo_762',10,6,14],
    ['reddot',5,1,1],['grip',5,1,1],['goldbar',6,1,1],['bandage',10,1,2],
  ]},
  boss: {rolls:[4,5], list:[
    ['ak_rustov',12,1,1],['huntrifle',10,1,1],['silencer',10,1,1],['reddot',8,1,1],['grip',8,1,1],
    ['medkit',12,1,2],['goldbar',12,1,2],['scrap',10,3,6],['wires',9,2,5],['feather',10,3,6],
  ]},
};

// ---------- time of day (rolled per raid) -------------------------------------
// night = darker, faster spawns, more elites. dusk sits between.
const TOD_ROLL = [['day',46],['dusk',30],['night',24]];
const TOD = {
  day:  {label:'☀ DAY',   overlay:null,                 spawnMul:1.0,  elite:0.04, tint:null,
         toast:'☀ Daytime. The horde is thinner in the light.'},
  dusk: {label:'🌆 DUSK',  overlay:'rgba(70,34,54,0.20)', spawnMul:0.85, elite:0.10,
         tint:'rgba(120,60,40,0.05)',
         toast:'🌆 Dusk — elevated threat. Elites stir.'},
  night:{label:'🌙 NIGHT', overlay:'rgba(8,12,38,0.46)',  spawnMul:0.68, elite:0.18,
         tint:'rgba(30,40,90,0.06)',
         toast:'🌙 Nightfall — the horde is fierce, and elites roam. Extract before it costs you.'},
};

// ---------- enemies: the infected --------------------------------------------
// atk.kind 'melee' = lunge on contact; 'gun' = ranged (Spitter lobs acid globs)
const ENEMY_DEFS = {
  shambler:{name:'Shambler', hp:60,  speed:55,  r:13, vision:260, fov:140, color:'#7da05a',
            atk:{kind:'melee', dmg:12, rof:1.0, range:40}, gunDrop:['makarov',0.10], xp:1,
            groan:'Slow, stubborn, everywhere.'},
  runner:  {name:'Runner',   hp:35,  speed:152, r:12, vision:330, fov:150, color:'#c08a5a',
            atk:{kind:'melee', dmg:10, rof:1.4, range:40}, gunDrop:null, xp:1,
            groan:'Faster than your walk. Slower than your sprint. Plan accordingly.'},
  spitter: {name:'Spitter',  hp:45,  speed:70,  r:13, vision:300, fov:140, color:'#9ab84a',
            atk:{kind:'gun', dmg:12, rof:0.7, burst:1, pause:1.2, spread:5, range:340, vel:420,
                 noise:260, acid:true}, gunDrop:null, xp:2,
            groan:'Keeps its distance and hurls acid.'},
  brute:   {name:'Brute',    hp:220, speed:60,  r:19, vision:280, fov:120, color:'#5a7a68', armor:0.3,
            atk:{kind:'melee', dmg:30, rof:0.6, range:54}, gunDrop:['pumpgun',0.20], xp:4,
            groan:'A wall of rot. Do not let it corner you.'},
  // boss — guards the red giant building. Immune to one-shot (dmgCap clamps
  // each hit), so it takes a full magazine or two. Slams the ground for AoE.
  titan:   {name:'Rotting Titan', hp:820, speed:46, r:31, vision:360, fov:180, color:'#6b7f56',
            armor:0.35, dmgCap:34, boss:true, xp:60,
            atk:{kind:'melee', dmg:52, rof:0.7, range:74},
            slam:{cd:3.2, range:150, dmg:40, windup:0.7},
            groan:'It should not be able to stand. It stands anyway.'},
};
// elites: a runtime upgrade applied to a normal spawn (mostly at night).
// Bigger, tougher, one-shot-immune, and worth extra loot.
const ELITE = {hpMul:3.2, rMul:1.28, dmgCap:26, dmgMul:1.4, speedMul:1.05};
// ---------- zones -------------------------------------------------------------
// The map is carved into Voronoi zones, tiered by distance from the spawn and
// color-coded on the HUD: GREEN (tier 1) → YELLOW (tier 2) → RED (tier 3).
//   green  : smaller buildings, base enemy density, base spawn rate
//   yellow : medium buildings, more enemies, faster in-zone spawn rate
//   red    : ONE very large building, most enemies, rare loot & harder foes
// Fields: bld sizes (giant:true → a single oversized structure), startE = how
// many zombies pre-placed in this zone, spawnMul = in-zone ground-spawn speed
// (lower = faster), rare = extra rare-loot roll in every container.
const ZONE_DEFS = {
  // ---- GREEN / tier 1 : small buildings ----
  outskirts:{name:'The Outskirts', tier:1, grass:['#36462f','#3d4d35'],
    scatter:{tree:0.020,bush:0.014,rock:0.004,crate:0.003}, crops:false, fences:3,
    bld:{n:6, wMin:9,wMax:14, hMin:7,hMax:11}, startE:11, spawnMul:1.0,
    contW:[['crate',55],['locker',20],['medbox',15],['weaponbox',10]],
    mats:[['scrap',20,1,2],['spoon',14,1,2],['bread',12,1,1],['soda',10,1,1],
          ['ammo_9',10,4,10],['tape',8,1,1],['wood',12,1,2]],
    squads:[['shambler'],['shambler','shambler'],['runner'],['shambler','runner']],
    buff:{hp:1,dmg:1}},
  farm:{name:'Rotfield Farms', tier:1, grass:['#4a4d2e','#585c37'],
    scatter:{tree:0.008,bush:0.008,rock:0.003,crate:0.003}, crops:true, fences:9,
    bld:{n:6, wMin:10,wMax:15, hMin:8,hMax:12}, startE:11, spawnMul:1.0,
    contW:[['crate',55],['locker',20],['medbox',15],['weaponbox',10]],
    mats:[['beans',18,1,1],['bread',16,1,2],['water',14,1,1],['choc',10,1,2],
          ['soda',10,1,1],['scrap',8,1,2],['wood',10,1,2]],
    squads:[['shambler','shambler'],['shambler','shambler','shambler'],
            ['runner','shambler'],['runner','runner']],
    buff:{hp:1,dmg:1}},
  // ---- YELLOW / tier 2 : medium buildings, more & faster enemies ----
  forest:{name:'Whispering Pines', tier:2, grass:['#2c4029','#33482f'],
    scatter:{tree:0.085,bush:0.030,rock:0.006,crate:0.001}, crops:false, fences:0,
    bld:{n:4, wMin:14,wMax:20, hMin:10,hMax:15}, startE:17, spawnMul:0.8,
    contW:[['crate',50],['medbox',25],['locker',15],['weaponbox',10]],
    mats:[['feather',20,1,2],['choc',12,1,2],['bandage',12,1,1],['water',10,1,1],
          ['figurine',4,1,1],['wood',10,1,2]],
    squads:[['runner','runner'],['runner','runner','runner'],
            ['shambler','runner'],['spitter','runner']],
    buff:{hp:1.1,dmg:1.1}},
  town:{name:'Old Marrowtown', tier:2, grass:['#3d443a','#464d42'],
    scatter:{tree:0.006,bush:0.008,rock:0.003,crate:0.005}, crops:false, fences:4,
    bld:{n:4, wMin:15,wMax:22, hMin:11,hMax:16}, startE:17, spawnMul:0.8,
    contW:[['locker',35],['crate',30],['medbox',20],['weaponbox',15]],
    mats:[['wires',16,1,3],['watch',8,1,1],['figurine',5,1,1],['medkit',6,1,1],
          ['bandage',10,1,2],['soda',10,1,1],['wires',8,1,2],['goldbar',2,1,1]],
    squads:[['shambler','shambler','runner'],['spitter','shambler'],
            ['runner','runner','shambler'],['shambler','shambler','shambler','shambler']],
    buff:{hp:1.15,dmg:1.1}},
  // ---- RED / tier 3 : ONE giant building, most enemies, rare loot ----
  industrial:{name:'Rustworks Industrial', tier:3, grass:['#43413a','#4b4941'],
    scatter:{tree:0.004,bush:0.004,rock:0.008,crate:0.014}, crops:false, fences:5,
    bld:{n:1, giant:true, wMin:34,wMax:46, hMin:26,hMax:34}, startE:24, spawnMul:0.62, rare:true,
    contW:[['crate',35],['locker',30],['weaponbox',25],['medbox',10]],
    mats:[['scrap',22,2,4],['wires',18,1,3],['tape',12,1,2],['ammo_762',10,6,14],
          ['ammo_12',8,3,8],['grip',4,1,1],['stone',12,1,3]],
    squads:[['brute','shambler'],['spitter','spitter'],['brute','runner'],
            ['brute','shambler','spitter','runner']],
    buff:{hp:1.4,dmg:1.25}},
  military:{name:'Fort Cinder Depot', tier:3, grass:['#3a4534','#424d3b'],
    scatter:{tree:0.006,bush:0.006,rock:0.006,crate:0.009}, crops:false, fences:7,
    bld:{n:1, giant:true, wMin:32,wMax:44, hMin:24,hMax:32}, startE:24, spawnMul:0.62, rare:true,
    contW:[['weaponbox',45],['locker',30],['medbox',15],['crate',10]],
    mats:[['ammo_9',16,10,24],['ammo_762',16,8,20],['ammo_12',12,4,10],
          ['silencer',5,1,1],['reddot',6,1,1],['grip',6,1,1],['medkit',6,1,1],
          ['huntrifle',2,1,1],['ak_rustov',2,1,1],['wires',12,2,4]],
    squads:[['brute','brute'],['brute','spitter','shambler'],
            ['brute','spitter','spitter'],['brute','brute','runner','runner']],
    buff:{hp:1.5,dmg:1.35}},
};
// rare-loot table for tier-3 red zones (folded into each container ~35% of the time)
const RED_RARE = [['goldbar',6],['figurine',7],['t_sturdy',3],['t_swift',3],['t_owl',3],
  ['t_vamp',3],['t_plume',3],['medkit',9],['silencer',5],['reddot',5],['ak_rustov',3],['huntrifle',3]];
// zone types by distance from spawn (nearest → farthest)
const ZONE_ORDER = ['outskirts','farm','forest','town','forest','industrial','military'];

// ---------- resource nodes (mined with melee swings) --------------------------
// keyed by tile type; drops roll qmin..qmax, bonus is an extra-chance item
const NODE_DEFS = {
  [4/*T.TREE*/]:  {hp:50, name:'Tree',       drop:['wood',2,3],  color:'#8a6636', sfx:'chop'},
  [5/*T.ROCK*/]:  {hp:90, name:'Rock',       drop:['stone',2,3], color:'#8b93a5', sfx:'mine'},
  [7/*T.CRATE*/]: {hp:40, name:'Crate Pile', drop:['scrap',1,2], color:'#7a5c38', sfx:'chop',
                   bonus:['tape',0.3]},
};

// ---------- weather mutators (rolled per raid) ---------------------------------
const WEATHERS = [
  ['clear',55], ['rain',25], ['fog',20],
];
const WEATHER_FX = {
  clear:{vis:1,    enemyVis:1,    noise:1},
  rain: {vis:0.85, enemyVis:0.85, noise:0.72, label:'🌧 RAIN',
         toast:'🌧 Rain — sound is dampened, visibility down.'},
  fog:  {vis:0.60, enemyVis:0.70, noise:1, label:'🌫 FOG',
         toast:'🌫 Dense fog — your cone is short today. So is theirs.'},
};

// ---------- crafting benches (Arc-Raiders-style workshop) --------------------
// No cash, no trader. Each bench has a LEVEL you raise with materials; higher
// levels unlock higher-tier recipes. You craft everything from scavenged
// materials. The Workbench also hosts structural upgrades and the Recycler.
// recipe: {out, q, lvl, cost:{material:n}}  — craftable when bench.lvl >= lvl
const BENCH_DEFS = {
  medbay:  {icon:'🩺', name:'Med Bay', maxLvl:3,
    blurb:'Field medicine and shield tech. Level it to unlock better kit.',
    upCost:{2:{tape:4, wires:3, wood:4}, 3:{tape:6, wires:5, feather:2, stone:3}},
    recipes:[
      {out:'bandage', q:2, lvl:1, cost:{tape:2}},
      {out:'water',   q:1, lvl:1, cost:{wires:2, scrap:1}},   // Shield Cell
      {out:'soda',    q:2, lvl:2, cost:{wires:1, tape:1}},
      {out:'medkit',  q:1, lvl:2, cost:{tape:3, wires:2, scrap:1}},
      {out:'medkit',  q:3, lvl:3, cost:{tape:6, wires:4, feather:1}},
    ]},
  gunsmith:{icon:'🔫', name:'Gunsmith', maxLvl:3,
    blurb:'Ammunition, attachments and weapons. Level it to press bigger iron.',
    upCost:{2:{scrap:5, wires:4, wood:3}, 3:{scrap:8, wires:6, stone:4, feather:2}},
    recipes:[
      {out:'ammo_9',   q:12, lvl:1, cost:{scrap:1}},
      {out:'ammo_12',  q:6,  lvl:1, cost:{scrap:1, wires:1}},
      {out:'ammo_762', q:12, lvl:2, cost:{scrap:2}},
      {out:'grip',     q:1,  lvl:2, cost:{scrap:2, wires:1}},
      {out:'reddot',   q:1,  lvl:2, cost:{wires:2, scrap:1}},
      {out:'silencer', q:1,  lvl:3, cost:{wires:3, scrap:2, tape:1}},
      {out:'ak_rustov',q:1,  lvl:3, cost:{scrap:4, wires:3, tape:2, feather:1}},
    ]},
  equip:   {icon:'🎒', name:'Equipment Bench', maxLvl:3,
    blurb:'Forge Totems from Fading Embers. Level it for the potent ones.',
    upCost:{2:{wood:5, wires:3, scrap:3}, 3:{wood:8, stone:5, feather:3}},
    recipes:[
      {out:'t_swift',  q:1, lvl:1, cost:{feather:4, wires:2}},
      {out:'t_owl',    q:1, lvl:2, cost:{feather:5, wires:2, stone:1}},
      {out:'t_sturdy', q:1, lvl:2, cost:{feather:6, scrap:3}},
      {out:'t_vamp',   q:1, lvl:3, cost:{feather:8, scrap:2, wires:2}},
      {out:'t_plume',  q:1, lvl:3, cost:{feather:6, wood:3}},
    ]},
};

// structural, one-time upgrades — hosted on the Workbench, material cost only
const UPGRADE_DEFS = {
  stash2: {name:'Warehouse Expansion', icon:'🏗',
           desc:'Physically extends the stash room. +32 stash slots.',
           mats:{scrap:8, wood:8, stone:4}},
  pouch3: {name:'Reinforced Secure Pouch', icon:'🔒',
           desc:'A third secure slot. Whatever is inside always comes home.',
           mats:{wires:8, stone:6, feather:2}},
};

// Recycler: break an item down into crafting materials (returns [{id,q}...]).
// Guns/attachments/melee/valuables recycle; raw mats/ammo/food/meds/totems don't.
function recycleYield(slot){
  const d=ITEMS[slot.id], out=[];
  const add=(id,q)=>{ if(q>0) out.push({id,q}); };
  if(d.inf) return out; // the bunker pistol can't be scrapped
  if(d.type==='gun'){
    add('scrap',2); add('wires',1);
    if(slot.att) for(const k in slot.att){ // mods come back too
      const md=ITEMS[slot.att[k]];
      if(md.slot==='muzzle') add('wires',2); else add('wires',1);
    }
  }else if(d.type==='att'){ add('wires', d.slot==='muzzle'?2:1);
  }else if(d.type==='melee'){ add('scrap',1);
  }else if(d.type==='valuable'){
    if(slot.id==='goldbar'){ add('scrap',3); add('wires',3); add('feather',1); }
    else if(slot.id==='figurine'){ add('wires',3); add('scrap',1); }
    else { add('wires',2); } // watch
  }
  return out;
}
function isRecyclable(slot){ return slot && recycleYield(slot).length>0; }

// ---------- starter kit ------------------------------------------------------
const SAVE_VER = 4;
function freshBenches(){ return {medbay:1, gunsmith:1, equip:1}; }
function starterSave(){
  const inv = new Array(22).fill(null);
  inv[0]={id:'bandage',q:2}; inv[1]={id:'water',q:1}; inv[2]={id:'bread',q:1};
  return {
    ver:SAVE_VER,
    stash:new Array(48).fill(null),
    inv,
    eq:{g1:{id:'rustpistol',q:1,ammo:ITEMS.rustpistol.mag,att:{}}, g2:null, melee:{id:'cleaver',q:1}, t1:null, t2:null},
    pouch:[null,null], pouchSlots:2,
    upgrades:{}, benches:freshBenches(), corpse:null,
    stats:{raids:0, extracts:0, deaths:0, kills:0},
  };
}
// renamed item ids, applied across every save slot on migration
const ID_REMAP = {akduckov:'ak_rustov', duckbat:'nailbat', goldegg:'goldbar'};
function remapSlot(s){ if(s && ID_REMAP[s.id]) s.id=ID_REMAP[s.id]; return s; }
// migrate older saves in place; returns the save or null if unusable
function migrateSave(s){
  if(!s || !s.ver) return null;
  if(s.ver===1){
    s.ver=2;
    s.pouch=s.dog||[null,null]; s.pouchSlots=s.dogSlots||2;
    delete s.dog; delete s.dogSlots;
    if(s.upgrades && s.upgrades.dog3){ s.upgrades.pouch3=true; delete s.upgrades.dog3; }
  }
  if(s.ver===2){
    s.ver=3;
    s.corpse=null; // the overworld layout changed — old death sites no longer exist
  }
  if(s.ver===3){
    s.ver=4;
    delete s.cash;                 // cash economy removed
    s.benches=freshBenches();      // new crafting benches
    s.corpse=null;
    // scrub the old cash/duck items out of every slot
    const scrub=arr=>{ if(!arr) return; for(let i=0;i<arr.length;i++){
      if(arr[i] && arr[i].id==='cash') arr[i]=null; else remapSlot(arr[i]); } };
    scrub(s.inv); scrub(s.stash); scrub(s.pouch);
    if(s.eq) for(const k in s.eq){ if(s.eq[k] && s.eq[k].id==='cash') s.eq[k]=null; else remapSlot(s.eq[k]); }
  }
  return s.ver===SAVE_VER ? s : null;
}
