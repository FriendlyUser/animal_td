export type PowerId = 'roar' | 'stampede' | 'strike'

export interface PowerDef {
  id: PowerId
  name: string
  icon: string
  key: string
  desc: string
  cd: number // cooldown in game seconds (only ticks during waves)
}

export const POWERS: PowerDef[] = [
  { id: 'roar', name: 'Thunder Roar', icon: '🦁', key: 'R', desc: 'Stuns every alien on the map.', cd: 50 },
  { id: 'stampede', name: 'Stampede', icon: '🐘', key: 'S', desc: 'A herd charges up the trail, trampling and knocking back aliens.', cd: 75 },
  { id: 'strike', name: 'Eagle Strike', icon: '🦅', key: 'D', desc: 'Click a spot and eagles dive-bomb it.', cd: 35 },
]

export const COMBO_TIERS: { at: number; name: string; color: string }[] = [
  { at: 15, name: 'KILLING SPREE', color: '#7aff8a' },
  { at: 30, name: 'RAMPAGE', color: '#5ad1ff' },
  { at: 60, name: 'UNSTOPPABLE', color: '#c88aff' },
  { at: 100, name: 'WILD FURY', color: '#ffb347' },
  { at: 200, name: 'APEX PREDATOR', color: '#ff5a6a' },
]
