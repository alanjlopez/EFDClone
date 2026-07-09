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
2. **Loot & fight** — vision-cone fog of war: anything behind you or behind a
   wall is invisible. Zombies hear gunshots and come looking (silencers help).
3. **Know when you're made** — every zombie shows 💤 (oblivious), ❓ (searching)
   or ❗ (spotted you); the HUD chip tracks the horde overall (HIDDEN /
   SEARCHING / SPOTTED), and a red edge-of-screen ping fires when something you
   *can't see* has seen *you*.
4. **Watch your meters** — energy & hydration tick down; bleeding needs a
   bandage; too much weight makes you slow.
5. **Extract** at one of three marked zones before the **Purple Storm** hits at
   8 minutes — or die and lose everything you carried.
6. **Corpse run** — your gear drops where you fell (✕ on the minimap). You get
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
- ✅ Loot containers with weighted tables; zombie corpse looting
- ✅ 3 extraction zones with channel timers
- ✅ Purple Storm timer (warn @6:00, hit @8:00, radiation DPS)
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
js/world.js   seeded raid map + bunker layout, tile collision, DDA raycasting
js/game.js    sim for raid & base: player, zombie AI, bullets, fog, storm, stations, sfx
js/ui.js      DOM UI: grids, drag & drop, tooltips, loot & station panels, HUD
js/main.js    boot, input, state machine (menu → base ⇄ raid), save/load + migration
```
