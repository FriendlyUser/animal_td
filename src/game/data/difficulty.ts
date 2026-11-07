export type DifficultyId = 'easy' | 'medium' | 'hard' | 'impossible'

export interface Difficulty {
  id: DifficultyId
  name: string
  tagline: string
  lives: number
  startCash: number
  costMult: number
  hpMult: number
  speedMult: number
  cashMult: number
  waves: number
  scoreMult: number
  color: string
}

export const DIFFICULTIES: Difficulty[] = [
  {
    id: 'easy', name: 'Cub', tagline: 'Gentle invasion. 30 waves, lots of lives.',
    lives: 200, startCash: 750, costMult: 0.85, hpMult: 0.8, speedMult: 0.95, cashMult: 1.1,
    waves: 30, scoreMult: 1, color: '#5ad16b',
  },
  {
    id: 'medium', name: 'Pack', tagline: 'The standard hunt. 40 waves.',
    lives: 150, startCash: 650, costMult: 1, hpMult: 1, speedMult: 1, cashMult: 1,
    waves: 40, scoreMult: 1.5, color: '#f5c542',
  },
  {
    id: 'hard', name: 'Apex', tagline: 'Tougher, faster aliens. 50 waves.',
    lives: 100, startCash: 600, costMult: 1.08, hpMult: 1.25, speedMult: 1.08, cashMult: 0.95,
    waves: 50, scoreMult: 2.25, color: '#f0803c',
  },
  {
    id: 'impossible', name: 'Extinction', tagline: 'One life. One leak and the kingdom falls.',
    lives: 1, startCash: 600, costMult: 1.15, hpMult: 1.45, speedMult: 1.12, cashMult: 0.9,
    waves: 50, scoreMult: 4, color: '#e0445a',
  },
]

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]
}
