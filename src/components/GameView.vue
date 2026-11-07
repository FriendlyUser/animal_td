<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Phaser from 'phaser'
import { bus, game, towerCost } from '../game/store'
import { GameScene } from '../game/scenes/GameScene'
import { WORLD_H, WORLD_W, getMap } from '../game/data/maps'
import { getDifficulty } from '../game/data/difficulty'
import { TOWERS } from '../game/data/towers'
import { setMuted } from '../game/audio'
import TowerPanel from './TowerPanel.vue'
import GameOverModal from './GameOverModal.vue'
import { ENEMIES } from '../game/data/enemies'

const host = ref<HTMLDivElement>()
let phaser: Phaser.Game | null = null
const hovered = ref<string | null>(null)
const map = getMap(game.mapId)
const diff = getDifficulty(game.difficultyId)

const hoveredTower = computed(() => TOWERS.find((t) => t.id === hovered.value) ?? null)
const lifePct = computed(() => Math.max(0, game.lives / game.maxLives))

function place(id: string) {
  const t = TOWERS.find((x) => x.id === id)
  if (!t || game.cash < towerCost(t.cost) || game.over) return
  if (game.placingId === id) bus.emit('place-cancel')
  else bus.emit('place-start', id)
}

function startWave() {
  bus.emit('start-wave')
}

function setSpeed(s: number) {
  game.speed = s
}

function restart() {
  game.paused = false
  game.gameKey++
}

function toggleDamage() {
  game.showDamage = !game.showDamage
  localStorage.setItem('wildguard.dmg', game.showDamage ? '1' : '0')
}

const comboTier = computed(() => {
  const c = game.combo
  if (c >= 100) return 'c4'
  if (c >= 60) return 'c3'
  if (c >= 30) return 'c2'
  if (c >= 15) return 'c1'
  return 'c0'
})

function quit() {
  game.paused = false
  game.screen = 'menu'
}

function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return
  const k = e.key.toLowerCase()
  if (k >= '1' && k <= '8') {
    const t = TOWERS[Number(k) - 1]
    if (t) place(t.id)
  } else if (k === 'r') {
    bus.emit('power', 'roar')
  } else if (k === 's') {
    bus.emit('power', 'stampede')
  } else if (k === 'd') {
    bus.emit('power', 'strike')
  } else if (k === 'escape') {
    if (game.aiming) game.aiming = null
    else if (game.placingId) bus.emit('place-cancel')
    else if (game.selected) bus.emit('deselect')
    else if (!game.over) game.paused = !game.paused
  } else if (k === ' ') {
    e.preventDefault()
    startWave()
  } else if (k === 'f') {
    setSpeed(game.speed >= 3 ? 1 : game.speed + 1)
  } else if (k === 'p') {
    if (!game.over) game.paused = !game.paused
  } else if (k === 'q' || k === ',') {
    bus.emit('upgrade', 0)
  } else if (k === 'e' || k === '.') {
    bus.emit('upgrade', 1)
  } else if (k === 'x' || k === 'delete' || k === 'backspace') {
    bus.emit('sell')
  } else if (k === 'tab') {
    e.preventDefault()
    bus.emit('cycle-target')
  } else if (k === 'a') {
    game.autoStart = !game.autoStart
  }
}

onMounted(() => {
  game.speed = 1
  phaser = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.value!,
    width: WORLD_W,
    height: WORLD_H,
    backgroundColor: '#0f0b1e',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
  })
  phaser.scene.add('game', GameScene, true, { mapId: game.mapId, difficultyId: game.difficultyId })
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  phaser?.destroy(true)
  phaser = null
  game.placingId = null
  game.selected = null
  game.boss = null
  game.aiming = null
  game.combo = 0
})
</script>

<template>
  <div class="game">
    <header class="top">
      <div class="brand">🦁 <b>WILDGUARD</b> <span class="muted">· {{ map.name }} · <span :style="{ color: diff.color }">{{ diff.name }}</span></span></div>
      <div class="stat lives" :class="{ low: lifePct < 0.3 }">
        <span>❤</span><b>{{ game.lives }}</b>
        <div class="bar"><div :style="{ width: lifePct * 100 + '%' }" /></div>
      </div>
      <div class="stat cash"><span>💰</span><b>${{ Math.floor(game.cash).toLocaleString() }}</b></div>
      <div class="stat"><span>🌊</span><b>{{ game.wave }}</b><span class="muted">/ {{ game.freeplay ? '∞' : game.totalWaves }}</span></div>
      <div class="stat"><span>⭐</span><b>{{ game.score.toLocaleString() }}</b></div>
      <div class="controls">
        <button class="btn-green start" :disabled="game.waveActive || !!game.over" title="Start next wave (Space)" @click="startWave">
          {{ game.waveActive ? 'Wave in progress…' : `Start wave ${game.wave + 1} ▶` }}
        </button>
        <div class="seg">
          <button v-for="s in [1, 2, 3]" :key="s" :class="{ on: game.speed === s }" title="Game speed (F)" @click="setSpeed(s)">{{ s }}×</button>
        </div>
        <button :class="{ on: game.autoStart }" title="Auto-start waves (A)" @click="game.autoStart = !game.autoStart">Auto</button>
        <button title="Pause (P)" @click="game.paused = !game.paused">{{ game.paused ? '▶' : '⏸' }}</button>
        <button title="Sound" @click="setMuted(!game.muted)">{{ game.muted ? '🔇' : '🔊' }}</button>
      </div>
    </header>

    <div class="main">
      <div class="stage">
        <div ref="host" class="host" :class="{ placing: !!game.placingId }" />
        <div v-if="game.boss" class="boss card">
          <span>👾 {{ game.boss.name }}</span>
          <div class="bossbar"><div :style="{ width: game.boss.frac * 100 + '%' }" /></div>
        </div>
        <div class="powers">
          <button
            v-for="p in game.powers" :key="p.id" class="power"
            :class="{ ready: p.cd <= 0 && game.waveActive, aiming: game.aiming === p.id }"
            :disabled="p.cd > 0 || !game.waveActive || !!game.over"
            :title="`${p.name} (${p.key}): ${p.desc}`"
            :style="{ '--pct': (p.cd / p.max) * 100 + '%' }"
            @click="bus.emit('power', p.id)"
          >
            <span class="picon">{{ p.icon }}</span>
            <span v-if="p.cd > 0" class="pcd">{{ p.cd }}</span>
            <kbd class="pkey">{{ p.key }}</kbd>
          </button>
        </div>
        <div v-if="game.combo >= 5" :key="comboTier" class="combo" :class="comboTier">
          <b>×{{ game.combo }}</b><span>COMBO</span>
        </div>
        <div v-if="game.aiming" class="hint aim">🦅 Click where the eagles should strike · <kbd>Right-click</kbd>/<kbd>Esc</kbd> to cancel</div>
        <div v-if="game.placingId" class="hint">Click to place · <kbd>Shift</kbd>+click to place more · <kbd>Right-click</kbd>/<kbd>Esc</kbd> to cancel</div>
        <div v-if="game.paused && !game.over" class="overlay">
          <div class="card pause">
            <h2>Paused</h2>
            <button class="btn-primary" @click="game.paused = false">Resume</button>
            <button @click="toggleDamage">Damage numbers: {{ game.showDamage ? 'On' : 'Off' }}</button>
            <p class="muted small">Best combo this game: ×{{ game.bestCombo }}</p>
            <button @click="restart">Restart</button>
            <button @click="quit">Quit to menu</button>
          </div>
        </div>
        <GameOverModal v-if="game.over" @restart="restart" @quit="quit" />
      </div>

      <aside class="side">
        <TowerPanel v-if="game.selected" />
        <template v-else>
          <h3>Animal Allies</h3>
          <div class="shop">
            <button
              v-for="(t, i) in TOWERS" :key="t.id" class="item"
              :class="{ active: game.placingId === t.id }"
              :disabled="game.cash < towerCost(t.cost) && game.placingId !== t.id"
              @click="place(t.id)" @mouseenter="hovered = t.id" @mouseleave="hovered = null"
            >
              <span class="key">{{ i + 1 }}</span>
              <img v-if="game.icons[t.id]" :src="game.icons[t.id]" :alt="t.name" />
              <span class="name">{{ t.name }}</span>
              <span class="cost" :class="{ poor: game.cash < towerCost(t.cost) }">${{ towerCost(t.cost) }}</span>
            </button>
          </div>
          <div class="desc card">
            <template v-if="hoveredTower">
              <b :style="{ color: hoveredTower.color }">{{ hoveredTower.name }}</b>
              <p>{{ hoveredTower.desc }}</p>
              <p class="muted small">Upgrades: {{ hoveredTower.pathNames[0] }} / {{ hoveredTower.pathNames[1] }}</p>
            </template>
            <template v-else>
              <b>Next wave</b>
              <div class="next">
                <span v-for="n in game.nextWave" :key="n.type" class="enemy" :title="ENEMIES[n.type].name + ': ' + ENEMIES[n.type].desc">
                  <img v-if="game.icons['enemy_' + n.type]" :src="game.icons['enemy_' + n.type]" />
                  ×{{ n.count }}
                </span>
              </div>
              <p class="muted small">Hover an alien for intel.</p>
            </template>
          </div>
          <div class="keys muted small">
            <kbd>1-8</kbd> build · <kbd>Space</kbd> wave · <kbd>F</kbd> speed · <kbd>Q</kbd>/<kbd>E</kbd> upgrade · <kbd>X</kbd> sell · <kbd>Tab</kbd> target · <kbd>R</kbd>/<kbd>S</kbd>/<kbd>D</kbd> powers · <kbd>Esc</kbd> pause
          </div>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.game { position: absolute; inset: 0; display: flex; flex-direction: column; background: #0f0b1e; }
.top {
  height: 58px; display: flex; align-items: center; gap: 22px; padding: 0 14px;
  background: linear-gradient(180deg, #2a1f48, #1a1330); border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); z-index: 2;
}
.brand { font-size: 15px; white-space: nowrap; }
.stat { display: flex; align-items: center; gap: 6px; font-size: 20px; white-space: nowrap; }
.stat b { font-weight: 800; }
.cash b { color: var(--gold); }
.lives b { color: #ff8a9a; }
.lives.low b { animation: pulse 0.8s infinite; }
@keyframes pulse { 50% { opacity: 0.4; } }
.bar { width: 60px; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
.bar div { height: 100%; background: linear-gradient(90deg, #ff4a6a, #ff9aa8); transition: width 0.3s; }
.controls { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.controls button { padding: 7px 12px; }
.start { min-width: 190px; }
.seg { display: flex; }
.seg button { border-radius: 0; margin-left: -1px; }
.seg button:first-child { border-radius: 10px 0 0 10px; }
.seg button:last-child { border-radius: 0 10px 10px 0; }
button.on { background: var(--accent); color: #12002a; font-weight: 800; }
.main { flex: 1; display: flex; min-height: 0; }
.stage { flex: 1; position: relative; min-width: 0; }
.host { position: absolute; inset: 0; }
.host.placing { cursor: crosshair; }
.boss {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  padding: 8px 16px; display: flex; align-items: center; gap: 12px; font-weight: 800; color: #b8ffc0;
}
.bossbar { width: 360px; height: 14px; border-radius: 7px; background: rgba(0, 0, 0, 0.5); overflow: hidden; border: 1px solid rgba(160, 255, 170, 0.5); }
.bossbar div { height: 100%; background: linear-gradient(90deg, #3aff6a, #c8ffd0); transition: width 0.2s; }
.hint {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.65); padding: 6px 14px; border-radius: 99px; font-size: 13px; pointer-events: none;
}
.powers { position: absolute; left: 14px; bottom: 14px; display: flex; gap: 10px; }
.power {
  position: relative; width: 70px; height: 70px; border-radius: 50%; padding: 0; overflow: hidden;
  background: radial-gradient(circle at 35% 30%, #4a3a7a, #1c1436); border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
}
.power::after {
  content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(rgba(0, 0, 0, 0.7) var(--pct), transparent 0);
}
.power:disabled { opacity: 1; }
.power .picon { font-size: 34px; position: relative; z-index: 0; }
.power .pcd { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2; font-weight: 900; font-size: 20px; text-shadow: 0 2px 4px #000; }
.power .pkey { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); z-index: 2; }
.power.ready { border-color: var(--gold); animation: glow 1.2s ease-in-out infinite; }
.power.ready:hover { transform: scale(1.08); }
.power.aiming { border-color: #ff8a3a; box-shadow: 0 0 0 4px rgba(255, 140, 60, 0.5), 0 0 30px rgba(255, 140, 60, 0.8); }
@keyframes glow { 50% { box-shadow: 0 0 22px rgba(255, 210, 90, 0.85), 0 6px 16px rgba(0, 0, 0, 0.5); } }
.combo {
  position: absolute; right: 18px; top: 14px; display: flex; flex-direction: column; align-items: center;
  font-weight: 900; pointer-events: none; animation: punch 0.25s ease-out;
  text-shadow: 0 3px 0 #1a1030, 0 0 18px currentColor;
}
.combo b { font-size: 46px; line-height: 1; }
.combo span { font-size: 13px; letter-spacing: 4px; }
.c0 { color: #ffffff; } .c1 { color: #7aff8a; } .c2 { color: #5ad1ff; } .c3 { color: #c88aff; } .c4 { color: #ffb347; }
@keyframes punch { from { transform: scale(1.5); } }
.hint.aim { background: rgba(120, 50, 0, 0.8); bottom: 96px; }
.small { font-size: 12px; margin: 0; }
.overlay { position: absolute; inset: 0; background: rgba(5, 3, 15, 0.6); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); }
.pause { padding: 30px 40px; display: flex; flex-direction: column; gap: 12px; min-width: 280px; text-align: center; }
.pause h2 { font-size: 36px; margin-bottom: 8px; }
.side {
  width: 330px; padding: 14px; background: linear-gradient(180deg, #1d1636, #120d24);
  border-left: 1px solid var(--border); overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
}
.side h3 { font-size: 18px; letter-spacing: 1px; }
.shop { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.item { position: relative; display: flex; flex-direction: column; align-items: center; padding: 8px 6px 6px; gap: 2px; }
.item img { width: 64px; height: 64px; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5)); transition: transform 0.15s; }
.item:hover:not(:disabled) img { transform: scale(1.1) rotate(-4deg); }
.item.active { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(255, 210, 90, 0.5); }
.item .name { font-size: 12px; font-weight: 700; text-align: center; }
.item .cost { font-size: 14px; font-weight: 800; color: var(--gold); }
.item .cost.poor { color: var(--red); }
.key { position: absolute; top: 4px; left: 6px; font-size: 11px; color: var(--muted); }
.desc { padding: 12px; font-size: 14px; min-height: 110px; }
.desc p { margin: 6px 0 0; }
.small { font-size: 12px; }
.next { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.enemy { display: flex; align-items: center; gap: 2px; font-weight: 700; background: rgba(255, 255, 255, 0.06); padding: 2px 8px 2px 2px; border-radius: 99px; cursor: help; }
.enemy img { width: 30px; height: 30px; }
.keys { line-height: 1.9; }
@media (max-width: 1300px) { .brand { display: none; } .top { gap: 14px; } }
</style>
