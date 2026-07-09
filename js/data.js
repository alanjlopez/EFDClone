// ============================================================================
// data.js — item definitions, loot tables, enemy archetypes, totems, trader
// ============================================================================
'use strict';

// ---------- items -----------------------------------------------------------
// type: gun | melee | ammo | food | drink | med | junk | valuable | feather
//       | att | totem | cash
const ITEMS = {
  // --- guns (dmg per bullet, rpm, spread deg, recoil deg/shot, noise px) ---
  rustpistol:{name:'Rust Pistol', type:'gun', icon:'⚙️', w:0.5, val:0, dmg:8, rpm:280, auto:false,
              mag:10, reload:1.3, spread:4.5, recoil:1.5, ammo:null, inf:true, vel:850, range:440, noise:440,
              slots:[], desc:'Bunker-issue sidearm. Forges its own rounds — unlimited ammo, underwhelming ' +
              'stopping power. Never leaves you, even in death.'},
  makarov:   {name:'PM Makarov', type:'gun', icon:'🔫', w:0.8, val:140, dmg:13, rpm:330, auto:false,
              mag:8,  reload:1.5, spread:3.2, recoil:1.6, ammo:'ammo_9', vel:920, range:520, noise:460,
              slots:['muzzle','optic'], desc:'A proper sidearm. Reliable, humble.'},
  scrapsmg:  {name:'Scrap SMG', type:'gun', icon:'🪛', w:2.2, val:320, dmg:8, rpm:640, auto:true,
              mag:24, reload:2.2, spread:6.5, recoil:0.9, ammo:'ammo_9', vel:880, range:420, noise:500,
              slots:['muzzle','optic','grip'], desc:'Welded together from bunker pipes. Sprays.'},
  pumpgun:   {name:'Pump Shotgun', type:'gun', icon:'🔩', w:3.2, val:390, dmg:7, pellets:6, rpm:65, auto:false,
              mag:5,  reload:2.8, spread:9, recoil:5, ammo:'ammo_12', vel:820, range:300, noise:640,
              slots:['muzzle','grip'], desc:'Devastating up close. Politely useless at range.'},
  huntrifle: {name:'Hunting Rifle', type:'gun', icon:'🎯', w:3.5, val:540, dmg:48, rpm:45, auto:false,
              mag:4,  reload:2.6, spread:0.8, recoil:4, ammo:'ammo_762', vel:1400, range:950, noise:720,
              slots:['muzzle','optic'], desc:'One shot, one kill.'},
  akduckov:  {name:'AK Rustov', type:'gun', icon:'💥', w:3.6, val:820, dmg:15, rpm:480, auto:true,
              mag:30, reload:2.4, spread:4.5, recoil:1.3, ammo:'ammo_762', vel:1100, range:640, noise:660,
              slots:['muzzle','optic','grip'], desc:'The classic. Never jams, never forgives.'},
  // --- melee (dmg, rate swings/s, range px, arc deg, stam cost) ---
  cleaver:   {name:'Rusty Cleaver', type:'melee', icon:'🔪', w:0.7, val:60, dmg:24, rate:2.1, mrange:56,
              arc:100, stam:12, desc:'Found in the bunker kitchen. Still sharp-ish.'},
  duckbat:   {name:'Nail Bat', type:'melee', icon:'🏏', w:1.4, val:160, dmg:38, rate:1.3, mrange:72,
              arc:120, stam:18, desc:'Regulation size. Non-regulation nails.'},
  // --- ammo ---
  ammo_9:    {name:'9mm Rounds', type:'ammo', icon:'🔸', w:0.012, val:2, stack:40, desc:'Pistol & SMG food.'},
  ammo_12:   {name:'12g Shells', type:'ammo', icon:'🔻', w:0.045, val:5, stack:20, desc:'For the Pump Shotgun.'},
  ammo_762:  {name:'7.62 Rounds', type:'ammo', icon:'🔶', w:0.02, val:4, stack:40, desc:'Rifle rounds.'},
  // --- meds ---
  bandage:   {name:'Bandage', type:'med', icon:'🩹', w:0.1, val:35, stack:5, use:2.0, hp:5, stopBleed:true,
              desc:'Stops bleeding. +5 HP.'},
  medkit:    {name:'Field Medkit', type:'med', icon:'💊', w:0.6, val:130, use:4.0, hp:60, stopBleed:true,
              desc:'Stops bleeding. +60 HP.'},
  // --- food / drink ---
  bread:     {name:'Stale Bread', type:'food', icon:'🍞', w:0.3, val:18, stack:3, use:1.5, energy:30,
              desc:'+30 energy. Crunchy in the wrong way.'},
  beans:     {name:'Canned Beans', type:'food', icon:'🥫', w:0.5, val:32, use:2.0, energy:55,
              desc:'+55 energy. The extraction classic.'},
  choc:      {name:'Chocolate Bar', type:'food', icon:'🍫', w:0.1, val:25, stack:4, use:1.0, energy:18,
              desc:'+18 energy, fast.'},
  water:     {name:'Water Bottle', type:'drink', icon:'💧', w:0.6, val:24, use:1.5, hyd:45,
              desc:'+45 hydration.'},
  soda:      {name:'Bunker Cola', type:'drink', icon:'🥤', w:0.4, val:20, stack:3, use:1.0, hyd:28, energy:6,
              desc:'+28 hydration, +6 energy. Fizzy.'},
  // --- junk / materials ---
  scrap:     {name:'Scrap Metal', type:'junk', icon:'🔩', w:0.5, val:15, stack:10, desc:'Base building material.'},
  wires:     {name:'Copper Wires', type:'junk', icon:'🧵', w:0.2, val:22, stack:10, desc:'Base building material.'},
  spoon:     {name:'Bent Spoon', type:'junk', icon:'🥄', w:0.1, val:8, stack:10, desc:'Iconic. Worthless. Iconic.'},
  tape:      {name:'Duct Tape', type:'junk', icon:'⚫', w:0.2, val:30, stack:5, desc:'Fixes 60% of everything.'},
  // --- valuables ---
  goldegg:   {name:'Golden Egg', type:'valuable', icon:'🥚', w:0.4, val:500, rare:true, desc:'Heavy. Shiny. Sell it.'},
  watch:     {name:'Old Watch', type:'valuable', icon:'⌚', w:0.1, val:150, desc:'Still ticking.'},
  figurine:  {name:'Cat Figurine', type:'valuable', icon:'🐈', w:0.2, val:230, rare:true, desc:'Limited edition.'},
  // --- embers / cash ---
  feather:   {name:'Fading Ember', type:'feather', icon:'🔥', w:0.05, val:25, stack:20,
              desc:'Still warm, whatever it was. Sacrifice 8 at the Chalk Circle for a random Totem.'},
  cash:      {name:'Cash', type:'cash', icon:'💵', w:0, val:1, stack:9999,
              desc:'Converted to bunker funds on extraction. Lost like anything else if you die.'},
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
    ['scrap',25,1,3],['spoon',12,1,2],['tape',10,1,1],['wires',15,1,2],['bread',9,1,1],
    ['soda',8,1,1],['cash',12,10,45],['ammo_9',9,6,14],['choc',6,1,2],
  ]},
  locker: {rolls:[2,3], list:[
    ['cash',16,20,80],['ammo_9',10,8,18],['ammo_762',8,6,14],['bandage',12,1,2],['reddot',5,1,1],
    ['grip',5,1,1],['silencer',3,1,1],['watch',7,1,1],['scrapsmg',4,1,1],['makarov',6,1,1],
    ['tape',9,1,2],['water',8,1,1],
  ]},
  medbox: {rolls:[2,2], list:[
    ['bandage',40,1,2],['medkit',16,1,1],['water',22,1,1],['soda',12,1,1],['choc',10,1,1],
  ]},
  weaponbox: {rolls:[2,3], list:[
    ['makarov',18,1,1],['scrapsmg',14,1,1],['pumpgun',11,1,1],['huntrifle',7,1,1],['akduckov',4,1,1],
    ['silencer',6,1,1],['grip',8,1,1],['reddot',8,1,1],['ammo_9',20,10,24],['ammo_12',14,4,10],
    ['ammo_762',16,8,20],
  ]},
  nest: {rolls:[2,3], list:[
    ['goldegg',28,1,1],['figurine',22,1,1],['feather',35,2,4],['cash',25,50,150],['watch',12,1,1],
  ]},
  zombie: {rolls:[2,3], list:[
    ['cash',26,8,40],['ammo_9',14,5,12],['ammo_12',6,2,5],['ammo_762',8,4,10],['bread',9,1,1],
    ['soda',8,1,1],['bandage',8,1,1],['spoon',6,1,1],['scrap',10,1,2],['wires',6,1,1],['choc',5,1,1],
  ]},
};

// ---------- enemies: the infected --------------------------------------------
// atk.kind 'melee' = lunge on contact; 'gun' = ranged (Spitter lobs acid globs)
const ENEMY_DEFS = {
  shambler:{name:'Shambler', hp:60,  speed:55,  r:13, vision:260, fov:140, color:'#7da05a',
            atk:{kind:'melee', dmg:12, rof:1.0, range:40}, gunDrop:['makarov',0.10], xp:1,
            groan:'Slow, stubborn, everywhere.'},
  runner:  {name:'Runner',   hp:35,  speed:185, r:12, vision:330, fov:150, color:'#c08a5a',
            atk:{kind:'melee', dmg:10, rof:1.4, range:40}, gunDrop:null, xp:1,
            groan:'It sprints. You should too.'},
  spitter: {name:'Spitter',  hp:45,  speed:70,  r:13, vision:300, fov:140, color:'#9ab84a',
            atk:{kind:'gun', dmg:12, rof:0.7, burst:1, pause:1.2, spread:5, range:340, vel:420,
                 noise:260, acid:true}, gunDrop:null, xp:2,
            groan:'Keeps its distance and hurls acid.'},
  brute:   {name:'Brute',    hp:220, speed:60,  r:19, vision:280, fov:120, color:'#5a7a68', armor:0.3,
            atk:{kind:'melee', dmg:30, rof:0.6, range:54}, gunDrop:['pumpgun',0.20], xp:4,
            groan:'A wall of rot. Do not let it corner you.'},
};
// ---------- zones -------------------------------------------------------------
// The map is carved into Voronoi zones. Difficulty (tier) rises with distance
// from the spawn. Each zone brings its own terrain, building sizes, signature
// materials (mats: extra loot rolled into every container) and zombie squads.
// scatter values are per-grass-tile probabilities; buff applies to zombies.
const ZONE_DEFS = {
  outskirts:{name:'The Outskirts', tier:1, grass:['#36462f','#3d4d35'],
    scatter:{tree:0.020,bush:0.014,rock:0.004,crate:0.003}, crops:false, fences:3,
    bld:{n:6, wMin:5,wMax:8, hMin:4,hMax:6},
    contW:[['crate',55],['locker',20],['medbox',15],['weaponbox',10]],
    mats:[['scrap',20,1,2],['spoon',14,1,2],['bread',12,1,1],['soda',10,1,1],
          ['ammo_9',10,4,10],['tape',8,1,1],['cash',12,5,25]],
    squads:[['shambler'],['shambler','shambler'],['runner'],['shambler','runner']],
    squadN:3, buff:{hp:1,dmg:1}},
  farm:{name:'Rotfield Farms', tier:1, grass:['#4a4d2e','#585c37'],
    scatter:{tree:0.008,bush:0.008,rock:0.003,crate:0.003}, crops:true, fences:9,
    bld:{n:7, wMin:8,wMax:15, hMin:6,hMax:10}, // barns
    contW:[['crate',55],['locker',20],['medbox',15],['weaponbox',10]],
    mats:[['beans',18,1,1],['bread',16,1,2],['water',14,1,1],['choc',10,1,2],
          ['soda',10,1,1],['scrap',8,1,2],['cash',8,5,30]],
    squads:[['shambler','shambler'],['shambler','shambler','shambler'],
            ['runner','shambler'],['runner','runner']],
    squadN:4, buff:{hp:1,dmg:1}},
  forest:{name:'Whispering Pines', tier:2, grass:['#2c4029','#33482f'],
    scatter:{tree:0.085,bush:0.030,rock:0.006,crate:0.001}, crops:false, fences:0,
    bld:{n:3, wMin:5,wMax:7, hMin:4,hMax:6}, // cabins
    contW:[['crate',50],['medbox',25],['locker',15],['weaponbox',10]],
    mats:[['feather',20,1,2],['choc',12,1,2],['bandage',12,1,1],['water',10,1,1],
          ['figurine',4,1,1],['cash',8,10,40]],
    squads:[['runner','runner'],['runner','runner','runner'],
            ['shambler','runner'],['spitter','runner']],
    squadN:5, buff:{hp:1.1,dmg:1.1}},
  town:{name:'Old Marrowtown', tier:2, grass:['#3d443a','#464d42'],
    scatter:{tree:0.006,bush:0.008,rock:0.003,crate:0.005}, crops:false, fences:4,
    bld:{n:13, wMin:7,wMax:13, hMin:5,hMax:10},
    contW:[['locker',35],['crate',30],['medbox',20],['weaponbox',15]],
    mats:[['cash',20,20,90],['watch',8,1,1],['figurine',5,1,1],['medkit',6,1,1],
          ['bandage',10,1,2],['soda',10,1,1],['wires',8,1,2],['goldegg',2,1,1]],
    squads:[['shambler','shambler','runner'],['spitter','shambler'],
            ['runner','runner','shambler'],['shambler','shambler','shambler','shambler']],
    squadN:6, buff:{hp:1.15,dmg:1.1}},
  industrial:{name:'Rustworks Industrial', tier:3, grass:['#43413a','#4b4941'],
    scatter:{tree:0.004,bush:0.004,rock:0.008,crate:0.014}, crops:false, fences:5,
    bld:{n:8, wMin:12,wMax:22, hMin:9,hMax:15}, // warehouses
    contW:[['crate',35],['locker',30],['weaponbox',25],['medbox',10]],
    mats:[['scrap',22,2,4],['wires',18,1,3],['tape',12,1,2],['ammo_762',10,6,14],
          ['ammo_12',8,3,8],['grip',4,1,1],['cash',10,20,70]],
    squads:[['brute','shambler'],['spitter','spitter'],['brute','runner'],
            ['shambler','shambler','spitter','runner']],
    squadN:6, buff:{hp:1.3,dmg:1.2}},
  military:{name:'Fort Cinder Depot', tier:3, grass:['#3a4534','#424d3b'],
    scatter:{tree:0.006,bush:0.006,rock:0.006,crate:0.009}, crops:false, fences:7,
    bld:{n:7, wMin:9,wMax:18, hMin:7,hMax:12},
    contW:[['weaponbox',45],['locker',30],['medbox',15],['crate',10]],
    mats:[['ammo_9',16,10,24],['ammo_762',16,8,20],['ammo_12',12,4,10],
          ['silencer',5,1,1],['reddot',6,1,1],['grip',6,1,1],['medkit',6,1,1],
          ['huntrifle',2,1,1],['akduckov',2,1,1],['cash',10,30,100]],
    squads:[['brute','brute'],['brute','spitter','shambler'],
            ['spitter','spitter','runner'],['brute','runner','runner']],
    squadN:6, buff:{hp:1.35,dmg:1.3}},
};
// zone types by distance from spawn (nearest → farthest)
const ZONE_ORDER = ['outskirts','farm','forest','town','forest','industrial','military'];

// ---------- totem gacha ------------------------------------------------------
const GACHA = [ ['t_sturdy',28], ['t_swift',24], ['t_owl',20], ['t_vamp',14], ['t_plume',14] ];
const GACHA_COST = 8; // fading embers

// ---------- trader -----------------------------------------------------------
const TRADER_STOCK = [
  {id:'ammo_9',  q:30, price:70},
  {id:'ammo_12', q:10, price:60},
  {id:'ammo_762',q:30, price:130},
  {id:'bandage', q:2,  price:70},
  {id:'medkit',  q:1,  price:180},
  {id:'water',   q:1,  price:35},
  {id:'beans',   q:1,  price:45},
  {id:'bread',   q:1,  price:28},
  {id:'makarov', q:1,  price:260},
  {id:'pumpgun', q:1,  price:680},
  {id:'grip',    q:1,  price:200},
  {id:'reddot',  q:1,  price:270},
  {id:'silencer',q:1,  price:390},
];

// ---------- bunker upgrades --------------------------------------------------
const UPGRADE_DEFS = {
  stash2: {name:'Warehouse Expansion', icon:'🏗',
           desc:'Physically extends the stash room. +32 stash slots.',
           cash:500, mats:{scrap:8}},
  pouch3: {name:'Reinforced Secure Pouch', icon:'🔒',
           desc:'A third secure slot. Whatever is inside always comes home.',
           cash:750, mats:{wires:6}},
};

// ---------- starter kit ------------------------------------------------------
const SAVE_VER = 3;
function starterSave(){
  const inv = new Array(22).fill(null);
  inv[0]={id:'bandage',q:2}; inv[1]={id:'water',q:1}; inv[2]={id:'bread',q:1};
  return {
    ver:SAVE_VER, cash:150,
    stash:new Array(48).fill(null),
    inv,
    eq:{g1:{id:'rustpistol',q:1,ammo:10,att:{}}, g2:null, melee:{id:'cleaver',q:1}, t1:null, t2:null},
    pouch:[null,null], pouchSlots:2,
    upgrades:{}, corpse:null,
    stats:{raids:0, extracts:0, deaths:0, kills:0},
  };
}
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
  return s.ver===SAVE_VER ? s : null;
}
