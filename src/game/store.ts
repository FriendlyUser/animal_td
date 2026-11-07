import { reactive } from 'vue'
import Phaser from 'phaser'
import type { DifficultyId } from './data/difficulty'
import type { TargetMode, TowerId, TowerStats } from './data/towers'
import type { EnemyType } from './data/enemies'
import type { PowerDef } from './data/powers'

export type Screen = 'menu' | 'setup' | 'play' | 'scores' | 'howto'

export interface UpgradeInfo {
  name: string
  desc: string
  cost: number
  locked: boolean
  maxed: boolean
}

export interface SelectedInfo {
  uid: number
  id: TowerId
  name: string
  tiers: [number, number]
  pathNames: [string, string]
  owned: [string[], string[]]
  next: [UpgradeInfo | null, UpgradeInfo | null]
  stats: TowerStats
  kills: number
  damage: number
  sellValue: number
  target: TargetMode
  detecting: boolean
  buffed: boolean
}

export const game = reactive({
  screen: 'menu' as Screen,
  mapId: 'savanna',
  difficultyId: 'medium' as DifficultyId,

  cash: 0,
  lives: 0,
  maxLives: 0,
  wave: 0,
  totalWaves: 0,
  score: 0,
  kills: 0,
  waveActive: false,
  speed: 1,
  paused: false,
  autoStart: false,
  freeplay: false,
  muted: localStorage.getItem('wildguard.muted') === '1',

  placingId: null as TowerId | null,
  selected: null as SelectedInfo | null,
  over: null as null | { won: boolean; saved: boolean },
  boss: null as null | { name: string; frac: number },
  nextWave: [] as { type: EnemyType; count: number }[],
  icons: {} as Record<string, string>,
  costMult: 1,
  powers: [] as (PowerDef & { max: number })[],
  aiming: null as string | null,
  combo: 0,
  bestCombo: 0,
  showDamage: localStorage.getItem('wildguard.dmg') !== '0',
  gameKey: 0,
})

/** Command bus: Vue -> Phaser. */
export const bus = new Phaser.Events.EventEmitter()

export function towerCost(base: number): number {
  return Math.round((base * game.costMult) / 5) * 5
}
