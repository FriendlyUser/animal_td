export type EnemyType =
  | 'grunt' | 'zipper' | 'blob' | 'miniblob' | 'cloaker'
  | 'armored' | 'shielder' | 'healer' | 'brute' | 'mothership' | 'golden'

export interface EnemyDef {
  id: EnemyType
  name: string
  desc: string
  hp: number
  speed: number
  armor: number
  reward: number
  lives: number
  radius: number
  threat: number
  unlock: number
  cloaked?: boolean
  shield?: number
  heal?: { perSec: number; radius: number }
  splits?: { type: EnemyType; count: number }
  spawns?: { type: EnemyType; every: number }
  boss?: boolean
  golden?: boolean
  faces?: boolean
  tint: number
}

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  grunt: {
    id: 'grunt', name: 'Glorp Grunt', desc: 'Basic one-eyed invader.',
    hp: 6, speed: 75, armor: 0, reward: 2, lives: 1, radius: 18, threat: 1, unlock: 1, tint: 0x7dff6a,
  },
  zipper: {
    id: 'zipper', name: 'Zip Drone', desc: 'Fragile but very fast.',
    hp: 4, speed: 165, armor: 0, reward: 2, lives: 1, radius: 14, threat: 1.2, unlock: 3, faces: true, tint: 0xc77dff,
  },
  blob: {
    id: 'blob', name: 'Gloop Blob', desc: 'Splits into 3 mini blobs when destroyed.',
    hp: 16, speed: 55, armor: 0, reward: 3, lives: 2, radius: 24, threat: 3, unlock: 5,
    splits: { type: 'miniblob', count: 3 }, tint: 0x5ee7ff,
  },
  miniblob: {
    id: 'miniblob', name: 'Mini Gloop', desc: 'Leftover blob.',
    hp: 5, speed: 90, armor: 0, reward: 1, lives: 1, radius: 13, threat: 1, unlock: 999, tint: 0x5ee7ff,
  },
  cloaker: {
    id: 'cloaker', name: 'Phase Stalker', desc: 'Cloaked. Needs detection (Eagle, Owl, upgrades).',
    hp: 12, speed: 95, armor: 0, reward: 4, lives: 2, radius: 17, threat: 2.2, unlock: 8, cloaked: true, tint: 0xa66bff,
  },
  armored: {
    id: 'armored', name: 'Plated Walker', desc: 'Armor reduces every hit. Use big hits or armor piercing.',
    hp: 35, speed: 50, armor: 2, reward: 5, lives: 2, radius: 21, threat: 4, unlock: 10, tint: 0xb8c4d6,
  },
  shielder: {
    id: 'shielder', name: 'Shield Saucer', desc: 'Regenerating energy shield. Poison bypasses it.',
    hp: 25, speed: 65, armor: 0, reward: 5, lives: 2, radius: 21, threat: 4, unlock: 13, shield: 30, tint: 0x5cc8ff,
  },
  healer: {
    id: 'healer', name: 'Mender Orb', desc: 'Heals nearby aliens. Kill it first!',
    hp: 30, speed: 60, armor: 0, reward: 5, lives: 2, radius: 18, threat: 3.5, unlock: 16,
    heal: { perSec: 4, radius: 120 }, tint: 0xff7ac8,
  },
  brute: {
    id: 'brute', name: 'Krog Brute', desc: 'Huge, heavily armored. Costs 10 lives.',
    hp: 260, speed: 38, armor: 5, reward: 25, lives: 10, radius: 34, threat: 32, unlock: 18, tint: 0xff5a4a,
  },
  mothership: {
    id: 'mothership', name: 'Xal Mothership', desc: 'Boss. Deploys grunts as it flies.',
    hp: 2000, speed: 34, armor: 8, reward: 500, lives: 100, radius: 72, threat: 300, unlock: 999,
    spawns: { type: 'grunt', every: 2.5 }, boss: true, tint: 0x9effa0,
  },
  golden: {
    id: 'golden', name: 'Gilded Scout', desc: 'Rare treasure ship. Pop it for a big cash bonus before it escapes!',
    hp: 30, speed: 140, armor: 0, reward: 60, lives: 0, radius: 17, threat: 0, unlock: 999, golden: true, tint: 0xffd84a,
  },
}

/** HP multiplier applied to every alien as waves progress. */
export function hpScale(wave: number): number {
  const late = Math.max(0, wave - 30)
  return 1 + (wave - 1) * 0.055 + Math.pow(late, 1.5) * 0.03
}

export function armorBonus(wave: number): number {
  return Math.floor(wave / 15)
}
