// ============================================================================
// data.js — item definitions, loot tables, enemy archetypes, totems, trader
// ============================================================================
'use strict';

// ---------- items -----------------------------------------------------------
// type: gun | melee | ammo | food | drink | med | junk | valuable | feather
//       | att | totem | cash
const ITEMS = {
  // --- guns (dmg per bullet, rpm, spread deg, recoil deg/shot, noise px) ---
  makarov:   {name:'PM Duckarov', type:'gun', icon:'🔫', w:0.8, val:140, dmg:13, rpm:330, auto:false,
              mag:8,  reload:1.5, spread:3.2, recoil:1.6, ammo:'ammo_9', vel:920, range:520, noise:460,
              slots:['muzzle','optic'], desc:'A duck-surplus sidearm. Reliable, humble.'},
  scrapsmg:  {name:'Scrap SMG', type:'gun', icon:'🪛', w:2.2, val:320, dmg:8, rpm:640, auto:true,
              mag:24, reload:2.2, spread:6.5, recoil:0.9, ammo:'ammo_9', vel:880, range:420, noise:500,
              slots:['muzzle','optic','grip'], desc:'Welded together from bunker pipes. Sprays.'},
  pumpgun:   {name:'Pump Quacker', type:'gun', icon:'🔩', w:3.2, val:390, dmg:7, pellets:6, rpm:65, auto:false,
              mag:5,  reload:2.8, spread:9, recoil:5, ammo:'ammo_12', vel:820, range:300, noise:640,
              slots:['muzzle','grip'], desc:'Devastating up close. Politely useless at range.'},
  huntrifle: {name:'Hunting Rifle', type:'gun', icon:'🎯', w:3.5, val:540, dmg:48, rpm:45, auto:false,
              mag:4,  reload:2.6, spread:0.8, recoil:4, ammo:'ammo_762', vel:1400, range:950, noise:720,
              slots:['muzzle','optic'], desc:'One quack, one kill.'},
  akduckov:  {name:'AK-Duckov', type:'gun', icon:'💥', w:3.6, val:820, dmg:15, rpm:480, auto:true,
              mag:30, reload:2.4, spread:4.5, recoil:1.3, ammo:'ammo_762', vel:1100, range:640, noise:660,
              slots:['muzzle','optic','grip'], desc:'The classic. Never jams, never forgives.'},
  // --- melee (dmg, rate swings/s, range px, arc deg, stam cost) ---
  cleaver:   {name:'Rusty Cleaver', type:'melee', icon:'🔪', w:0.7, val:60, dmg:24, rate:2.1, mrange:56,
              arc:100, stam:12, desc:'Found in the bunker kitchen. Still sharp-ish.'},
  duckbat:   {name:'Duck Bat', type:'melee', icon:'🏏', w:1.4, val:160, dmg:38, rate:1.3, mrange:72,
              arc:120, stam:18, desc:'Regulation size. Non-regulation dents.'},
  // --- ammo ---
  ammo_9:    {name:'9mm Rounds', type:'ammo', icon:'🔸', w:0.012, val:2, stack:40, desc:'Pistol & SMG food.'},
  ammo_12:   {name:'12g Shells', type:'ammo', icon:'🔻', w:0.045, val:5, stack:20, desc:'For the Pump Quacker.'},
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
  soda:      {name:'Duck Cola', type:'drink', icon:'🥤', w:0.4, val:20, stack:3, use:1.0, hyd:28, energy:6,
              desc:'+28 hydration, +6 energy. Fizzy.'},
  // --- junk / materials ---
  scrap:     {name:'Scrap Metal', type:'junk', icon:'🔩', w:0.5, val:15, stack:10, desc:'Base building material.'},
  wires:     {name:'Copper Wires', type:'junk', icon:'🧵', w:0.2, val:22, stack:10, desc:'Base building material.'},
  spoon:     {name:'Bent Spoon', type:'junk', icon:'🥄', w:0.1, val:8, stack:10, desc:'Iconic. Worthless. Iconic.'},
  tape:      {name:'Duct Tape', type:'junk', icon:'⚫', w:0.2, val:30, stack:5, desc:'Fixes 60% of everything.'},
  // --- valuables ---
  goldegg:   {name:'Golden Egg', type:'valuable', icon:'🥚', w:0.4, val:500, rare:true, desc:'Heavy. Shiny. Sell it.'},
  watch:     {name:'Old Watch', type:'valuable', icon:'⌚', w:0.1, val:150, desc:'Still ticking.'},
  figurine:  {name:'Duck Figurine', type:'valuable', icon:'🦆', w:0.2, val:230, rare:true, desc:'Limited edition.'},
  // --- feathers / cash ---
  feather:   {name:'Fading Feather', type:'feather', icon:'🪶', w:0.05, val:25, stack:20,
              desc:'Sacrifice 8 at the Sewer Circle for a random Totem.'},
  cash:      {name:'Cash', type:'cash', icon:'💵', w:0, val:1, stack:9999,
              desc:'Converted to bunker funds on extraction. Lost like anything else if you die.'},
  // --- attachments ---
  silencer:  {name:'Silencer', type:'att', icon:'🔕', w:0.4, val:210, slot:'muzzle',
              mods:{noiseMul:0.25, spreadMul:0.9}, desc:'Muzzle. Noise −75%. Ducks hear nothing.'},
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
  t_plume:   {name:'Totem: Plume', type:'totem', icon:'🎐', w:0.2, val:350, rare:true,
              eff:{featherMul:2}, desc:'Ducks drop twice the feathers.'},
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
  duck: {rolls:[2,3], list:[
    ['cash',26,8,40],['ammo_9',16,5,12],['ammo_12',7,2,5],['ammo_762',9,4,10],['bread',9,1,1],
    ['soda',8,1,1],['bandage',7,1,1],['spoon',6,1,1],['scrap',8,1,2],['choc',5,1,1],
  ]},
};

// ---------- enemies ----------------------------------------------------------
// ranged enemies fire simplified "weapons" defined inline
const ENEMY_DEFS = {
  scav:    {name:'Scav Duck',    hp:45,  speed:95,  r:13, vision:300, fov:140, color:'#e8d9a0',
            atk:{kind:'gun', dmg:7,  rof:5.5, burst:3, pause:1.1, spread:7, range:340, vel:780, noise:420},
            gunDrop:['makarov',0.30], xp:1},
  shotgun: {name:'Shotgun Duck', hp:65,  speed:85,  r:14, vision:280, fov:140, color:'#e8f0f2',
            atk:{kind:'gun', dmg:6, pellets:5, rof:0.8, burst:1, pause:1.4, spread:11, range:230, vel:700, noise:600},
            gunDrop:['pumpgun',0.22], xp:2},
  heavy:   {name:'Heavy Duck',   hp:130, speed:72,  r:16, vision:320, fov:150, color:'#9aa8b8', armor:0.35,
            atk:{kind:'gun', dmg:10, rof:7, burst:4, pause:1.3, spread:6, range:400, vel:900, noise:600},
            gunDrop:['akduckov',0.18], xp:4},
  feral:   {name:'Feral Duck',   hp:38,  speed:175, r:12, vision:340, fov:170, color:'#d98a57',
            atk:{kind:'melee', dmg:14, rof:1.1, range:44},
            gunDrop:null, xp:1},
};
// squad templates rolled per spawn point
const SQUADS = [
  ['scav','scav'], ['scav','scav','scav'], ['scav','shotgun'], ['shotgun','scav','scav'],
  ['heavy','scav'], ['feral','feral'], ['feral','scav'], ['heavy'], ['shotgun','shotgun'],
];

// ---------- totem gacha ------------------------------------------------------
const GACHA = [ ['t_sturdy',28], ['t_swift',24], ['t_owl',20], ['t_vamp',14], ['t_plume',14] ];
const GACHA_COST = 8; // fading feathers

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
  dog3:   {name:'Reinforced Dog Pouch', icon:'🐕',
           desc:'A third safe slot on your loyal companion.',
           cash:750, mats:{wires:6}},
};

// ---------- starter kit ------------------------------------------------------
function starterSave(){
  const inv = new Array(22).fill(null);
  inv[0]={id:'ammo_9',q:24}; inv[1]={id:'bandage',q:2}; inv[2]={id:'water',q:1}; inv[3]={id:'bread',q:1};
  return {
    ver:1, cash:150,
    stash:new Array(48).fill(null),
    inv,
    eq:{g1:{id:'makarov',q:1,ammo:8,att:{}}, g2:null, melee:{id:'cleaver',q:1}, t1:null, t2:null},
    dog:[null,null], dogSlots:2,
    upgrades:{}, corpse:null,
    stats:{raids:0, extracts:0, deaths:0, kills:0},
  };
}
