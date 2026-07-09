# Escape from Claudov — 2D Prototype

> **Branch: `one-shot-horde-mode`** — an experimental ruleset on top of the main
> prototype:
> - Every gun kills in one shot but magazines are tiny (2–12 rounds).
> - The map starts half-empty and zombies **claw out of the ground** around you,
>   slowly ramping from one every ~9s to one every ~2.2s by minute 8 (extraction
>   alarms triple the rate); storm at 9:00 for a 5–10 minute run.
> - Taking items out of containers channels a short loot timer per item.
> - **Vitals are just HP, Shield and Stamina** — no bleeding, hunger or thirst.
>   Shield soaks damage before HP and regenerates after a lull; meds/food heal
>   HP, drink/cells recharge shield.
> - **Bigger buildings**, with ~30% rolling oversized into multi-room structures
>   partitioned by interior walls and connected by doorways.
> - **Gunshots carry ~2× farther**, pulling zombies from a wide radius.
> - **No extraction near the drop** — you must travel to one of four remote
>   exits.
> - **The bunker is a single open room** with every station along the walls.

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
   - 🔧 **General Workbench** — base upgrades (cost cash + scrap/wood/stone)
   - 🚧 **Gunsmith · Equipment Bench · Med Bay** — under-construction
     placeholders in the workshop & med bay rooms, each listing its planned
     services
   - 🛏 **Bed** — rest, restore vitals
   - 🪜 **Ladder** — deploy to Ground Zero
2. **Ground Zero** — a 210×210-tile procedurally generated overworld,
   **regenerated fresh every single run**, carved into **7 zones** (Voronoi
   regions). Difficulty rises with distance from the hatch:

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
3. **Loot, fight & harvest** — vision-cone fog of war: anything behind you or
   behind a wall is invisible. Zombies hear gunshots and come looking
   (silencers help). **Melee-swing trees, rocks and crate piles** to harvest
   🪵 Timber, 🪨 Stone and 🔩 Scrap — the tile breaks off the map when it's
   spent. Weather changes per raid: 🌧 rain muffles sound and trims vision,
   🌫 fog cuts everyone's sight lines hard.
4. **Know when you're made** — every zombie shows 💤 (oblivious), ❓ (searching)
   or ❗ (spotted you); the HUD chip tracks the horde overall (HIDDEN /
   SEARCHING / SPOTTED), and a red edge-of-screen ping fires when something you
   *can't see* has seen *you*.
5. **Watch your meters** — energy & hydration tick down; bleeding needs a
   bandage; too much weight makes you slow.
6. **Extract** at one of five marked zones before the **Purple Storm** hits at
   9:30 — but starting the channel **sounds an alarm** that pulls every zombie
   in earshot straight to you. Hold the point or die on the doorstep.
7. **Corpse run** — your gear drops where you fell (✕ on the minimap, re-homed
   onto the next run's fresh map at the same spot). You get
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
- ✅ 210×210 procedural overworld, new map every run, with 7 difficulty-tiered
  zones (materials, building sizes, squad composition & zombie buffs per
  zone), rendered via lazily-cached terrain chunks
- ✅ Resource mining: melee harvests trees/rocks/crate piles into timber,
  stone & scrap; tiles break off the live map
- ✅ Weather mutators per raid (rain, fog) affecting vision & sound
- ✅ Loot containers with weighted tables + zone signature materials; corpse looting
- ✅ 5 extraction zones with channel timers **and horde-drawing alarms**
- ✅ Purple Storm timer (warn @7:00, hit @9:30, radiation DPS)
- ✅ Death → corpse persistence → one-chance recovery run
- ✅ Secure Pouch: death-proof, weightless slots (upgradeable to 3)
- ✅ Walkable physical bunker with interactive stations
- ✅ Totems (2 equip slots): carry weight, speed, vision, life-on-kill, embers
- ✅ localStorage save/continue (v1 saves migrate automatically)
- ✅ Synthesized sound effects (WebAudio, no assets)

**Not yet (future work):** the three placeholder benches going live
(gunsmithing, equipment crafting, med bay), skill trees/XP, day/night +
night-only elites, blueprints, armor/rigs, difficulty settings,
autosave-restore menu.

## Code layout

```
index.html    markup + CSS (HUD, panels, station UI, screens)
js/data.js    item defs, loot tables, zombie archetypes, totems, trader, upgrades
js/world.js   zoned procedural map + bunker layout, collision, raycasting, chunked terrain
js/game.js    sim for raid & base: player, zombie AI, bullets, fog, storm, stations, sfx
js/ui.js      DOM UI: grids, drag & drop, tooltips, loot & station panels, HUD
js/main.js    boot, input, state machine (menu → base ⇄ raid), save/load + migration
```
