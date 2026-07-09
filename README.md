# Escape from Claudov — 2D Prototype

A 2D, top-down, single-player **extraction looter-shooter prototype** inspired by
*Escape from Duckov* — except the operator is the little orange Claude creature,
and the ducks are the ones shooting at you.

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
| `R` | Reload |
| `E` | Search crates / lockers / corpses |
| `Tab` | Backpack |
| `1` `2` `3` / wheel | Weapon slots (gun / gun / melee) |
| `F` | Quick-use first med item |
| `M` | Mute |
| `Esc` | Close panel / pause |

**Inventory:** drag to move · click = quick-transfer · right-click = equip/use ·
drop an attachment onto a gun to mod it · Alt+right-click a gun to strip mods ·
drag onto the world to drop items on the ground.

## The loop

1. **Bunker** — manage stash, sell junk to Boris the trader, sacrifice Fading
   Feathers at the Sewer Circle for random Totems, build base upgrades.
2. **Deploy** to Ground Zero (persistent layout; loot & duck squads reshuffle
   every raid).
3. **Loot & fight** — vision-cone fog of war: anything behind you or behind a
   wall is invisible. Ducks hear gunshots and come looking (silencers help).
4. **Watch your meters** — energy & hydration tick down; bleeding needs a
   bandage; too much weight makes you slow.
5. **Extract** at one of three marked zones before the **Purple Storm** hits at
   8 minutes — or die and lose everything you carried.
6. **Corpse run** — your gear drops where you fell (✕ on the minimap). You get
   exactly one recovery chance; die again first and it's gone forever.
   Items in the **Dog Pouch** always come home, and weigh nothing.

## What's implemented (vs. the design spec)

- ✅ KBM twin-stick movement, sprint/stamina
- ✅ Vision cone + LOS fog of war (raycast, wall occlusion, near-radius)
- ✅ Survival meters: energy, hydration, bleeding, encumbrance
- ✅ Slot + weight inventory (22-slot baseline), drag & drop, stacking
- ✅ 5 guns / 2 melee, per-weapon spread, recoil bloom, reload, damage falloff
- ✅ Drag-and-drop weapon modding (silencer / red dot / grip) in the inventory
- ✅ Duck AI: patrol → investigate noise → combat (strafe, bursts), 4 archetypes
- ✅ Loot containers with weighted tables; enemy corpse looting
- ✅ 3 extraction zones with channel timers
- ✅ Purple Storm timer (warn @6:00, hit @8:00, radiation DPS)
- ✅ Death → corpse persistence → one-chance recovery run
- ✅ Dog companion: follows you; safe, weightless pouch slots
- ✅ Bunker meta: stash, trader (buy/sell), Totem gacha (8 feathers), 2 base
  upgrades (stash expansion, 3rd dog slot)
- ✅ Totems (2 equip slots): carry weight, speed, vision, life-on-kill, feathers
- ✅ localStorage save/continue
- ✅ Synthesized sound effects (WebAudio, no assets)

**Not yet (future work):** skill trees/XP, multiple maps, day/night +
Robo-Spiders, weather mutators, blueprints/crafting workbench, physical
walkable bunker, armor/rigs, difficulty settings, autosave-restore menu.

## Code layout

```
index.html    markup + CSS (HUD, panels, bunker, screens)
js/data.js    item defs, loot tables, enemy archetypes, totems, trader, upgrades
js/world.js   seeded map generation, tile collision, DDA raycasting, terrain prerender
js/game.js    raid sim: player, duck AI, bullets, fog of war, storm, rendering, sfx
js/ui.js      DOM UI: grids, drag & drop, tooltips, loot panel, bunker tabs, HUD
js/main.js    boot, input, state machine (menu→bunker→raid→…), save/load
```
