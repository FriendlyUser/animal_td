<script setup lang="ts">
import { computed, ref } from 'vue'
import { game } from '../game/store'
import { MAPS } from '../game/data/maps'
import { DIFFICULTIES, type DifficultyId } from '../game/data/difficulty'
import { clearScores, getScores } from '../stores/leaderboard'

const mapId = ref(game.mapId)
const diffId = ref<DifficultyId>(game.difficultyId)
const version = ref(0)
const rows = computed(() => {
  void version.value
  return getScores(mapId.value, diffId.value)
})
const medals = ['🥇', '🥈', '🥉']

function reset() {
  if (confirm('Clear ALL local leaderboard scores? This cannot be undone.')) {
    clearScores()
    version.value++
  }
}
</script>

<template>
  <div class="screen stars">
    <div class="wrap card">
      <div class="head">
        <button @click="game.screen = 'menu'">← Back</button>
        <h2>🏆 Local Leaderboards</h2>
        <button class="danger" @click="reset">Clear</button>
      </div>
      <div class="tabs">
        <button v-for="m in MAPS" :key="m.id" :class="{ on: mapId === m.id }" @click="mapId = m.id">{{ m.name }}</button>
      </div>
      <div class="tabs">
        <button
          v-for="d in DIFFICULTIES" :key="d.id" :class="{ on: diffId === d.id }"
          :style="{ '--c': d.color }" @click="diffId = d.id"
        >{{ d.name }}</button>
      </div>
      <table v-if="rows.length">
        <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Wave</th><th>Result</th><th>Date</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.date + r.name">
            <td>{{ medals[i] ?? i + 1 }}</td>
            <td>{{ r.name }}</td>
            <td class="gold"><b>{{ r.score.toLocaleString() }}</b></td>
            <td>{{ r.wave }}</td>
            <td>{{ r.won ? '🏆 Victory' : '💀 Defeat' }}</td>
            <td class="muted">{{ new Date(r.date).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty muted">No scores yet on this board. Go set one!</p>
    </div>
  </div>
</template>

<style scoped>
.wrap { width: min(860px, 94vw); padding: 24px 28px; position: relative; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.danger { background: rgba(255, 90, 106, 0.18); border-color: rgba(255, 90, 106, 0.5); }
.tabs { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.tabs button.on { background: var(--c, var(--accent)); color: #12002a; font-weight: 800; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th { text-align: left; color: var(--muted); font-weight: 600; font-size: 13px; padding: 8px; border-bottom: 1px solid var(--border); }
td { padding: 10px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
tr:first-child td { font-size: 18px; }
.empty { text-align: center; padding: 40px; }
</style>
