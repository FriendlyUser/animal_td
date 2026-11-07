<script setup lang="ts">
import { game } from '../game/store'
import { setMuted } from '../game/audio'
import { getScores } from '../stores/leaderboard'

const best = getScores()[0]
const critters = ['🦔', '🦅', '🐘', '🐝', '🐸', '🦉', '🦁', '🦍']
</script>

<template>
  <div class="screen stars">
    <div class="menu">
      <div class="ufo">🛸</div>
      <h1 class="title">WILDGUARD</h1>
      <div class="subtitle">Kingdom <span>vs</span> Cosmos</div>
      <p class="muted lead">The aliens have landed. Rally the animal kingdom and hold the line.</p>
      <div class="critters">
        <span v-for="(c, i) in critters" :key="c" :style="{ animationDelay: `${i * 0.12}s` }">{{ c }}</span>
      </div>
      <div class="buttons">
        <button class="btn-primary big" @click="game.screen = 'setup'">▶ Play</button>
        <button @click="game.screen = 'scores'">🏆 Leaderboards</button>
        <button @click="game.screen = 'howto'">📖 How to play</button>
        <button @click="setMuted(!game.muted)">{{ game.muted ? '🔇 Sound off' : '🔊 Sound on' }}</button>
      </div>
      <p v-if="best" class="best">Top score: <b class="gold">{{ best.score.toLocaleString() }}</b> by {{ best.name }}</p>
    </div>
  </div>
</template>

<style scoped>
.menu { text-align: center; position: relative; padding: 40px; }
.ufo { font-size: 64px; animation: hover 3s ease-in-out infinite; filter: drop-shadow(0 0 20px rgba(120, 255, 140, 0.6)); }
@keyframes hover { 50% { transform: translate(20px, -10px) rotate(6deg); } }
.title {
  font-size: clamp(56px, 9vw, 120px);
  font-weight: 900;
  letter-spacing: 6px;
  background: linear-gradient(180deg, #fff3c0, #ffb32a 60%, #d86a10);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 0 #5a2a00) drop-shadow(0 12px 30px rgba(255, 160, 40, 0.4));
}
.subtitle { font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #d9c8ff; margin-top: -6px; }
.subtitle span { color: #8aff9a; font-style: italic; }
.lead { font-size: 18px; margin: 18px 0; }
.critters { font-size: 44px; display: flex; gap: 14px; justify-content: center; margin: 10px 0 30px; }
.critters span { animation: bounce 1.6s ease-in-out infinite; display: inline-block; }
@keyframes bounce { 50% { transform: translateY(-10px); } }
.buttons { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.buttons button { min-width: 280px; font-size: 18px; padding: 12px 20px; }
.buttons .big { font-size: 26px; padding: 16px 20px; }
.best { margin-top: 24px; color: var(--muted); }
</style>
