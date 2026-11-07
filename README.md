# Wildguard: Kingdom vs Cosmos

An HD 2D tower defence game built with **Vue 3 + Phaser 3 + Vite + TypeScript**.
The animal kingdom defends its den against waves of space aliens.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle in dist/
```

## Features

- **8 animal towers**, each with 2 upgrade paths × 3 tiers (only one path can reach tier 3):
  Quill Porcupine, Sky Eagle (sniper), War Elephant (stomp/stun), Hive Swarm (homing bees),
  Toxic Frog (poison splash/slow), Mystic Owl (chain lightning + detection aura),
  Pride Lion (support buffs / income), Boulder Gorilla (artillery).
- **9 alien types + boss**: grunts, fast drones, splitting blobs, cloaked stalkers, armored walkers,
  shield saucers, healers, brutes and the Xal Mothership, which spawns grunts as it flies.
- Mechanics: armor and armor shred, regenerating shields, cloaking and detection, poison, slow, stun, splitting.
- **3 maps** (one with two converging lanes) and **4 difficulties** (Cub, Pack, Apex, Extinction).
- Deterministic waves, so leaderboard runs are fair, plus **freeplay** after victory.
- **Local leaderboards** per map and difficulty (localStorage), with name entry.
- Targeting modes (first, last, strong, close), sell for 70%, 1×/2×/3× speed, auto-start, pause.
- **Animal powers** with cooldowns that only recharge during waves: Thunder Roar (`R`) stuns every alien,
  Stampede (`S`) sends an elephant herd up the trail to trample and knock back aliens, and Eagle Strike (`D`)
  dive-bombs a spot you click.
- **Kill combos** (Killing Spree → Apex Predator) award bonus cash and score, plus a rare **Gilded Scout**
  treasure ship worth a big payout.
- **Effects**: critical hits, floating damage numbers (toggle in the pause menu), muzzle flashes, death shockwaves,
  warp-in spawns, upgrade light pillars, slow-motion mothership kills, and ambient snow, fireflies or dust per map.
- All art is drawn procedurally at 1920×1080 with Canvas 2D gradients and shadows. Sound effects
  are synthesized with WebAudio, so there are no external assets.

## Controls

| Key | Action |
| --- | --- |
| `1`–`8` | Pick a tower (Shift+click to place several) |
| `Space` | Start the next wave |
| `F` | Cycle game speed |
| `A` | Toggle auto-start |
| `Q` / `E` | Upgrade path 1 / 2 of the selected tower |
| `Tab` | Cycle targeting mode |
| `X` | Sell the selected tower |
| `R` / `S` / `D` | Thunder Roar / Stampede / Eagle Strike |
| `P` / `Esc` | Pause (Esc also cancels or deselects) |

## Code map

- `src/game/data/` holds the balance data: towers, enemies, waves, maps and difficulties.
- `src/game/scenes/GameScene.ts` is the simulation: movement, targeting, projectiles, economy and waves.
- `src/game/textures.ts` draws the procedural HD art and map backgrounds.
- `src/game/store.ts` is shared reactive state and the command bus between Vue and Phaser.
- `src/components/` holds the Vue UI: menus, HUD, upgrade panel, game over and leaderboards.

In dev builds, `window.__wg` (the scene) and `window.__store` are exposed, so you can script
balance tests by calling `__wg.step(dt)` directly.
