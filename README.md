# Escape from Claudov — 2D Prototype

A 2D, top-down, single-player **extraction looter-shooter prototype** inspired by
*Escape from Duckov* — the operator is the little orange Claude creature, and the
world above the bunker belongs to the zombie horde.

Pure HTML5 canvas + vanilla JS. **No build step, no dependencies.**

## Run it

Open `index.html` in any modern browser. That's it.

(Optionally serve it — `python3 -m http.server` — but `file://` works fine.
Progress saves to `localStorage`.)

## Controls

| Input | Action |
|---|---|
| `WASD` | Move |
| Mouse | Aim (360°) |
| `LMB` | Fire / melee swing |
| `Shift` | Sprint (drains stamina) |
| `E` | Search containers · use base stations |
| `Tab` | Backpack |
| `1` `2` `3` / wheel | Weapon slots (gun / gun / melee) |
| `R` | Reload |
| `F` | Quick-use first med item |
| `M` | Mute |
| `Esc` | Close panel / pause |

**Inventory:** drag to move · click = quick-transfer · right-click = equip/use ·
drop an attachment onto a gun to mod it · Alt+right-click a gun to strip mods ·
drag onto the world to drop items on the ground.

## The loop

1. **The Bunker** — a walkable home base. Walk up to a station and press `E`:
   - 📦 **Stash chest** — long-term storage
   - 🧔 **Boris the trader** — buy supplies, click your items to sell
   - 🔧 **Workbench** — base upgrades (stash expansion, third secure slot)
   - 🕯 **Chalk Circle** (down in the sewer) — sacrifice 8 Fading Embers for a
     random Totem
   - 🛏 **Bed** — rest, restore vitals
   - 🪜 **Ladder** — deploy to Ground Zero
2. **Ground Zero** — a 210×210-tile procedurally generated overworld carved
   into **7 zones** (Voronoi regions, persistent layout, loot & squads
   reshuffle each raid). Difficulty rises with distance from the hatch:

   | Zone | Tier | Signature |
   |---|---|---|
   | The Outskirts | 1 | easy pickings around the spawn |
   | Rotfield Farms | 1 | barns, crop rows, food |
   | Whispering Pines | 2 | dense forest, embers, runners |
   | Old Marrowtown | 2 | dense housing, cash & valuables |
   | Rustworks Industrial | 3 | huge warehouses, scrap/wires/tape |
   | Fort Cinder Depot | 3 | weapon cases, ammo, attachments |

   Tier-3 zombies hit harder and take more killing. The HUD shows the zone
   you're in; the minimap shows the zone palette.
3. **Loot & fight** — vision-cone fog of war: anything behind you or behind a
   wall is invisible. Zombies hear gunshots and come looking (silencers help).
4. **Know when you're made** — every zombie shows 💤 (oblivious), ❓ (searching)
   or ❗ (spotted you); the HUD chip tracks the horde overall (HIDDEN /
   SEARCHING / SPOTTED), and a red edge-of-screen ping fires when something you
   *can't see* has seen *you*.
5. **Watch your meters** — energy & hydration tick down; bleeding needs a
   bandage; too much weight makes you slow.
6. **Extract** at one of five marked zones before the **Purple Storm** hits at
   9:30 — or die and lose everything you carried.
7. **Corpse run** — your gear drops where you fell (✕ on the minimap). You get
   exactly one recovery chance; die again first and it's gone forever.
   Items in the **Secure Pouch** always come home (and weigh nothing), and the
   **⚙️ Rust Pistol** — the bunker-issue sidearm with unlimited self-forged
   ammo and no stopping power to speak of — never leaves you, even in death.

## The horde

| Type | Behaviour |
|---|---|
| 🧟 **Shambler** | Slow, sturdy, everywhere. Melee. |
| 🏃 **Runner** | Fragile but sprints at you the moment it sees you. |
| 🤮 **Spitter** | Keeps its distance and lobs acid globs. |
| 🪨 **Brute** | Armored wall of rot, hits like a truck. Drops the good loot. |

Zombies patrol → investigate noises → chase & attack on sight. Their loot
includes **Fading Embers** for the totem gacha.

## What's implemented (vs. the design spec)

- ✅ KBM twin-stick movement, sprint/stamina
- ✅ Vision cone + LOS fog of war (raycast, wall occlusion, near-radius)
- ✅ Enemy awareness feedback: per-zombie 💤/❓/❗ icons, HUD awareness chip,
  off-screen "spotted" pings
- ✅ Survival meters: energy, hydration, bleeding, encumbrance
- ✅ Slot + weight inventory (22-slot baseline), drag & drop, stacking
- ✅ Guaranteed fallback weapon: infinite-ammo Rust Pistol, kept through death
- ✅ 6 guns / 2 melee, per-weapon spread, recoil bloom, reload, damage falloff
- ✅ Drag-and-drop weapon modding (silencer / red dot / grip) in the inventory
- ✅ Zombie AI: patrol → investigate noise → combat, 4 archetypes
- ✅ 210×210 procedural overworld with 7 difficulty-tiered zones (materials,
  building sizes, squad composition & zombie buffs per zone), rendered via
  lazily-cached terrain chunks
- ✅ Loot containers with weighted tables + zone signature materials; corpse looting
- ✅ 5 extraction zones with channel timers
- ✅ Purple Storm timer (warn @7:00, hit @9:30, radiation DPS)
- ✅ Death → corpse persistence → one-chance recovery run
- ✅ Secure Pouch: death-proof, weightless slots (upgradeable to 3)
- ✅ Walkable physical bunker with interactive stations
- ✅ Totems (2 equip slots): carry weight, speed, vision, life-on-kill, embers
- ✅ localStorage save/continue (v1 saves migrate automatically)
- ✅ Synthesized sound effects (WebAudio, no assets)

**Not yet (future work):** skill trees/XP, multiple maps, day/night + night-only
elites, weather mutators, blueprints/crafting, room-by-room base *expansion*
visuals, armor/rigs, difficulty settings, autosave-restore menu.

## Code layout

```
index.html    markup + CSS (HUD, panels, station UI, screens)
js/data.js    item defs, loot tables, zombie archetypes, totems, trader, upgrades
js/world.js   zoned procedural map + bunker layout, collision, raycasting, chunked terrain
js/game.js    sim for raid & base: player, zombie AI, bullets, fog, storm, stations, sfx
js/ui.js      DOM UI: grids, drag & drop, tooltips, loot & station panels, HUD
js/main.js    boot, input, state machine (menu → base ⇄ raid), save/load + migration
```
