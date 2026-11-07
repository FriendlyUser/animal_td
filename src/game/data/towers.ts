export type TargetMode = 'first' | 'last' | 'strong' | 'close'
export type AttackKind = 'projectile' | 'hitscan' | 'stomp' | 'chain' | 'lob' | 'support'
export type TowerId = 'porcupine' | 'eagle' | 'elephant' | 'hive' | 'frog' | 'owl' | 'lion' | 'gorilla'

export interface TowerStats {
  range: number
  rate: number // attacks per second
  damage: number
  pierce: number
  projSpeed: number
  splash: number
  detect: boolean
  armorPierce: boolean
  slow: number // fraction of speed removed
  slowDur: number
  stun: number
  poisonDps: number
  poisonDur: number
  shots: number
  spread: number
  radial: number
  chains: number
  homing: boolean
  shred: number
  cluster: number
  buffRate: number
  buffRange: number
  buffDamage: number
  income: number
  detectAura: boolean
  globalDetect: boolean
}

export interface Upgrade {
  name: string
  desc: string
  cost: number
  apply: (s: TowerStats) => void
}

export interface TowerDef {
  id: TowerId
  name: string
  desc: string
  cost: number
  kind: AttackKind
  rotates: boolean
  projectile?: string
  color: string
  base: Partial<TowerStats>
  paths: [Upgrade[], Upgrade[]]
  pathNames: [string, string]
}

export const DEFAULT_STATS: TowerStats = {
  range: 150, rate: 1, damage: 1, pierce: 1, projSpeed: 600, splash: 0,
  detect: false, armorPierce: false, slow: 0, slowDur: 0, stun: 0,
  poisonDps: 0, poisonDur: 0, shots: 1, spread: 0.2, radial: 0, chains: 0,
  homing: false, shred: 0, cluster: 0, buffRate: 0, buffRange: 0, buffDamage: 0,
  income: 0, detectAura: false, globalDetect: false,
}

export const TOWERS: TowerDef[] = [
  {
    id: 'porcupine', name: 'Quill Porcupine', color: '#c98b4f',
    desc: 'Cheap and reliable. Fires piercing quills.',
    cost: 200, kind: 'projectile', rotates: true, projectile: 'p_quill',
    base: { range: 170, rate: 1.3, damage: 2, pierce: 2, projSpeed: 780 },
    pathNames: ['Spines', 'Bristle'],
    paths: [
      [
        { name: 'Sharpened Quills', desc: '+1 damage, +1 pierce', cost: 150, apply: (s) => { s.damage += 1; s.pierce += 1 } },
        { name: 'Barbed Spines', desc: '+2 damage, +3 pierce', cost: 380, apply: (s) => { s.damage += 2; s.pierce += 3 } },
        { name: 'Quill Tempest', desc: 'Also bursts 8 quills in every direction', cost: 1400, apply: (s) => { s.radial = 8; s.damage += 3; s.rate *= 1.3 } },
      ],
      [
        { name: 'Quick Bristle', desc: '+35% attack speed', cost: 120, apply: (s) => { s.rate *= 1.35 } },
        { name: 'Long Spines', desc: '+50 range, faster quills', cost: 250, apply: (s) => { s.range += 50; s.projSpeed += 200 } },
        { name: 'Triple Volley', desc: 'Fires 3 quills at once and sees cloaked aliens', cost: 950, apply: (s) => { s.shots = 3; s.spread = 0.22; s.detect = true } },
      ],
    ],
  },
  {
    id: 'eagle', name: 'Sky Eagle', color: '#8a5a35',
    desc: 'Sniper with unlimited range. Detects cloaked aliens.',
    cost: 350, kind: 'hitscan', rotates: true,
    base: { range: 4000, rate: 0.7, damage: 8, detect: true },
    pathNames: ['Talons', 'Wings'],
    paths: [
      [
        { name: 'Keen Talons', desc: '+8 damage', cost: 300, apply: (s) => { s.damage += 8 } },
        { name: 'Razor Talons', desc: '+16 damage, ignores armor', cost: 950, apply: (s) => { s.damage += 16; s.armorPierce = true } },
        { name: 'Apex Dive', desc: '+50 damage and stuns', cost: 3000, apply: (s) => { s.damage += 50; s.stun = 0.6 } },
      ],
      [
        { name: 'Swift Wings', desc: '+50% attack speed', cost: 250, apply: (s) => { s.rate *= 1.5 } },
        { name: 'Rending Strike', desc: '+40% speed, strips 2 armor per hit', cost: 650, apply: (s) => { s.rate *= 1.4; s.shred = 2 } },
        { name: 'Hunting Flight', desc: 'Double attack speed', cost: 2200, apply: (s) => { s.rate *= 2 } },
      ],
    ],
  },
  {
    id: 'elephant', name: 'War Elephant', color: '#8d99a6',
    desc: 'Stomps every alien in range and briefly stuns them.',
    cost: 500, kind: 'stomp', rotates: false,
    base: { range: 125, rate: 0.55, damage: 4, stun: 0.25, pierce: 999 },
    pathNames: ['Tremor', 'Herd'],
    paths: [
      [
        { name: 'Heavy Stomp', desc: '+4 damage, +20 range', cost: 350, apply: (s) => { s.damage += 4; s.range += 20 } },
        { name: 'Tremor', desc: 'Longer stun, +6 damage', cost: 900, apply: (s) => { s.stun = 0.8; s.damage += 6 } },
        { name: 'Earthquake', desc: '+30 damage, shreds 3 armor, +40 range', cost: 3200, apply: (s) => { s.damage += 30; s.shred = 3; s.range += 40 } },
      ],
      [
        { name: 'Trumpet Blast', desc: '+40% stomp speed', cost: 300, apply: (s) => { s.rate *= 1.4 } },
        { name: 'Muddy Ground', desc: 'Stomps slow aliens by 50%', cost: 650, apply: (s) => { s.slow = 0.5; s.slowDur = 2 } },
        { name: 'Stampede', desc: 'Double stomp speed, +6 damage', cost: 2500, apply: (s) => { s.rate *= 2; s.damage += 6 } },
      ],
    ],
  },
  {
    id: 'hive', name: 'Hive Swarm', color: '#f2b632',
    desc: 'Releases homing bees that chase aliens down.',
    cost: 400, kind: 'projectile', rotates: false, projectile: 'p_bee',
    base: { range: 230, rate: 2, damage: 2, pierce: 1, projSpeed: 400, homing: true },
    pathNames: ['Venom', 'Colony'],
    paths: [
      [
        { name: 'Venom Stingers', desc: 'Bees poison for 3 dmg/s', cost: 300, apply: (s) => { s.poisonDps += 3; s.poisonDur = 3 } },
        { name: 'Twin Swarm', desc: '2 bees per attack', cost: 650, apply: (s) => { s.shots = 2; s.spread = 0.5 } },
        { name: "Queen's Fury", desc: '4 bees, +5 damage, heavy poison', cost: 2600, apply: (s) => { s.shots = 4; s.spread = 0.4; s.damage += 5; s.poisonDps += 10 } },
      ],
      [
        { name: 'Busy Bees', desc: '+40% attack speed', cost: 250, apply: (s) => { s.rate *= 1.4 } },
        { name: 'Scout Drones', desc: '+70 range, detects cloaked', cost: 420, apply: (s) => { s.range += 70; s.detect = true } },
        { name: 'Hyper Hive', desc: 'Double attack speed, +2 pierce', cost: 1800, apply: (s) => { s.rate *= 2; s.pierce += 2 } },
      ],
    ],
  },
  {
    id: 'frog', name: 'Toxic Frog', color: '#4fbf4a',
    desc: 'Spits splash globs that poison everything nearby.',
    cost: 300, kind: 'lob', rotates: true, projectile: 'p_glob',
    base: { range: 165, rate: 0.9, damage: 2, splash: 55, poisonDps: 2, poisonDur: 3, projSpeed: 560 },
    pathNames: ['Toxin', 'Goo'],
    paths: [
      [
        { name: 'Toxic Sacs', desc: '+4 poison dmg/s', cost: 250, apply: (s) => { s.poisonDps += 4 } },
        { name: 'Big Gulp', desc: '+30 splash, +2 damage', cost: 500, apply: (s) => { s.splash += 30; s.damage += 2 } },
        { name: 'Plague Toad', desc: '+20 poison dmg/s, huge splash', cost: 2400, apply: (s) => { s.poisonDps += 20; s.splash += 30; s.poisonDur = 4 } },
      ],
      [
        { name: 'Sticky Spit', desc: 'Slows aliens by 30%', cost: 200, apply: (s) => { s.slow = 0.3; s.slowDur = 1.5 } },
        { name: 'Glue Glob', desc: 'Slows by 55% for longer', cost: 450, apply: (s) => { s.slow = 0.55; s.slowDur = 2.5 } },
        { name: 'Acid Spit', desc: 'Shreds 3 armor, +6 damage, faster', cost: 1600, apply: (s) => { s.shred = 3; s.damage += 6; s.rate *= 1.3 } },
      ],
    ],
  },
  {
    id: 'owl', name: 'Mystic Owl', color: '#9b7bd1',
    desc: 'Chain lightning. Lets nearby towers see cloaked aliens.',
    cost: 450, kind: 'chain', rotates: false,
    base: { range: 200, rate: 0.8, damage: 4, chains: 3, detect: true, detectAura: true },
    pathNames: ['Storm', 'Wisdom'],
    paths: [
      [
        { name: 'Arc Spark', desc: 'Lightning jumps to 2 more aliens', cost: 350, apply: (s) => { s.chains += 2 } },
        { name: 'Thunder Talon', desc: '+8 damage', cost: 1000, apply: (s) => { s.damage += 8 } },
        { name: 'Storm Sage', desc: '+6 chains, +20 damage, stuns', cost: 3500, apply: (s) => { s.chains += 6; s.damage += 20; s.stun = 0.3 } },
      ],
      [
        { name: 'Wise Gaze', desc: '+60 range (and aura)', cost: 250, apply: (s) => { s.range += 60 } },
        { name: 'Night Focus', desc: '+60% attack speed', cost: 600, apply: (s) => { s.rate *= 1.6 } },
        { name: 'All-Seeing Eye', desc: 'Every tower on the map detects cloaked', cost: 2000, apply: (s) => { s.globalDetect = true; s.rate *= 1.3; s.damage += 4 } },
      ],
    ],
  },
  {
    id: 'lion', name: 'Pride Lion', color: '#e39a3b',
    desc: 'Support. Roars to speed up nearby towers. Can earn income.',
    cost: 700, kind: 'support', rotates: false,
    base: { range: 180, rate: 0, damage: 0, buffRate: 0.15, buffRange: 0.1 },
    pathNames: ['Roar', 'Tribute'],
    paths: [
      [
        { name: 'Rallying Roar', desc: 'Buff becomes +25% speed', cost: 500, apply: (s) => { s.buffRate = 0.25 } },
        { name: 'Pride Strength', desc: '+30% speed and +1 damage buff', cost: 1200, apply: (s) => { s.buffRate = 0.3; s.buffDamage = 1 } },
        { name: 'King of Beasts', desc: '+50% speed, +3 damage, bigger aura', cost: 4000, apply: (s) => { s.buffRate = 0.5; s.buffDamage = 3; s.range += 60 } },
      ],
      [
        { name: 'Pride Tribute', desc: 'Earn $80 each wave', cost: 400, apply: (s) => { s.income = 80 } },
        { name: 'Royal Treasury', desc: 'Earn $220 each wave', cost: 950, apply: (s) => { s.income = 220 } },
        { name: 'Golden Savanna', desc: 'Earn $650 each wave', cost: 2800, apply: (s) => { s.income = 650 } },
      ],
    ],
  },
  {
    id: 'gorilla', name: 'Boulder Gorilla', color: '#5b5f6b',
    desc: 'Hurls boulders that smash groups of aliens.',
    cost: 600, kind: 'lob', rotates: true, projectile: 'p_boulder',
    base: { range: 260, rate: 0.6, damage: 8, splash: 70, projSpeed: 480 },
    pathNames: ['Might', 'Fury'],
    paths: [
      [
        { name: 'Granite Fists', desc: '+8 damage', cost: 450, apply: (s) => { s.damage += 8 } },
        { name: 'Heavy Boulders', desc: '+40 splash, +8 damage', cost: 1000, apply: (s) => { s.splash += 40; s.damage += 8 } },
        { name: 'Avalanche', desc: '+50 damage and stuns', cost: 3800, apply: (s) => { s.damage += 50; s.stun = 0.4 } },
      ],
      [
        { name: 'Fast Hands', desc: '+40% attack speed', cost: 400, apply: (s) => { s.rate *= 1.4 } },
        { name: 'Shattering Rocks', desc: 'Boulders burst into 4 fragments', cost: 900, apply: (s) => { s.cluster = 4 } },
        { name: 'Primal Rage', desc: 'Double speed, ignores armor', cost: 3000, apply: (s) => { s.rate *= 2; s.armorPierce = true } },
      ],
    ],
  },
]

export function getTower(id: TowerId): TowerDef {
  const t = TOWERS.find((t) => t.id === id)
  if (!t) throw new Error(`Unknown tower ${id}`)
  return t
}

export function computeStats(def: TowerDef, tiers: [number, number]): TowerStats {
  const s: TowerStats = { ...DEFAULT_STATS, ...def.base }
  for (let p = 0; p < 2; p++) {
    for (let t = 0; t < tiers[p]; t++) def.paths[p][t].apply(s)
  }
  return s
}

/** At most one path may go past tier 2. */
export function canUpgradePath(tiers: [number, number], path: 0 | 1): boolean {
  const next = tiers[path] + 1
  const other = tiers[path === 0 ? 1 : 0]
  if (next > 3) return false
  return !(next > 2 && other > 2)
}

export const TOWER_FOOTPRINT = 30
