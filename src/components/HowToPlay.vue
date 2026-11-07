<script setup lang="ts">
import { game } from '../game/store'
import { TOWERS } from '../game/data/towers'
import { ENEMIES } from '../game/data/enemies'

const aliens = Object.values(ENEMIES).filter((e) => e.id !== 'miniblob')
const emoji: Record<string, string> = {
  porcupine: '🦔', eagle: '🦅', elephant: '🐘', hive: '🐝', frog: '🐸', owl: '🦉', lion: '🦁', gorilla: '🦍',
}
</script>

<template>
  <div class="screen stars">
    <div class="wrap card">
      <div class="head">
        <button @click="game.screen = 'menu'">← Back</button>
        <h2>📖 Field Guide</h2>
        <span />
      </div>
      <div class="cols">
        <section>
          <h3>Basics</h3>
          <ul>
            <li>Aliens follow the trail toward the animal den. Each one that gets through costs lives.</li>
            <li>Pick an animal from the shop and click on open ground to place it. You can't build on trails, trees or rocks.</li>
            <li>Click a placed animal to upgrade it. Each animal has two upgrade paths with three tiers. Only one path can reach tier 3.</li>
            <li>Earn cash by defeating aliens and clearing waves. Selling refunds 70%.</li>
            <li><b>Cloaked</b> aliens can only be targeted by animals with detection. The Owl gives detection to every animal in its range.</li>
            <li><b>Armor</b> reduces each hit. Big hits, armor piercing and armor shred beat it. Poison ignores armor and shields.</li>
            <li>Survive every wave to win, then keep going in freeplay to chase a higher score.</li>
          </ul>
          <h3>Animal powers</h3>
          <ul>
            <li><b>🦁 Thunder Roar</b> (<kbd>R</kbd>): stuns every alien on the map.</li>
            <li><b>🐘 Stampede</b> (<kbd>S</kbd>): a herd charges up the trail, trampling and knocking aliens back.</li>
            <li><b>🦅 Eagle Strike</b> (<kbd>D</kbd>): click a spot and eagles dive-bomb it.</li>
            <li>Powers recharge only while a wave is running. Chain kills quickly for <b>combo</b> cash bonuses, and pop the rare <b>Gilded Scout</b> for treasure.</li>
          </ul>
          <h3>Controls</h3>
          <p class="keys">
            <kbd>1</kbd>–<kbd>8</kbd> pick animal · <kbd>Shift</kbd>+click place several · <kbd>Space</kbd> start wave ·
            <kbd>F</kbd> speed · <kbd>A</kbd> auto-start · <kbd>Q</kbd>/<kbd>E</kbd> upgrade paths · <kbd>Tab</kbd> targeting ·
            <kbd>X</kbd> sell · <kbd>R</kbd>/<kbd>S</kbd>/<kbd>D</kbd> powers · <kbd>P</kbd>/<kbd>Esc</kbd> pause · right-click cancel
          </p>
        </section>
        <section>
          <h3>Animal allies</h3>
          <div v-for="t in TOWERS" :key="t.id" class="entry">
            <span class="em">{{ emoji[t.id] }}</span>
            <div><b :style="{ color: t.color }">{{ t.name }}</b> <span class="gold">${{ t.cost }}</span><br /><span class="muted">{{ t.desc }}</span></div>
          </div>
        </section>
        <section>
          <h3>Alien invaders</h3>
          <div v-for="a in aliens" :key="a.id" class="entry">
            <span class="em">👾</span>
            <div><b>{{ a.name }}</b><br /><span class="muted">{{ a.desc }}</span></div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { width: min(1200px, 95vw); padding: 24px 28px; position: relative; max-height: 92vh; overflow: auto; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.cols { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 26px; }
h3 { margin: 12px 0 8px; color: var(--gold); }
ul { padding-left: 18px; line-height: 1.55; margin: 0; }
li { margin-bottom: 6px; }
.keys { line-height: 2; }
.entry { display: flex; gap: 10px; margin-bottom: 10px; font-size: 14px; }
.em { font-size: 26px; }
@media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }
</style>
