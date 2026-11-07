<script setup lang="ts">
import { computed } from 'vue'
import { bus, game } from '../game/store'
import type { TargetMode } from '../game/data/towers'

const s = computed(() => game.selected!)
const modes: { id: TargetMode; label: string }[] = [
  { id: 'first', label: 'First' },
  { id: 'last', label: 'Last' },
  { id: 'strong', label: 'Strong' },
  { id: 'close', label: 'Close' },
]

const statLine = computed(() => {
  const st = s.value.stats
  const out: string[] = []
  if (st.damage) out.push(`${round(st.damage)} dmg`)
  if (st.rate) out.push(`${round(st.rate)}/s`)
  if (st.range < 3000) out.push(`${Math.round(st.range)} range`)
  else out.push('∞ range')
  if (st.pierce > 1 && st.pierce < 999) out.push(`${st.pierce} pierce`)
  if (st.splash) out.push(`${Math.round(st.splash)} splash`)
  if (st.poisonDps) out.push(`${st.poisonDps} poison/s`)
  if (st.chains) out.push(`${st.chains} chains`)
  if (st.buffRate) out.push(`+${Math.round(st.buffRate * 100)}% speed aura`)
  if (st.income) out.push(`$${st.income}/wave`)
  return out
})

function round(n: number) {
  return Math.round(n * 100) / 100
}
</script>

<template>
  <div class="panel">
    <div class="head">
      <img v-if="game.icons[s.id]" :src="game.icons[s.id]" />
      <div>
        <h3>{{ s.name }}</h3>
        <div class="muted small">{{ s.kills }} kills · {{ s.damage.toLocaleString() }} damage</div>
        <div class="badges">
          <span v-if="s.detecting" class="badge eye">👁 Detects cloaked</span>
          <span v-if="s.buffed" class="badge buff">🦁 Roar buff</span>
        </div>
      </div>
      <button class="close" title="Close (Esc)" @click="bus.emit('deselect')">✕</button>
    </div>

    <div class="stats">
      <span v-for="l in statLine" :key="l">{{ l }}</span>
    </div>

    <div v-if="s.stats.rate > 0" class="targets">
      <span class="muted small">Target</span>
      <div class="seg">
        <button v-for="m in modes" :key="m.id" :class="{ on: s.target === m.id }" @click="bus.emit('target', m.id)">{{ m.label }}</button>
      </div>
    </div>

    <div class="paths">
      <div v-for="p in [0, 1] as const" :key="p" class="path card" :class="'p' + p">
        <div class="pname">
          <b>{{ s.pathNames[p] }}</b>
          <span class="pips"><i v-for="i in 3" :key="i" :class="{ on: i <= s.tiers[p] }" /></span>
        </div>
        <div v-for="o in s.owned[p]" :key="o" class="owned">✔ {{ o }}</div>
        <template v-if="s.next[p] && !s.next[p]!.maxed">
          <div class="up">
            <b>{{ s.next[p]!.name }}</b>
            <p class="muted">{{ s.next[p]!.desc }}</p>
          </div>
          <button
            class="buy" :class="s.next[p]!.locked ? '' : 'btn-primary'"
            :disabled="s.next[p]!.locked || game.cash < s.next[p]!.cost"
            :title="p === 0 ? 'Hotkey: Q' : 'Hotkey: E'"
            @click="bus.emit('upgrade', p)"
          >
            <template v-if="s.next[p]!.locked">🔒 Path locked</template>
            <template v-else>Upgrade ${{ s.next[p]!.cost.toLocaleString() }}</template>
          </button>
        </template>
        <div v-else class="max">★ Mastered</div>
      </div>
    </div>
    <p class="muted small rule">Only one path can reach tier 3.</p>

    <button class="sell" title="Sell (X)" @click="bus.emit('sell')">Sell for <b class="gold">${{ s.sellValue.toLocaleString() }}</b></button>
  </div>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 12px; }
.head { display: flex; gap: 10px; align-items: center; position: relative; }
.head img { width: 72px; height: 72px; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5)); }
.head h3 { font-size: 20px; }
.close { position: absolute; top: 0; right: 0; padding: 2px 8px; }
.small { font-size: 12px; }
.badges { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.badge { font-size: 11px; padding: 2px 7px; border-radius: 99px; }
.eye { background: rgba(160, 110, 255, 0.3); }
.buff { background: rgba(255, 170, 60, 0.3); }
.stats { display: flex; flex-wrap: wrap; gap: 6px; }
.stats span { font-size: 12px; background: rgba(255, 255, 255, 0.07); padding: 3px 8px; border-radius: 6px; }
.targets { display: flex; align-items: center; justify-content: space-between; }
.seg { display: flex; }
.seg button { border-radius: 0; margin-left: -1px; padding: 5px 9px; font-size: 13px; }
.seg button:first-child { border-radius: 8px 0 0 8px; }
.seg button:last-child { border-radius: 0 8px 8px 0; }
button.on { background: var(--accent); color: #12002a; font-weight: 800; }
.paths { display: flex; flex-direction: column; gap: 10px; }
.path { padding: 10px 12px; border-left: 4px solid; display: flex; flex-direction: column; gap: 6px; }
.p0 { border-left-color: #ffc93c; }
.p1 { border-left-color: #5ad1ff; }
.pname { display: flex; justify-content: space-between; align-items: center; }
.pips { display: flex; gap: 4px; }
.pips i { width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 255, 255, 0.12); }
.p0 .pips i.on { background: #ffc93c; box-shadow: 0 0 8px #ffc93c; }
.p1 .pips i.on { background: #5ad1ff; box-shadow: 0 0 8px #5ad1ff; }
.owned { font-size: 12px; color: #9af0a8; }
.up p { margin: 2px 0 0; font-size: 12px; }
.buy { width: 100%; }
.max { color: var(--gold); font-weight: 800; text-align: center; }
.rule { margin: -4px 0 0; text-align: center; }
.sell { background: rgba(255, 90, 106, 0.18); border-color: rgba(255, 90, 106, 0.5); }
</style>
