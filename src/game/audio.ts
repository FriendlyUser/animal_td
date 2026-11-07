import { game } from './store'

type Sfx =
  | 'quill' | 'zap' | 'stomp' | 'buzz' | 'spit' | 'thud' | 'snipe'
  | 'pop' | 'leak' | 'place' | 'upgrade' | 'sell' | 'wave' | 'boss' | 'win' | 'lose' | 'error' | 'cash'
  | 'crit' | 'streak' | 'roar' | 'stampede' | 'strike' | 'gold'

let ctx: AudioContext | null = null
let master: GainNode | null = null
const last: Partial<Record<Sfx, number>> = {}
const MIN_GAP: Partial<Record<Sfx, number>> = { quill: 60, zap: 80, buzz: 90, spit: 80, thud: 90, snipe: 60, pop: 35, stomp: 120, crit: 90, strike: 60 }

function ac(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = 0.35
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
  const c = ac()
  if (!c || !master) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise(dur: number, vol: number, freq = 800) {
  const c = ac()
  if (!c || !master) return
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.value = freq
  const g = c.createGain()
  g.gain.value = vol
  src.connect(filt).connect(g).connect(master)
  src.start()
}

export function sfx(name: Sfx) {
  if (game.muted) return
  const now = performance.now()
  const gap = MIN_GAP[name] ?? 0
  if (gap && now - (last[name] ?? 0) < gap) return
  last[name] = now
  switch (name) {
    case 'quill': tone(900, 0.06, 'triangle', 0.08, 500); break
    case 'snipe': tone(1400, 0.12, 'sawtooth', 0.08, 200); noise(0.08, 0.15, 3000); break
    case 'zap': tone(1800, 0.1, 'square', 0.05, 300); noise(0.1, 0.08, 5000); break
    case 'stomp': noise(0.25, 0.5, 220); tone(80, 0.25, 'sine', 0.3, 40); break
    case 'buzz': tone(220, 0.1, 'sawtooth', 0.04, 240); break
    case 'spit': tone(300, 0.1, 'sine', 0.12, 120); break
    case 'thud': noise(0.18, 0.35, 400); tone(120, 0.15, 'sine', 0.2, 60); break
    case 'pop': tone(520 + Math.random() * 300, 0.07, 'sine', 0.12, 1200); break
    case 'leak': tone(300, 0.3, 'square', 0.1, 90); break
    case 'place': tone(440, 0.08, 'triangle', 0.15); tone(660, 0.1, 'triangle', 0.15, undefined, 0.07); break
    case 'upgrade': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, undefined, i * 0.06)); break
    case 'sell': tone(784, 0.08, 'sine', 0.12); tone(523, 0.12, 'sine', 0.12, undefined, 0.07); break
    case 'cash': tone(1200, 0.06, 'sine', 0.08); tone(1600, 0.08, 'sine', 0.08, undefined, 0.05); break
    case 'wave': tone(330, 0.2, 'sawtooth', 0.08, 660); break
    case 'boss': tone(110, 0.9, 'sawtooth', 0.15, 55); tone(116, 0.9, 'sawtooth', 0.12, 58); break
    case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, undefined, i * 0.12)); break
    case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.1, undefined, i * 0.2)); break
    case 'error': tone(160, 0.15, 'square', 0.08); break
    case 'crit': tone(1600, 0.08, 'square', 0.05, 2400); break
    case 'streak': [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.14, 'square', 0.07, undefined, i * 0.05)); break
    case 'roar': noise(0.9, 0.6, 300); tone(90, 0.9, 'sawtooth', 0.25, 45); tone(140, 0.7, 'sawtooth', 0.15, 70); break
    case 'stampede': for (let i = 0; i < 8; i++) { noise(0.15, 0.35, 260) } tone(70, 1.4, 'sine', 0.3, 50); break
    case 'strike': tone(2200, 0.25, 'sawtooth', 0.06, 300); noise(0.3, 0.4, 900); break
    case 'gold': [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, undefined, i * 0.06)); break
  }
}

export function setMuted(m: boolean) {
  game.muted = m
  localStorage.setItem('wildguard.muted', m ? '1' : '0')
}
