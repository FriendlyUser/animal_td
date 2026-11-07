<script setup lang="ts">
import { game } from '../game/store'
import { MAPS, WORLD_H, WORLD_W } from '../game/data/maps'
import { DIFFICULTIES } from '../game/data/difficulty'
import { getScores } from '../stores/leaderboard'

function pts(path: [number, number][]) {
  return path.map(([x, y]) => `${x},${y}`).join(' ')
}

function bestFor(mapId: string) {
  const s = getScores(mapId, game.difficultyId)[0]
  return s ? s.score.toLocaleString() : '—'
}

function start() {
  game.gameKey++
  game.screen = 'play'
}
</script>

<template>
  <div class="screen stars">
    <div class="wrap">
      <div class="head">
        <button @click="game.screen = 'menu'">← Back</button>
        <h2>Choose your battlefield</h2>
        <span />
      </div>

      <div class="maps">
        <button
          v-for="m in MAPS" :key="m.id" class="map card"
          :class="{ active: game.mapId === m.id }" @click="game.mapId = m.id"
        >
          <svg :viewBox="`0 0 ${WORLD_W} ${WORLD_H}`" class="preview" :style="{ background: m.theme.ground }">
            <polyline
              v-for="(p, i) in m.paths" :key="'e' + i" :points="pts(p)" fill="none"
              :stroke="m.theme.pathEdge" :stroke-width="m.pathWidth + 30" stroke-linejoin="round"
            />
            <polyline
              v-for="(p, i) in m.paths" :key="'p' + i" :points="pts(p)" fill="none"
              :stroke="m.theme.path" :stroke-width="m.pathWidth + 10" stroke-linejoin="round"
            />
          </svg>
          <div class="map-info">
            <div class="row">
              <b>{{ m.name }}</b>
              <span class="tag" :class="m.level">{{ m.level }}</span>
            </div>
            <p class="muted">{{ m.blurb }}</p>
            <p class="small">Best ({{ DIFFICULTIES.find(d => d.id === game.difficultyId)?.name }}): <b class="gold">{{ bestFor(m.id) }}</b></p>
          </div>
        </button>
      </div>

      <h3 class="sec">Difficulty</h3>
      <div class="diffs">
        <button
          v-for="d in DIFFICULTIES" :key="d.id" class="diff card"
          :class="{ active: game.difficultyId === d.id }" :style="{ '--c': d.color }"
          @click="game.difficultyId = d.id"
        >
          <b :style="{ color: d.color }">{{ d.name }}</b>
          <span class="muted">{{ d.tagline }}</span>
          <span class="stats">❤ {{ d.lives }} · 💰 {{ d.startCash }} · 🌊 {{ d.waves }} · ×{{ d.scoreMult }} score</span>
        </button>
      </div>

      <div class="go">
        <button class="btn-primary" @click="start">Defend the kingdom ▶</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { width: min(1200px, 94vw); padding: 30px 0; position: relative; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.head h2 { font-size: 32px; }
.maps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.map { padding: 0; overflow: hidden; text-align: left; border-width: 2px; }
.map.active, .diff.active { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(255, 210, 90, 0.35), 0 20px 60px rgba(0, 0, 0, 0.5); }
.preview { width: 100%; display: block; aspect-ratio: 16 / 9; }
.map-info { padding: 12px 16px; }
.map-info p { margin: 6px 0 0; font-size: 14px; }
.row { display: flex; justify-content: space-between; align-items: center; font-size: 18px; }
.tag { font-size: 11px; padding: 3px 8px; border-radius: 99px; font-weight: 700; text-transform: uppercase; }
.Beginner { background: #2f7a3a; }
.Intermediate { background: #8a6a12; }
.Advanced { background: #8a2a3a; }
.small { font-size: 13px !important; }
.sec { margin: 26px 0 12px; font-size: 22px; }
.diffs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.diff { display: flex; flex-direction: column; gap: 6px; text-align: left; padding: 14px 16px; border-width: 2px; }
.diff b { font-size: 22px; }
.diff .muted { font-size: 13px; min-height: 34px; }
.stats { font-size: 12px; color: #d9cff0; }
.go { text-align: center; margin-top: 28px; }
.go button { font-size: 24px; padding: 14px 40px; }
@media (max-width: 900px) { .maps, .diffs { grid-template-columns: 1fr 1fr; } }
</style>
