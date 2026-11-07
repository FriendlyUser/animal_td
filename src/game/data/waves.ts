import { ENEMIES, type EnemyType } from './enemies'

export interface SpawnGroup {
  type: EnemyType
  count: number
  interval: number
  delay: number
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SCRIPTED: Record<number, SpawnGroup[]> = {
  1: [{ type: 'grunt', count: 12, interval: 0.9, delay: 0 }],
  2: [{ type: 'grunt', count: 20, interval: 0.6, delay: 0 }],
  3: [{ type: 'grunt', count: 14, interval: 0.6, delay: 0 }, { type: 'zipper', count: 6, interval: 0.8, delay: 4 }],
  4: [{ type: 'grunt', count: 22, interval: 0.45, delay: 0 }, { type: 'zipper', count: 12, interval: 0.5, delay: 3 }],
  5: [{ type: 'blob', count: 6, interval: 1.4, delay: 0 }, { type: 'grunt', count: 18, interval: 0.5, delay: 2 }],
  8: [{ type: 'cloaker', count: 6, interval: 1.2, delay: 0 }, { type: 'grunt', count: 20, interval: 0.4, delay: 1 }],
  10: [{ type: 'armored', count: 8, interval: 1.1, delay: 0 }, { type: 'zipper', count: 20, interval: 0.3, delay: 3 }],
}

/** Waves are deterministic per wave number so leaderboard runs are fair. */
export function buildWave(n: number): SpawnGroup[] {
  if (SCRIPTED[n]) return SCRIPTED[n].map((g) => ({ ...g }))
  const rand = mulberry32(n * 9973 + 17)
  const groups: SpawnGroup[] = []
  let budget = 12 + n * 5 + n * n * 0.26

  if (n % 20 === 0 || n === 50) {
    const bosses = n >= 50 ? 2 : n >= 40 ? 1 : 1
    groups.push({ type: 'mothership', count: bosses, interval: 12, delay: 4 })
    budget *= 0.35
  } else if (n % 10 === 0 && n >= 18) {
    const count = Math.max(1, Math.floor(n / 10))
    groups.push({ type: 'brute', count, interval: 3, delay: 2 })
    budget -= count * ENEMIES.brute.threat * 0.6
  }

  const unlocked = (Object.values(ENEMIES) as typeof ENEMIES[EnemyType][])
    .filter((e) => e.unlock <= n && !e.boss && e.id !== 'brute')
    .map((e) => e.id)
  if (n >= 24) unlocked.push('brute')

  const typeCount = Math.min(unlocked.length, 2 + Math.floor(rand() * 3))
  const picks: EnemyType[] = []
  // Bias toward newest enemy types
  while (picks.length < typeCount) {
    const r = Math.pow(rand(), 0.6)
    const t = unlocked[Math.min(unlocked.length - 1, Math.floor(r * unlocked.length))]
    if (!picks.includes(t)) picks.push(t)
  }

  let delay = 0
  picks.forEach((type, i) => {
    const share = budget * (i === 0 ? 0.45 : 0.55 / (picks.length - 1 || 1))
    const def = ENEMIES[type]
    const count = Math.max(1, Math.round(share / def.threat))
    const interval = Math.max(0.12, Math.min(1.4, (14 + n * 0.25) / count / (1 + n / 40)))
    groups.push({ type, count, interval, delay })
    delay += Math.min(6, count * interval * 0.5)
  })
  // Rare golden treasure ship (rolled last so it doesn't change the rest of the wave)
  if (n >= 3 && rand() < 0.3) groups.push({ type: 'golden', count: 1, interval: 1, delay: 3 + rand() * 8 })
  return groups
}

export function summarizeWave(groups: SpawnGroup[]): { type: EnemyType; count: number }[] {
  const map = new Map<EnemyType, number>()
  for (const g of groups) map.set(g.type, (map.get(g.type) ?? 0) + g.count)
  return [...map.entries()].map(([type, count]) => ({ type, count }))
}
