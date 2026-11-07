import Phaser from 'phaser'
import { Path, WORLD_H, WORLD_W, type MapDef } from './data/maps'
import { mulberry32 } from './data/waves'

type Ctx = CanvasRenderingContext2D

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const tex = scene.textures.createCanvas(key, w, h)!
  const c = tex.getContext()
  c.lineCap = 'round'
  c.lineJoin = 'round'
  draw(c)
  tex.refresh()
}

function rg(c: Ctx, x: number, y: number, r: number, inner: string, outer: string) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  return g
}

function circ(c: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient, stroke?: string, lw = 2) {
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke() }
}

function ell(c: Ctx, x: number, y: number, rx: number, ry: number, rot: number, fill: string | CanvasGradient, stroke?: string, lw = 2) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke() }
}

function poly(c: Ctx, pts: number[][], fill: string | CanvasGradient, stroke?: string, lw = 2) {
  c.beginPath()
  c.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1])
  c.closePath()
  c.fillStyle = fill
  c.fill()
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke() }
}

function shadowOn(c: Ctx, blur = 10, oy = 5, alpha = 0.4) {
  c.shadowColor = `rgba(0,0,0,${alpha})`
  c.shadowBlur = blur
  c.shadowOffsetY = oy
}
function shadowOff(c: Ctx) {
  c.shadowColor = 'transparent'
  c.shadowBlur = 0
  c.shadowOffsetY = 0
}

function eye(c: Ctx, x: number, y: number, r: number, iris = '#111') {
  circ(c, x, y, r, '#fff')
  circ(c, x, y + r * 0.1, r * 0.6, iris)
  circ(c, x - r * 0.3, y - r * 0.3, r * 0.28, 'rgba(255,255,255,0.9)')
}

function gloss(c: Ctx, x: number, y: number, rx: number, ry: number) {
  ell(c, x, y, rx, ry, -0.4, 'rgba(255,255,255,0.28)')
}

// ---------------- Towers (128x128, facing up) ----------------

const TOWER_DRAW: Record<string, (c: Ctx) => void> = {
  porcupine(c) {
    for (let i = 0; i <= 30; i++) {
      const a = (-15 + (i / 30) * 210) * (Math.PI / 180)
      const len = 34 + ((i * 7) % 11)
      const x2 = 64 + Math.cos(a) * len, y2 = 70 + Math.sin(a) * len
      c.lineWidth = 3.2; c.strokeStyle = '#2e1d10'
      c.beginPath(); c.moveTo(64, 70); c.lineTo(x2, y2); c.stroke()
      c.lineWidth = 2.2; c.strokeStyle = '#f3e6cf'
      c.beginPath(); c.moveTo(64 + Math.cos(a) * (len - 8), 70 + Math.sin(a) * (len - 8)); c.lineTo(x2, y2); c.stroke()
    }
    shadowOn(c, 6, 3, 0.3)
    ell(c, 64, 72, 28, 31, 0, rg(c, 64, 72, 31, '#9a6a3e', '#4e3018'))
    shadowOff(c)
    circ(c, 52, 32, 6, '#7a5232'); circ(c, 76, 32, 6, '#7a5232')
    circ(c, 64, 40, 18, rg(c, 64, 40, 18, '#f0d2a8', '#b78a5c'), '#6b4526', 1.5)
    circ(c, 64, 25, 5, '#1b1b1b')
    eye(c, 56, 36, 4.2); eye(c, 72, 36, 4.2)
  },
  eagle(c) {
    shadowOn(c, 8, 4, 0.35)
    for (const s of [-1, 1]) {
      ell(c, 64 + s * 32, 66, 36, 13, s * 0.22, rg(c, 64 + s * 32, 66, 36, '#8b5a32', '#3d2410'))
    }
    shadowOff(c)
    for (const s of [-1, 1]) {
      c.strokeStyle = 'rgba(30,15,5,0.6)'; c.lineWidth = 1.5
      for (let i = 0; i < 5; i++) {
        c.beginPath(); c.moveTo(64 + s * (20 + i * 9), 60 + i * 1.5); c.lineTo(64 + s * (24 + i * 9), 76 + i * 0.8); c.stroke()
      }
      ell(c, 64 + s * 62, 70, 8, 6, 0, '#f5f0e6')
    }
    poly(c, [[64, 86], [48, 118], [64, 110], [80, 118]], rg(c, 64, 100, 20, '#f5f0e6', '#c9c0b0'), '#5a4632', 1.5)
    ell(c, 64, 70, 17, 27, 0, rg(c, 64, 70, 27, '#a0693a', '#4d2c12'))
    circ(c, 64, 40, 15, rg(c, 64, 40, 15, '#ffffff', '#d8d2c6'), '#8a8070', 1.5)
    poly(c, [[57, 30], [64, 14], [71, 30]], '#f5b82e', '#9a6a10', 1.5)
    eye(c, 57, 38, 3.4, '#e09b1a'); eye(c, 71, 38, 3.4, '#e09b1a')
  },
  elephant(c) {
    shadowOn(c, 8, 4, 0.35)
    for (const s of [-1, 1]) {
      ell(c, 64 + s * 32, 62, 22, 29, s * 0.2, rg(c, 64 + s * 32, 62, 29, '#a9b4bf', '#5d6872'))
    }
    shadowOff(c)
    for (const s of [-1, 1]) ell(c, 64 + s * 33, 63, 13, 19, s * 0.2, 'rgba(232,160,170,0.7)')
    shadowOn(c, 6, 3, 0.3)
    circ(c, 64, 78, 30, rg(c, 64, 78, 30, '#b5c0ca', '#626d78'))
    shadowOff(c)
    circ(c, 64, 50, 23, rg(c, 64, 50, 23, '#c3cdd6', '#75808a'))
    c.strokeStyle = '#f8f3e6'; c.lineWidth = 5
    c.beginPath(); c.moveTo(55, 58); c.quadraticCurveTo(46, 44, 50, 30); c.stroke()
    c.beginPath(); c.moveTo(73, 58); c.quadraticCurveTo(82, 44, 78, 30); c.stroke()
    c.strokeStyle = '#7d8893'; c.lineWidth = 12
    c.beginPath(); c.moveTo(64, 58); c.quadraticCurveTo(64, 34, 62, 12); c.stroke()
    c.strokeStyle = '#a7b2bc'; c.lineWidth = 8
    c.beginPath(); c.moveTo(64, 58); c.quadraticCurveTo(64, 34, 62, 13); c.stroke()
    c.strokeStyle = 'rgba(60,70,80,0.5)'; c.lineWidth = 1.2
    for (let y = 20; y < 52; y += 6) { c.beginPath(); c.moveTo(59, y); c.lineTo(68, y); c.stroke() }
    eye(c, 52, 48, 3.5); eye(c, 76, 48, 3.5)
    gloss(c, 54, 66, 10, 6)
  },
  hive(c) {
    const hex = (cx: number, cy: number, r: number) => {
      const pts: number[][] = []
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]) }
      return pts
    }
    shadowOn(c, 10, 5, 0.4)
    poly(c, hex(64, 66, 42), rg(c, 64, 66, 42, '#ffd75e', '#c47a10'), '#7a4508', 3)
    shadowOff(c)
    const cells = [[0, 0], [0, -20], [0, 20], [-17, -10], [17, -10], [-17, 10], [17, 10]]
    for (const [dx, dy] of cells) poly(c, hex(64 + dx, 66 + dy, 10), 'rgba(255,220,110,0.55)', 'rgba(140,80,10,0.8)', 1.5)
    ell(c, 64, 86, 9, 6, 0, '#3a1f05')
    const bee = (x: number, y: number, r: number) => {
      ell(c, x - 4, y - 6, 6, 4, -0.5, 'rgba(255,255,255,0.85)')
      ell(c, x + 4, y - 6, 6, 4, 0.5, 'rgba(255,255,255,0.85)')
      ell(c, x, y, 9, 6, r, '#ffd02a', '#1a1a1a', 1.5)
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 2.4
      c.beginPath(); c.moveTo(x - 1, y - 5); c.lineTo(x - 1, y + 5); c.moveTo(x + 4, y - 5); c.lineTo(x + 4, y + 5); c.stroke()
    }
    bee(22, 26, 0.2); bee(104, 34, -0.3); bee(100, 104, 0.4)
  },
  frog(c) {
    shadowOn(c, 8, 4, 0.35)
    for (const s of [-1, 1]) {
      ell(c, 64 + s * 32, 94, 14, 22, s * -0.6, rg(c, 64 + s * 32, 94, 22, '#5cc24e', '#21661d'))
      ell(c, 64 + s * 30, 46, 7, 13, s * 0.6, '#3e9a35')
    }
    ell(c, 64, 70, 32, 35, 0, rg(c, 64, 70, 35, '#8ae86f', '#2b8a26'))
    shadowOff(c)
    for (const [x, y, r] of [[52, 80, 5], [76, 74, 6], [66, 94, 4], [48, 62, 3.5], [80, 92, 3.5]]) circ(c, x, y, r, 'rgba(30,90,20,0.55)')
    for (const s of [-1, 1]) {
      circ(c, 64 + s * 17, 38, 13, rg(c, 64 + s * 17, 38, 13, '#9df07f', '#3a9a30'))
      circ(c, 64 + s * 17, 37, 9, rg(c, 64 + s * 17, 37, 9, '#ffe85a', '#d49a10'))
      ell(c, 64 + s * 17, 37, 6, 2.6, 0, '#111')
      circ(c, 64 + s * 17 - 3, 34, 2, '#fff')
    }
    c.strokeStyle = '#1d5a18'; c.lineWidth = 2
    c.beginPath(); c.moveTo(48, 50); c.quadraticCurveTo(64, 58, 80, 50); c.stroke()
    gloss(c, 54, 62, 10, 6)
  },
  owl(c) {
    const glow = c.createRadialGradient(64, 64, 10, 64, 64, 62)
    glow.addColorStop(0, 'rgba(170,120,255,0.55)'); glow.addColorStop(1, 'rgba(170,120,255,0)')
    circ(c, 64, 64, 62, glow)
    poly(c, [[36, 40], [30, 14], [50, 32]], '#5a4030')
    poly(c, [[92, 40], [98, 14], [78, 32]], '#5a4030')
    shadowOn(c, 8, 4, 0.35)
    ell(c, 64, 68, 36, 42, 0, rg(c, 64, 68, 42, '#9a7456', '#4a3222'))
    shadowOff(c)
    ell(c, 64, 84, 20, 22, 0, 'rgba(240,225,200,0.75)')
    c.strokeStyle = 'rgba(90,60,40,0.7)'; c.lineWidth = 1.8
    for (const [x, y] of [[56, 76], [72, 76], [64, 86], [56, 96], [72, 96]]) { c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x, y + 4); c.lineTo(x + 4, y); c.stroke() }
    for (const s of [-1, 1]) {
      circ(c, 64 + s * 16, 52, 18, rg(c, 64 + s * 16, 52, 18, '#fbf1dd', '#cfb995'))
      circ(c, 64 + s * 16, 52, 12, rg(c, 64 + s * 16, 52, 12, '#ffd34d', '#e0761a'))
      circ(c, 64 + s * 16, 52, 6.5, '#111')
      circ(c, 64 + s * 16 - 3, 49, 2.6, '#fff')
    }
    poly(c, [[58, 60], [70, 60], [64, 72]], '#e3a32a', '#8a5a10', 1.2)
  },
  lion(c) {
    const pts: number[][] = []
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2
      const r = i % 2 === 0 ? 56 : 44
      pts.push([64 + Math.cos(a) * r, 66 + Math.sin(a) * r])
    }
    shadowOn(c, 10, 5, 0.4)
    poly(c, pts, rg(c, 64, 66, 56, '#d9822b', '#6e3510'))
    shadowOff(c)
    circ(c, 42, 36, 9, '#d59a3a', '#7a4a14', 1.5); circ(c, 86, 36, 9, '#d59a3a', '#7a4a14', 1.5)
    circ(c, 64, 64, 31, rg(c, 64, 64, 31, '#f7cb6a', '#c98a2a'))
    circ(c, 56, 78, 10, '#fbe8c0'); circ(c, 72, 78, 10, '#fbe8c0')
    poly(c, [[57, 68], [71, 68], [64, 76]], '#5a2e14')
    eye(c, 53, 58, 4.6, '#b8701a'); eye(c, 75, 58, 4.6, '#b8701a')
    c.strokeStyle = '#5a2e14'; c.lineWidth = 1.6
    c.beginPath(); c.moveTo(64, 76); c.lineTo(64, 84); c.stroke()
    gloss(c, 54, 50, 9, 5)
  },
  gorilla(c) {
    shadowOn(c, 8, 4, 0.4)
    for (const s of [-1, 1]) ell(c, 64 + s * 36, 54, 14, 27, s * 0.35, rg(c, 64 + s * 36, 54, 27, '#4a4e58', '#1e2026'))
    ell(c, 64, 76, 40, 32, 0, rg(c, 64, 76, 40, '#545966', '#1f2128'))
    shadowOff(c)
    ell(c, 64, 80, 22, 16, 0, 'rgba(160,165,175,0.25)')
    for (const s of [-1, 1]) circ(c, 64 + s * 40, 30, 9, rg(c, 64 + s * 40, 30, 9, '#5d5550', '#2b2622'))
    circ(c, 64, 44, 22, rg(c, 64, 44, 22, '#3b3e48', '#17181d'))
    ell(c, 64, 42, 15, 13, 0, rg(c, 64, 42, 15, '#9a8c7c', '#5a4e44'))
    ell(c, 64, 34, 15, 4, 0, '#26272d')
    eye(c, 58, 38, 3, '#5a3010'); eye(c, 70, 38, 3, '#5a3010')
    ell(c, 61, 46, 2, 1.5, 0, '#222'); ell(c, 67, 46, 2, 1.5, 0, '#222')
  },
}

// ---------------- Aliens ----------------

const ENEMY_DRAW: Record<string, [number, (c: Ctx, s: number) => void]> = {
  grunt: [96, (c) => {
    c.strokeStyle = '#2b6b22'; c.lineWidth = 3
    c.beginPath(); c.moveTo(40, 30); c.quadraticCurveTo(30, 18, 30, 10); c.stroke()
    c.beginPath(); c.moveTo(56, 30); c.quadraticCurveTo(66, 18, 66, 10); c.stroke()
    for (const x of [30, 66]) {
      const g = c.createRadialGradient(x, 10, 1, x, 10, 9); g.addColorStop(0, '#fffbb0'); g.addColorStop(1, 'rgba(255,230,60,0)')
      circ(c, x, 10, 9, g); circ(c, x, 10, 3.5, '#ffe54a')
    }
    ell(c, 36, 82, 8, 5, 0, '#2b8a26'); ell(c, 60, 82, 8, 5, 0, '#2b8a26')
    shadowOn(c, 8, 4, 0.35)
    ell(c, 48, 56, 27, 28, 0, rg(c, 48, 56, 28, '#c4ff9e', '#2c9a26'))
    shadowOff(c)
    circ(c, 48, 50, 14, '#fff', '#1f5a1a', 1.5)
    circ(c, 48, 51, 8, rg(c, 48, 51, 8, '#ff6ad5', '#8a1060'))
    circ(c, 48, 51, 4, '#111')
    circ(c, 44, 47, 3, '#fff')
    c.strokeStyle = '#1f5a1a'; c.lineWidth = 2
    c.beginPath(); c.arc(48, 68, 6, 0.2, Math.PI - 0.2); c.stroke()
    gloss(c, 36, 44, 7, 4)
  }],
  zipper: [96, (c) => {
    const g = c.createRadialGradient(22, 48, 2, 22, 48, 20); g.addColorStop(0, 'rgba(120,255,255,1)'); g.addColorStop(1, 'rgba(60,120,255,0)')
    circ(c, 20, 48, 20, g)
    shadowOn(c, 8, 4, 0.35)
    poly(c, [[84, 48], [24, 20], [38, 48], [24, 76]], (() => { const lg = c.createLinearGradient(24, 20, 84, 76); lg.addColorStop(0, '#e2b8ff'); lg.addColorStop(1, '#5a1a9a'); return lg })(), '#2a0a4a', 2)
    shadowOff(c)
    ell(c, 58, 48, 11, 6, 0, rg(c, 58, 48, 11, '#c8ffff', '#1a8aa0'))
    circ(c, 40, 34, 3, '#ff5ad0'); circ(c, 40, 62, 3, '#ff5ad0')
  }],
  blob: [96, (c) => drawBlob(c, 48, 50, 30)],
  miniblob: [56, (c) => drawBlob(c, 28, 29, 17)],
  cloaker: [96, (c) => {
    const g = c.createRadialGradient(48, 50, 4, 48, 50, 44); g.addColorStop(0, 'rgba(170,110,255,0.5)'); g.addColorStop(1, 'rgba(170,110,255,0)')
    circ(c, 48, 50, 44, g)
    shadowOn(c, 8, 4, 0.35)
    poly(c, [[48, 12], [76, 46], [64, 84], [48, 74], [32, 84], [20, 46]], rg(c, 48, 46, 38, '#7a4ad0', '#1c0a3a'), '#c9a8ff', 2)
    shadowOff(c)
    poly(c, [[48, 22], [64, 46], [48, 56], [32, 46]], '#120624')
    for (const x of [41, 55]) {
      const eg = c.createRadialGradient(x, 42, 0, x, 42, 7); eg.addColorStop(0, '#ffdede'); eg.addColorStop(0.4, '#ff2a4a'); eg.addColorStop(1, 'rgba(255,0,40,0)')
      circ(c, x, 42, 7, eg)
    }
  }],
  armored: [96, (c) => {
    const pts: number[][] = []
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; pts.push([48 + Math.cos(a) * 34, 50 + Math.sin(a) * 34]) }
    shadowOn(c, 10, 5, 0.45)
    poly(c, pts, rg(c, 48, 50, 34, '#eef3f8', '#4d5866'), '#2a313a', 3)
    shadowOff(c)
    c.strokeStyle = 'rgba(40,48,60,0.6)'; c.lineWidth = 2
    c.beginPath(); c.moveTo(20, 50); c.lineTo(76, 50); c.moveTo(48, 20); c.lineTo(48, 36); c.moveTo(48, 64); c.lineTo(48, 80); c.stroke()
    for (const [x, y] of [[30, 30], [66, 30], [30, 70], [66, 70], [22, 50], [74, 50]]) circ(c, x, y, 2.6, '#9aa6b4', '#333', 1)
    c.fillStyle = '#1a1a1a'; c.fillRect(30, 40, 36, 10)
    const vg = c.createLinearGradient(30, 40, 66, 50); vg.addColorStop(0, '#ffb13a'); vg.addColorStop(1, '#ff5a1a')
    c.fillStyle = vg; c.fillRect(32, 42, 32, 6)
  }],
  shielder: [96, (c) => {
    shadowOn(c, 10, 6, 0.4)
    ell(c, 48, 58, 42, 17, 0, rg(c, 48, 58, 42, '#d6ecff', '#3a5a80'), '#1c2f48', 2)
    shadowOff(c)
    ell(c, 48, 46, 20, 17, 0, rg(c, 48, 46, 20, 'rgba(210,250,255,0.95)', 'rgba(40,160,220,0.75)'), '#a8e8ff', 1.5)
    circ(c, 48, 50, 8, '#7dff6a'); circ(c, 45, 48, 3, '#111'); circ(c, 51, 48, 3, '#111')
    for (let i = 0; i < 7; i++) circ(c, 14 + i * 11.3, 62 + Math.sin((i / 6) * Math.PI) * 6, 2.6, i % 2 ? '#ffe45a' : '#5affd2')
  }],
  healer: [96, (c) => {
    const g = c.createRadialGradient(48, 48, 4, 48, 48, 46); g.addColorStop(0, 'rgba(255,140,210,0.7)'); g.addColorStop(1, 'rgba(255,140,210,0)')
    circ(c, 48, 48, 46, g)
    shadowOn(c, 8, 4, 0.35)
    circ(c, 48, 48, 24, rg(c, 48, 48, 24, '#ffd0ef', '#c2287e'), '#ffe2f4', 2)
    shadowOff(c)
    c.fillStyle = '#fff'
    c.fillRect(43, 34, 10, 28); c.fillRect(34, 43, 28, 10)
    c.strokeStyle = 'rgba(255,200,240,0.8)'; c.lineWidth = 2; c.setLineDash([4, 5])
    c.beginPath(); c.arc(48, 48, 33, 0, Math.PI * 2); c.stroke(); c.setLineDash([])
  }],
  brute: [128, (c) => {
    shadowOn(c, 12, 6, 0.45)
    for (const s of [-1, 1]) ell(c, 64 + s * 40, 70, 16, 22, s * 0.3, rg(c, 64 + s * 40, 70, 22, '#c7ced8', '#4b5260'), '#232830', 2)
    ell(c, 64, 70, 46, 42, 0, rg(c, 64, 70, 46, '#ff8a70', '#7a1414'), '#3a0808', 2.5)
    shadowOff(c)
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(64 + s * 22, 38); c.quadraticCurveTo(64 + s * 44, 24, 64 + s * 40, 6); c.quadraticCurveTo(64 + s * 34, 24, 64 + s * 12, 34); c.closePath()
      c.fillStyle = rg(c, 64 + s * 30, 22, 20, '#fff8e8', '#b8a888'); c.fill()
    }
    for (const [x, y] of [[50, 54], [64, 48], [78, 54]]) {
      const g = c.createRadialGradient(x, y, 0, x, y, 8); g.addColorStop(0, '#fffbd0'); g.addColorStop(0.5, '#ffd21a'); g.addColorStop(1, '#a86a00')
      circ(c, x, y, 7, g); circ(c, x, y, 2.5, '#111')
    }
    ell(c, 64, 84, 20, 10, 0, '#3a0808')
    c.fillStyle = '#fff'
    for (let i = 0; i < 5; i++) poly(c, [[48 + i * 8, 77], [52 + i * 8, 77], [50 + i * 8, 84]], '#fffbe8')
    gloss(c, 44, 56, 12, 6)
  }],
  mothership: [256, (c) => {
    const halo = c.createRadialGradient(128, 128, 60, 128, 128, 128); halo.addColorStop(0, 'rgba(120,255,140,0.35)'); halo.addColorStop(1, 'rgba(120,255,140,0)')
    circ(c, 128, 128, 128, halo)
    shadowOn(c, 18, 10, 0.5)
    circ(c, 128, 128, 112, rg(c, 128, 128, 112, '#e6edf5', '#3a4452'), '#1a2028', 4)
    shadowOff(c)
    c.strokeStyle = 'rgba(30,40,55,0.55)'; c.lineWidth = 2.5
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      c.beginPath(); c.moveTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60); c.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108); c.stroke()
    }
    circ(c, 128, 128, 76, rg(c, 128, 128, 76, '#9aa8b8', '#2a323e'), '#1a2028', 3)
    const cols = ['#ff4a6a', '#ffd84a', '#4affc8', '#4aa8ff']
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2
      const x = 128 + Math.cos(a) * 94, y = 128 + Math.sin(a) * 94
      const g = c.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, '#fff'); g.addColorStop(0.35, cols[i % 4]); g.addColorStop(1, 'rgba(0,0,0,0)')
      circ(c, x, y, 9, g)
    }
    circ(c, 128, 128, 46, rg(c, 128, 128, 46, 'rgba(220,255,220,0.95)', 'rgba(30,160,60,0.9)'), '#b8ffc0', 3)
    circ(c, 128, 132, 18, '#4ac24a'); circ(c, 120, 128, 6, '#111'); circ(c, 136, 128, 6, '#111')
    gloss(c, 110, 108, 20, 10)
  }],
  golden: [96, (c) => {
    const halo = c.createRadialGradient(48, 50, 6, 48, 50, 46); halo.addColorStop(0, 'rgba(255,230,120,0.75)'); halo.addColorStop(1, 'rgba(255,200,40,0)')
    circ(c, 48, 50, 46, halo)
    shadowOn(c, 8, 4, 0.35)
    ell(c, 48, 56, 36, 14, 0, rg(c, 48, 56, 36, '#fff6c0', '#b07a10'), '#6a4a00', 2)
    shadowOff(c)
    ell(c, 48, 45, 17, 14, 0, rg(c, 48, 45, 17, '#fffbe0', '#e0a820'), '#fff2a0', 1.5)
    circ(c, 48, 48, 6, '#7dff6a'); circ(c, 46, 47, 1.8, '#111'); circ(c, 50, 47, 1.8, '#111')
    for (let i = 0; i < 6; i++) circ(c, 20 + i * 11.2, 60, 2.4, i % 2 ? '#ffffff' : '#ff9a2a')
    const star = (x: number, y: number, r: number) => poly(c, [[x, y - r], [x + r * 0.25, y - r * 0.25], [x + r, y], [x + r * 0.25, y + r * 0.25], [x, y + r], [x - r * 0.25, y + r * 0.25], [x - r, y], [x - r * 0.25, y - r * 0.25]], '#ffffff')
    star(20, 30, 7); star(78, 34, 5); star(72, 78, 6)
  }],
}

function drawBlob(c: Ctx, x: number, y: number, r: number) {
  c.beginPath()
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const rr = r * (1 + Math.sin(i * 2.7) * 0.08)
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py)
  }
  c.closePath()
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r)
  g.addColorStop(0, 'rgba(200,250,255,0.95)'); g.addColorStop(1, 'rgba(20,140,220,0.8)')
  c.fillStyle = g; c.fill()
  c.strokeStyle = 'rgba(220,255,255,0.9)'; c.lineWidth = 2; c.stroke()
  circ(c, x + r * 0.3, y + r * 0.25, r * 0.22, 'rgba(10,80,160,0.45)')
  circ(c, x - r * 0.35, y + r * 0.35, r * 0.14, 'rgba(10,80,160,0.45)')
  circ(c, x - r * 0.25, y - r * 0.1, r * 0.13, '#0a2a40'); circ(c, x + r * 0.2, y - r * 0.1, r * 0.13, '#0a2a40')
  gloss(c, x - r * 0.35, y - r * 0.45, r * 0.28, r * 0.15)
}

export function generateTextures(scene: Phaser.Scene) {
  make(scene, 'tower_base', 128, 128, (c) => {
    shadowOn(c, 10, 6, 0.45)
    circ(c, 64, 64, 50, rg(c, 64, 64, 50, '#c9c2b4', '#6b6458'), '#4a443a', 3)
    shadowOff(c)
    circ(c, 64, 64, 40, rg(c, 64, 64, 40, '#a8a090', '#7a7264'))
    c.strokeStyle = 'rgba(60,54,46,0.5)'; c.lineWidth = 2
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      c.beginPath(); c.moveTo(64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40); c.lineTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); c.stroke()
    }
  })
  for (const [id, draw] of Object.entries(TOWER_DRAW)) make(scene, `tower_${id}`, 128, 128, draw)
  for (const [id, [size, draw]] of Object.entries(ENEMY_DRAW)) make(scene, `enemy_${id}`, size, size, (c) => draw(c, size))

  make(scene, 'p_quill', 40, 10, (c) => {
    c.strokeStyle = '#2e1d10'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(3, 5); c.lineTo(30, 5); c.stroke()
    c.strokeStyle = '#fff5e0'; c.lineWidth = 3; c.beginPath(); c.moveTo(28, 5); c.lineTo(38, 5); c.stroke()
  })
  make(scene, 'p_bee', 28, 28, (c) => {
    ell(c, 11, 8, 6, 4, -0.5, 'rgba(255,255,255,0.9)'); ell(c, 17, 8, 6, 4, 0.5, 'rgba(255,255,255,0.9)')
    ell(c, 14, 15, 9, 6, 0, '#ffd02a', '#111', 1.4)
    c.strokeStyle = '#111'; c.lineWidth = 2.2
    c.beginPath(); c.moveTo(11, 10); c.lineTo(11, 20); c.moveTo(16, 10); c.lineTo(16, 20); c.stroke()
  })
  make(scene, 'p_glob', 32, 32, (c) => {
    const g = c.createRadialGradient(12, 12, 1, 16, 16, 14); g.addColorStop(0, '#eaffc0'); g.addColorStop(0.5, '#7aea3a'); g.addColorStop(1, 'rgba(40,140,20,0.9)')
    circ(c, 16, 16, 13, g)
  })
  make(scene, 'p_boulder', 48, 48, (c) => {
    shadowOn(c, 6, 3, 0.4)
    poly(c, [[10, 18], [22, 6], [38, 10], [44, 26], [36, 42], [16, 42], [6, 30]], rg(c, 24, 24, 22, '#c4c0b8', '#5a564e'), '#3a3630', 2)
    shadowOff(c)
    c.strokeStyle = 'rgba(40,36,30,0.6)'; c.lineWidth = 1.5
    c.beginPath(); c.moveTo(18, 16); c.lineTo(26, 26); c.lineTo(22, 36); c.stroke()
  })
  make(scene, 'spark', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    circ(c, 16, 16, 16, g)
  })
  make(scene, 'ring', 256, 256, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 10
    c.beginPath(); c.arc(128, 128, 118, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 22
    c.beginPath(); c.arc(128, 128, 108, 0, Math.PI * 2); c.stroke()
  })
  make(scene, 'shield', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 20, 64, 64, 60); g.addColorStop(0, 'rgba(120,220,255,0)'); g.addColorStop(0.8, 'rgba(120,220,255,0.25)'); g.addColorStop(1, 'rgba(180,240,255,0.8)')
    circ(c, 64, 64, 60, g)
    gloss(c, 44, 40, 16, 8)
  })
}

// ---------------- Map backgrounds ----------------

export interface Obstacle { x: number; y: number; r: number }

export function drawMap(scene: Phaser.Scene, map: MapDef): Obstacle[] {
  const rand = mulberry32(map.id.length * 7919 + map.id.charCodeAt(0) * 31)
  const paths = map.paths.map((p) => new Path(p))
  const obstacles: Obstacle[] = []
  const t = map.theme
  make(scene, `bg_${map.id}`, WORLD_W, WORLD_H, (c) => {
    c.fillStyle = t.ground
    c.fillRect(0, 0, WORLD_W, WORLD_H)
    // soft terrain variation
    for (let i = 0; i < 700; i++) {
      const x = rand() * WORLD_W, y = rand() * WORLD_H, r = 20 + rand() * 90
      const col = rand() < 0.5 ? t.groundDark : t.groundLight
      const g = c.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, hexA(col, 0.22)); g.addColorStop(1, hexA(col, 0))
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // ground detail
    for (let i = 0; i < 2600; i++) {
      const x = rand() * WORLD_W, y = rand() * WORLD_H
      if (t.deco === 'arctic') {
        circ(c, x, y, 0.8 + rand() * 1.6, `rgba(255,255,255,${0.4 + rand() * 0.5})`)
      } else {
        c.strokeStyle = hexA(rand() < 0.5 ? t.groundDark : t.groundLight, 0.7)
        c.lineWidth = 1.4
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rand() - 0.5) * 6, y - 5 - rand() * 6); c.stroke()
      }
    }
    // paths
    const strokePath = (pts: { x: number; y: number }[], width: number, style: string) => {
      c.lineWidth = width; c.strokeStyle = style
      c.beginPath(); c.moveTo(pts[0].x, pts[0].y)
      for (const p of pts.slice(1)) c.lineTo(p.x, p.y)
      c.stroke()
    }
    shadowOn(c, 18, 6, 0.35)
    for (const p of paths) strokePath(p.pts, map.pathWidth + 16, t.pathEdge)
    shadowOff(c)
    for (const p of paths) strokePath(p.pts, map.pathWidth, t.path)
    for (const p of paths) strokePath(p.pts, map.pathWidth * 0.5, hexA(t.pathLight, 0.45))
    for (const p of paths) {
      for (let d = 0; d < p.total; d += 7) {
        const pt = p.at(d)
        const off = (rand() - 0.5) * map.pathWidth * 0.85
        const nx = pt.x + Math.cos(pt.angle + Math.PI / 2) * off
        const ny = pt.y + Math.sin(pt.angle + Math.PI / 2) * off
        circ(c, nx, ny, 1 + rand() * 2.2, hexA(rand() < 0.5 ? t.pathEdge : t.pathLight, 0.55))
      }
    }
    // portals and den
    for (const p of paths) {
      const s = p.at(60)
      const g = c.createRadialGradient(Math.max(30, s.x), s.y, 4, Math.max(30, s.x), s.y, 90)
      g.addColorStop(0, 'rgba(230,180,255,0.95)'); g.addColorStop(0.35, 'rgba(150,60,255,0.6)'); g.addColorStop(1, 'rgba(80,0,160,0)')
      circ(c, Math.max(30, s.x), s.y, 90, g)
    }
    const end = paths[0].at(paths[0].total - 60)
    const ex = Math.min(WORLD_W - 40, end.x)
    shadowOn(c, 14, 6, 0.45)
    circ(c, ex, end.y, 62, rg(c, ex, end.y, 62, '#7ac25a', '#2a5a1a'))
    shadowOff(c)
    circ(c, ex, end.y, 36, rg(c, ex, end.y, 36, '#3a2414', '#120a04'))
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      ell(c, ex + Math.cos(a) * 52, end.y + Math.sin(a) * 52, 16, 9, a, 'rgba(60,140,40,0.9)')
    }
    for (const p of map.paths.slice(1)) {
      const pp = new Path(p).at(new Path(p).total - 60)
      if (Math.abs(pp.y - end.y) > 80) {
        circ(c, Math.min(WORLD_W - 40, pp.x), pp.y, 40, rg(c, pp.x, pp.y, 40, '#7ac25a', '#2a5a1a'))
      }
    }
    // decorations
    const count = t.deco === 'jungle' ? 110 : t.deco === 'arctic' ? 60 : 50
    let tries = 0
    while (obstacles.length < count && tries++ < 4000) {
      const x = 30 + rand() * (WORLD_W - 60), y = 30 + rand() * (WORLD_H - 60)
      const r = t.deco === 'jungle' ? 18 + rand() * 26 : 16 + rand() * 22
      if (paths.some((p) => p.distTo(x, y) < map.pathWidth / 2 + r + 14)) continue
      if (obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 6)) continue
      // keep open building space: skip some spots
      if (rand() < 0.35 && t.deco !== 'jungle') continue
      obstacles.push({ x, y, r })
    }
    obstacles.sort((a, b) => a.y - b.y)
    for (const o of obstacles) drawDeco(c, t.deco, o, rand)
    // lighting
    if (t.deco === 'savanna') {
      const sun = c.createRadialGradient(WORLD_W * 0.85, -100, 50, WORLD_W * 0.85, -100, 1300)
      sun.addColorStop(0, 'rgba(255,190,90,0.35)'); sun.addColorStop(1, 'rgba(255,140,60,0)')
      c.fillStyle = sun; c.fillRect(0, 0, WORLD_W, WORLD_H)
    } else if (t.deco === 'jungle') {
      for (let i = 0; i < 9; i++) {
        const x = rand() * WORLD_W
        const lg = c.createLinearGradient(x, 0, x + 300, WORLD_H)
        lg.addColorStop(0, 'rgba(255,255,200,0.12)'); lg.addColorStop(1, 'rgba(255,255,200,0)')
        c.fillStyle = lg
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x + 420, WORLD_H); c.lineTo(x + 300, WORLD_H); c.closePath(); c.fill()
      }
    } else {
      const cold = c.createLinearGradient(0, 0, 0, WORLD_H)
      cold.addColorStop(0, 'rgba(160,200,255,0.18)'); cold.addColorStop(1, 'rgba(255,255,255,0)')
      c.fillStyle = cold; c.fillRect(0, 0, WORLD_W, WORLD_H)
    }
    const vig = c.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.45, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.62)
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.38)')
    c.fillStyle = vig; c.fillRect(0, 0, WORLD_W, WORLD_H)
  })
  return obstacles
}

function drawDeco(c: Ctx, kind: string, o: Obstacle, rand: () => number) {
  const { x, y, r } = o
  const roll = rand()
  if (kind === 'savanna') {
    if (roll < 0.55) {
      ell(c, x + 10, y + 12, r * 1.4, r * 0.7, 0, 'rgba(0,0,0,0.22)')
      c.strokeStyle = '#5a3a1e'; c.lineWidth = 5
      c.beginPath(); c.moveTo(x, y + r * 0.6); c.lineTo(x - 4, y); c.stroke()
      for (let i = 0; i < 5; i++) {
        const dx = (rand() - 0.5) * r * 1.6, dy = (rand() - 0.5) * r * 0.6
        ell(c, x + dx, y - 6 + dy, r * 0.7, r * 0.42, 0, rg(c, x + dx, y - 6 + dy, r * 0.7, '#8fb04a', '#3e5e1e'))
      }
    } else if (roll < 0.85) {
      shadowOn(c, 6, 4, 0.35)
      ell(c, x, y, r * 0.8, r * 0.6, rand(), rg(c, x, y, r * 0.8, '#b8ab98', '#6a5e4e'))
      shadowOff(c)
    } else {
      shadowOn(c, 8, 4, 0.35)
      poly(c, [[x - r * 0.6, y + r * 0.5], [x - r * 0.2, y - r], [x + r * 0.2, y - r * 0.8], [x + r * 0.6, y + r * 0.5]], rg(c, x, y, r, '#c98a4a', '#7a4a20'))
      shadowOff(c)
    }
  } else if (kind === 'jungle') {
    if (roll < 0.75) {
      ell(c, x + 10, y + 12, r * 1.1, r * 0.9, 0, 'rgba(0,0,0,0.28)')
      const greens = ['#2e7a2a', '#3e9a34', '#1f5e22', '#4aa83c']
      for (let i = 0; i < 6; i++) {
        const a = rand() * Math.PI * 2, d = rand() * r * 0.5
        const rr = r * (0.5 + rand() * 0.35)
        circ(c, x + Math.cos(a) * d, y + Math.sin(a) * d, rr, rg(c, x + Math.cos(a) * d, y + Math.sin(a) * d, rr, greens[i % 4], '#123a12'))
      }
      if (rand() < 0.3) circ(c, x + (rand() - 0.5) * r, y + (rand() - 0.5) * r, 4, rand() < 0.5 ? '#ff5a8a' : '#ffd04a')
    } else {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + rand()
        ell(c, x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.5, r * 0.16, a, 'rgba(70,160,60,0.9)')
      }
    }
  } else {
    if (roll < 0.6) {
      ell(c, x + 10, y + 12, r * 1.0, r * 0.8, 0, 'rgba(40,60,90,0.25)')
      for (let layer = 0; layer < 3; layer++) {
        const rr = r * (1 - layer * 0.28)
        const pts: number[][] = []
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + layer * 0.3
          const rad = i % 2 ? rr : rr * 0.65
          pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad])
        }
        poly(c, pts, layer === 2 ? '#f4fbff' : rg(c, x, y, rr, '#4a8a6a', '#1a4a3a'))
      }
    } else {
      shadowOn(c, 8, 4, 0.3)
      poly(c, [[x - r * 0.7, y + r * 0.4], [x - r * 0.3, y - r * 0.6], [x + r * 0.4, y - r * 0.7], [x + r * 0.7, y + r * 0.3]], rg(c, x, y, r, '#e8f8ff', '#7ab4d8'), '#5a94b8', 1.5)
      shadowOff(c)
    }
  }
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
