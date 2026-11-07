<script setup lang="ts">
import { computed, ref } from 'vue'
import { bus, game } from '../game/store'
import { addScore, getPlayerName, getScores, setPlayerName, wouldPlace } from '../stores/leaderboard'
import { getDifficulty } from '../game/data/difficulty'
import { getMap } from '../game/data/maps'

const emit = defineEmits<{ restart: []; quit: [] }>()
const name = ref(getPlayerName() || 'Ranger')
const rank = ref(0)
const won = computed(() => game.over?.won)
const diff = getDifficulty(game.difficultyId)
const map = getMap(game.mapId)
const places = computed(() => wouldPlace(game.score, game.mapId, game.difficultyId))
const board = ref(getScores(game.mapId, game.difficultyId))

function save() {
  if (!game.over || game.over.saved) return
  const n = name.value.trim().slice(0, 16) || 'Ranger'
  setPlayerName(n)
  rank.value = addScore({
    name: n, score: game.score, wave: game.wave, won: !!game.over.won, lives: game.lives,
    date: new Date().toISOString(), mapId: game.mapId, difficultyId: game.difficultyId,
  })
  game.over.saved = true
  board.value = getScores(game.mapId, game.difficultyId)
}

function freeplay() {
  bus.emit('continue-freeplay')
}
</script>

<template>
  <div class="overlay">
    <div class="card modal" :class="{ won }">
      <div class="emoji">{{ won ? '🏆' : '💀' }}</div>
      <h2>{{ won ? 'The kingdom is safe!' : 'The aliens broke through…' }}</h2>
      <p class="muted">{{ map.name }} · <span :style="{ color: diff.color }">{{ diff.name }}</span> · reached wave {{ game.wave }}</p>
      <div class="score">{{ game.score.toLocaleString() }}</div>
      <p class="muted">{{ game.kills.toLocaleString() }} aliens defeated · {{ game.lives }} lives left</p>

      <div v-if="!game.over?.saved" class="save">
        <p v-if="places" class="gold">New leaderboard score!</p>
        <p v-else class="muted">Not in this board's top 10, but you can still record it.</p>
        <div class="row">
          <input v-model="name" maxlength="16" placeholder="Your name" @keydown.enter="save" />
          <button class="btn-primary" @click="save">Save score</button>
        </div>
      </div>
      <p v-else-if="rank" class="gold rank">Saved! Rank #{{ rank }} on this board.</p>
      <p v-else class="muted rank">Saved (outside top 10).</p>

      <ol class="board">
        <li v-for="(e, i) in board.slice(0, 5)" :key="e.date + e.name" :class="{ me: rank === i + 1 }">
          <span>#{{ i + 1 }} {{ e.name }}</span><b>{{ e.score.toLocaleString() }}</b>
        </li>
      </ol>

      <div class="actions">
        <button v-if="won && !game.freeplay" class="btn-green" @click="freeplay">Continue (freeplay)</button>
        <button @click="emit('restart')">Play again</button>
        <button @click="emit('quit')">Main menu</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; background: rgba(5, 3, 15, 0.7); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal { padding: 28px 40px; text-align: center; min-width: 440px; animation: pop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1); }
@keyframes pop { from { transform: scale(0.7); opacity: 0; } }
.modal.won { border-color: rgba(255, 210, 90, 0.6); box-shadow: 0 0 60px rgba(255, 200, 80, 0.3); }
.emoji { font-size: 64px; }
h2 { font-size: 30px; margin: 6px 0; }
.score { font-size: 56px; font-weight: 900; color: var(--gold); text-shadow: 0 4px 0 #6a3a00; }
.save { margin: 12px 0; }
.row { display: flex; gap: 8px; justify-content: center; }
input {
  font: inherit; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.35); color: var(--text); width: 200px;
}
.rank { margin: 12px 0; font-weight: 700; }
.board { list-style: none; padding: 0; margin: 10px auto; max-width: 320px; text-align: left; }
.board li { display: flex; justify-content: space-between; padding: 4px 10px; border-radius: 6px; }
.board li:nth-child(odd) { background: rgba(255, 255, 255, 0.04); }
.board li.me { background: rgba(255, 210, 90, 0.2); }
.actions { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }
</style>
