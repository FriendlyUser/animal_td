export type Pt = [number, number]

export interface MapTheme {
  ground: string
  groundDark: string
  groundLight: string
  path: string
  pathEdge: string
  pathLight: string
  deco: 'savanna' | 'jungle' | 'arctic'
}

export interface MapDef {
  id: string
  name: string
  blurb: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  paths: Pt[][]
  theme: MapTheme
  pathWidth: number
}

export const WORLD_W = 1920
export const WORLD_H = 1080

export const MAPS: MapDef[] = [
  {
    id: 'savanna', name: 'Savanna Sunset', level: 'Beginner',
    blurb: 'A long, winding dirt trail across golden grassland.',
    pathWidth: 66,
    theme: {
      ground: '#c9b45a', groundDark: '#a8913e', groundLight: '#e2cf7a',
      path: '#a8763f', pathEdge: '#6e4a24', pathLight: '#c8945a', deco: 'savanna',
    },
    paths: [[
      [-80, 200], [400, 200], [400, 520], [170, 520], [170, 880], [760, 880], [760, 330],
      [1120, 330], [1120, 800], [1500, 800], [1500, 190], [1760, 190], [1760, 620], [2000, 620],
    ]],
  },
  {
    id: 'jungle', name: 'Canopy Crossing', level: 'Intermediate',
    blurb: 'Muddy jungle switchbacks. Shorter path, denser foliage.',
    pathWidth: 64,
    theme: {
      ground: '#3f7d3a', groundDark: '#2c5e2a', groundLight: '#5b9a4b',
      path: '#7a5a36', pathEdge: '#4a3420', pathLight: '#977048', deco: 'jungle',
    },
    paths: [[
      [-80, 540], [300, 540], [300, 180], [700, 180], [700, 900], [1100, 900], [1100, 300],
      [1450, 300], [1450, 720], [2000, 720],
    ]],
  },
  {
    id: 'arctic', name: 'Glacier Gate', level: 'Advanced',
    blurb: 'Two icy routes converge at the gate. Aliens alternate lanes.',
    pathWidth: 62,
    theme: {
      ground: '#dfeaf3', groundDark: '#b9cddd', groundLight: '#f6fbff',
      path: '#86b4d4', pathEdge: '#4d7fa3', pathLight: '#b7d9ef', deco: 'arctic',
    },
    paths: [
      [[-80, 240], [520, 240], [520, 540], [1400, 540], [1400, 240], [2000, 240]],
      [[-80, 840], [520, 840], [520, 540], [1400, 540], [1400, 840], [2000, 840]],
    ],
  },
]

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? MAPS[0]
}

export class Path {
  pts: { x: number; y: number }[]
  cum: number[] = [0]
  total = 0

  constructor(points: Pt[]) {
    this.pts = points.map(([x, y]) => ({ x, y }))
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i]
      this.total += Math.hypot(b.x - a.x, b.y - a.y)
      this.cum.push(this.total)
    }
  }

  at(d: number): { x: number; y: number; angle: number } {
    const dist = Math.max(0, Math.min(this.total, d))
    let i = 1
    while (i < this.cum.length - 1 && this.cum[i] < dist) i++
    const a = this.pts[i - 1], b = this.pts[i]
    const seg = this.cum[i] - this.cum[i - 1] || 1
    const t = (dist - this.cum[i - 1]) / seg
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) }
  }

  distTo(x: number, y: number): number {
    let best = Infinity
    for (let i = 1; i < this.pts.length; i++) {
      best = Math.min(best, segDist(x, y, this.pts[i - 1], this.pts[i]))
    }
    return best
  }
}

function segDist(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2))
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t))
}
