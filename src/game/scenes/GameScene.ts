import Phaser from 'phaser'
import { game, bus, towerCost, type SelectedInfo, type UpgradeInfo } from '../store'
import { getMap, Path, WORLD_H, WORLD_W, type MapDef } from '../data/maps'
import { getDifficulty, type Difficulty, type DifficultyId } from '../data/difficulty'
import { ENEMIES, armorBonus, hpScale, type EnemyDef, type EnemyType } from '../data/enemies'
import {
  TOWERS, TOWER_FOOTPRINT, canUpgradePath, computeStats, getTower,
  type TargetMode, type TowerDef, type TowerId, type TowerStats,
} from '../data/towers'
import { buildWave, summarizeWave } from '../data/waves'
import { drawMap, generateTextures, type Obstacle } from '../textures'
import { sfx } from '../audio'
import { COMBO_TIERS, POWERS, type PowerId } from '../data/powers'

interface Enemy {
  uid: number
  def: EnemyDef
  path: Path
  pathIdx: number
  dist: number
  hp: number
  maxHp: number
  armor: number
  shield: number
  maxShield: number
  speed: number
  x: number
  y: number
  sprite: Phaser.GameObjects.Image
  shieldSprite?: Phaser.GameObjects.Image
  slowT: number
  slowF: number
  stunT: number
  poisonDps: number
  poisonT: number
  poisonSrc?: Tower
  sinceHit: number
  spawnT: number
  dead: boolean
  healed: boolean
  warp: number
  bob: number
  baseScale: number
}

interface Tower {
  uid: number
  def: TowerDef
  x: number
  y: number
  tiers: [number, number]
  stats: TowerStats
  eff: TowerStats
  cd: number
  target: TargetMode
  base: Phaser.GameObjects.Image
  body: Phaser.GameObjects.Image
  pips: Phaser.GameObjects.Graphics
  kills: number
  damage: number
  spent: number
  detect: boolean
  buffed: boolean
  recoil: number
  glow: boolean
}

interface Projectile {
  sprite: Phaser.GameObjects.Image
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  tower: Tower
  stats: TowerStats
  dmg: number
  pierce: number
  hit: Set<number>
  life: number
  homing?: Enemy
  radius: number
  lob?: { sx: number; sy: number; tx: number; ty: number; t: number; dur: number; h: number }
  spin: number
  dead: boolean
}

interface Fx {
  pts: number[]
  life: number
  max: number
  color: number
  width: number
}

interface SpawnEntry { t: number; type: EnemyType; pathIdx: number }

const TOWER_SCALE = 0.62

export class GameScene extends Phaser.Scene {
  map!: MapDef
  diff!: Difficulty
  paths: Path[] = []
  obstacles: Obstacle[] = []
  enemies: Enemy[] = []
  towers: Tower[] = []
  projectiles: Projectile[] = []
  fx: Fx[] = []
  queue: SpawnEntry[] = []
  waveTime = 0
  autoTimer = -1
  uid = 1
  selected: Tower | null = null
  ghost: Phaser.GameObjects.Container | null = null
  ghostValid = false
  rangeG!: Phaser.GameObjects.Graphics
  hpG!: Phaser.GameObjects.Graphics
  fxG!: Phaser.GameObjects.Graphics
  burst!: Phaser.GameObjects.Particles.ParticleEmitter
  infoTimer = 0
  handlers: [string, (...args: never[]) => void][] = []
  gameTime = 0
  lastKillT = -10
  combo = 0
  slowMo = 0
  dmgTexts = 0
  ringCount = 0
  runners: { sprite: Phaser.GameObjects.Image; path: Path; dist: number; hit: Set<number>; dmg: number }[] = []
  powerCd: Record<PowerId, number> = { roar: 0, stampede: 0, strike: 0 }
  goldTrail!: Phaser.GameObjects.Particles.ParticleEmitter
  dust!: Phaser.GameObjects.Particles.ParticleEmitter
  muzzle!: Phaser.GameObjects.Particles.ParticleEmitter

  constructor() {
    super('game')
  }

  init(data: { mapId: string; difficultyId: DifficultyId }) {
    this.map = getMap(data.mapId)
    this.diff = getDifficulty(data.difficultyId)
    this.paths = this.map.paths.map((p) => new Path(p))
    this.enemies = []
    this.towers = []
    this.projectiles = []
    this.fx = []
    this.queue = []
    this.selected = null
    this.ghost = null
    this.runners = []
    this.gameTime = 0
    this.lastKillT = -10
    this.combo = 0
    this.slowMo = 0
    this.dmgTexts = 0
    this.ringCount = 0
    this.powerCd = { roar: 0, stampede: 0, strike: 0 }
  }

  create() {
    generateTextures(this)
    for (const t of TOWERS) game.icons[t.id] = this.textures.getBase64(`tower_${t.id}`)
    for (const id of Object.keys(ENEMIES)) game.icons[`enemy_${id}`] = this.textures.getBase64(`enemy_${id}`)

    this.obstacles = drawMap(this, this.map)
    this.add.image(0, 0, `bg_${this.map.id}`).setOrigin(0).setDepth(0)

    this.rangeG = this.add.graphics().setDepth(5)
    this.fxG = this.add.graphics().setDepth(40).setBlendMode(Phaser.BlendModes.ADD)
    this.hpG = this.add.graphics().setDepth(45)
    this.burst = this.add.particles(0, 0, 'spark', {
      lifespan: { min: 250, max: 600 },
      speed: { min: 60, max: 280 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(41)
    this.goldTrail = this.add.particles(0, 0, 'spark', {
      lifespan: 450, speed: { min: 10, max: 50 }, scale: { start: 0.55, end: 0 }, tint: 0xffd84a,
      blendMode: 'ADD', emitting: false,
    }).setDepth(19)
    this.dust = this.add.particles(0, 0, 'spark', {
      lifespan: 550, speed: { min: 20, max: 110 }, scale: { start: 1.1, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: 0xc8a070, emitting: false,
    }).setDepth(34)
    this.muzzle = this.add.particles(0, 0, 'spark', {
      lifespan: 140, speed: { min: 40, max: 170 }, scale: { start: 0.5, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(32)
    this.createAmbient()

    Object.assign(game, {
      cash: this.diff.startCash,
      lives: this.diff.lives,
      maxLives: this.diff.lives,
      wave: 0,
      totalWaves: this.diff.waves,
      score: 0,
      kills: 0,
      waveActive: false,
      paused: false,
      freeplay: false,
      placingId: null,
      selected: null,
      over: null,
      boss: null,
      costMult: this.diff.costMult,
      nextWave: summarizeWave(buildWave(1)),
      powers: POWERS.map((p) => ({ ...p, cd: 0, max: p.cd })),
      aiming: null,
      combo: 0,
      bestCombo: 0,
    })

    this.input.mouse?.disableContextMenu()
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p))
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p))

    this.on('place-start', (id: TowerId) => this.startPlacing(id))
    this.on('place-cancel', () => this.cancelPlacing())
    this.on('upgrade', (path: 0 | 1) => this.upgrade(path))
    this.on('sell', () => this.sell())
    this.on('target', (mode: TargetMode) => this.setTarget(mode))
    this.on('cycle-target', () => this.cycleTarget())
    this.on('start-wave', () => this.startWave())
    this.on('deselect', () => this.select(null))
    this.on('power', (id: PowerId) => this.usePower(id))
    this.on('continue-freeplay', () => {
      game.freeplay = true
      game.over = null
      if (game.autoStart) this.autoTimer = 1.5
    })
    this.events.once('shutdown', () => this.cleanup())
    this.events.once('destroy', () => this.cleanup())

    this.banner(this.map.name, `${this.diff.name} difficulty · ${this.diff.waves} waves`)
    if (import.meta.env.DEV) Object.assign(window, { __wg: this, __store: game })
  }

  private on(ev: string, fn: (...args: never[]) => void) {
    bus.on(ev, fn)
    this.handlers.push([ev, fn])
  }

  private cleanup() {
    for (const [ev, fn] of this.handlers) bus.off(ev, fn)
    this.handlers = []
  }

  // ------------------------------------------------------------------ loop

  update(_time: number, delta: number) {
    if (!game.paused && !game.over) {
      if (this.slowMo > 0) this.slowMo -= delta / 1000
      const dt = (Math.min(delta, 50) / 1000) * game.speed * (this.slowMo > 0 ? 0.3 : 1)
      const steps = Math.ceil(dt / (1 / 60))
      for (let i = 0; i < steps; i++) this.step(dt / steps)
    }
    this.render(delta / 1000)
  }

  step(dt: number) {
    this.gameTime += dt
    if (game.waveActive) {
      for (const k of Object.keys(this.powerCd) as PowerId[]) if (this.powerCd[k] > 0) this.powerCd[k] = Math.max(0, this.powerCd[k] - dt)
    }
    if (this.combo > 0 && this.gameTime - this.lastKillT > 1.2) { this.combo = 0; game.combo = 0 }
    if (this.runners.length) this.updateRunners(dt)

    if (this.autoTimer > 0) {
      this.autoTimer -= dt
      if (this.autoTimer <= 0 && !game.waveActive) this.startWave()
    }

    if (game.waveActive) {
      this.waveTime += dt
      while (this.queue.length && this.queue[0].t <= this.waveTime) {
        const s = this.queue.shift()!
        this.spawnEnemy(s.type, s.pathIdx, 0)
      }
    }

    for (const b of this.fx) b.life -= dt
    if (this.fx.length) this.fx = this.fx.filter((b) => b.life > 0)

    for (const e of this.enemies) e.healed = false
    for (const e of this.enemies) if (!e.dead) this.updateEnemy(e, dt)
    for (const t of this.towers) this.updateTower(t, dt)
    for (const p of this.projectiles) if (!p.dead) this.updateProjectile(p, dt)

    this.enemies = this.enemies.filter((e) => !e.dead)
    this.projectiles = this.projectiles.filter((p) => {
      if (p.dead) p.sprite.destroy()
      return !p.dead
    })

    if (game.waveActive && this.queue.length === 0 && this.enemies.length === 0 && !game.over) this.waveComplete()
  }

  // ------------------------------------------------------------------ enemies

  private spawnEnemy(type: EnemyType, pathIdx: number, dist: number) {
    const def = ENEMIES[type]
    const wave = Math.max(1, game.wave)
    const scale = hpScale(wave) * this.diff.hpMult
    const path = this.paths[pathIdx % this.paths.length]
    const pos = path.at(dist)
    const sprite = this.add.image(pos.x, pos.y, `enemy_${type}`).setDepth(def.boss ? 22 : 20)
    const baseScale = (def.radius * 2.5) / sprite.width
    sprite.setScale(baseScale)
    const maxShield = (def.shield ?? 0) * scale
    const e: Enemy = {
      uid: this.uid++, def, path, pathIdx, dist,
      hp: def.hp * scale, maxHp: def.hp * scale,
      armor: def.armor > 0 ? def.armor + armorBonus(wave) : 0,
      shield: maxShield, maxShield,
      speed: def.speed * 1.25 * this.diff.speedMult * (1 + Math.min(0.3, wave * 0.004)),
      x: pos.x, y: pos.y, sprite,
      slowT: 0, slowF: 1, stunT: 0, poisonDps: 0, poisonT: 0,
      sinceHit: 0, spawnT: 0, dead: false, healed: false, warp: dist === 0 ? 0 : 1, bob: Math.random() * Math.PI * 2, baseScale,
    }
    if (maxShield > 0) {
      e.shieldSprite = this.add.image(pos.x, pos.y, 'shield').setDepth(21).setScale((def.radius * 3) / 128)
    }
    if (dist === 0 && this.enemies.length < 120) {
      this.burst.particleTint = def.golden ? 0xffd84a : 0xc890ff
      this.burst.explode(def.golden ? 20 : 5, Math.max(10, pos.x), pos.y)
    }
    if (def.cloaked) sprite.setAlpha(0.35)
    if (def.boss) {
      sfx('boss')
      this.cameras.main.shake(600, 0.004)
    }
    this.enemies.push(e)
    return e
  }

  private updateEnemy(e: Enemy, dt: number) {
    if (e.warp < 1) e.warp = Math.min(1, e.warp + dt * 3)
    if (e.poisonT > 0) {
      e.poisonT -= dt
      this.hurt(e, e.poisonDps * dt, e.poisonSrc, { poison: true })
      if (e.dead) return
    }
    if (e.stunT > 0) e.stunT -= dt
    else {
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1 }
      e.dist += e.speed * e.slowF * dt
    }
    e.sinceHit += dt
    if (e.maxShield > 0 && e.sinceHit > 3 && e.shield < e.maxShield) {
      e.shield = Math.min(e.maxShield, e.shield + e.maxShield * 0.25 * dt)
    }
    if (e.def.heal) {
      const h = e.def.heal
      for (const o of this.enemies) {
        // healers can't heal each other and heals don't stack
        if (o === e || o.dead || o.healed || o.def.heal || o.hp >= o.maxHp) continue
        if (Math.hypot(o.x - e.x, o.y - e.y) < h.radius) {
          o.hp = Math.min(o.maxHp, o.hp + h.perSec * hpScale(game.wave) * dt)
          o.healed = true
        }
      }
    }
    if (e.def.spawns) {
      e.spawnT += dt
      if (e.spawnT >= e.def.spawns.every) {
        e.spawnT = 0
        this.spawnEnemy(e.def.spawns.type, e.pathIdx, Math.max(0, e.dist - 30))
      }
    }
    if (e.dist >= e.path.total) {
      this.leak(e)
      return
    }
    const p = e.path.at(e.dist)
    e.x = p.x
    e.y = p.y
    if (e.def.faces) e.sprite.rotation = p.angle
    else if (e.def.boss) e.sprite.rotation += dt * 0.4
  }

  private leak(e: Enemy) {
    this.removeEnemy(e)
    if (e.def.lives <= 0) {
      this.floatText(Math.min(e.x, WORLD_W - 120), e.y - 30, 'Treasure escaped!', '#ffd84a', 26)
      return
    }
    game.lives = Math.max(0, game.lives - e.def.lives)
    sfx('leak')
    this.cameras.main.flash(180, 255, 40, 40, false)
    if (game.lives <= 0 && !game.over) {
      game.over = { won: false, saved: false }
      game.waveActive = false
      sfx('lose')
      this.cancelPlacing()
    }
  }

  private removeEnemy(e: Enemy) {
    e.dead = true
    e.sprite.destroy()
    e.shieldSprite?.destroy()
  }

  private hurt(e: Enemy, raw: number, src: Tower | undefined, o: { ap?: boolean; poison?: boolean; shred?: number; crit?: boolean } = {}) {
    if (e.dead || raw <= 0) return
    let dmg = raw
    if (!o.poison) {
      if (o.shred) e.armor = Math.max(0, e.armor - o.shred)
      if (!o.ap && e.armor > 0) dmg = Math.max(raw * 0.35, raw - e.armor)
      e.sinceHit = 0
      if (e.shield > 0) {
        const absorbed = Math.min(e.shield, dmg)
        e.shield -= absorbed
        dmg -= absorbed
      }
    }
    if (dmg <= 0) return
    const dealt = Math.min(dmg, e.hp)
    e.hp -= dmg
    if (src) src.damage += dealt
    if (game.showDamage && !o.poison) this.dmgNumber(e.x, e.y - e.def.radius, dmg, !!o.crit)
    if (e.hp <= 0) this.kill(e, src)
  }

  private kill(e: Enemy, src?: Tower) {
    this.removeEnemy(e)
    const reward = e.def.reward + (e.def.golden ? game.wave * 6 : 0)
    game.cash += Math.max(1, Math.round(reward * 1.4 * this.diff.cashMult))
    game.score += Math.round(e.def.reward * 10 * this.diff.scoreMult)
    game.kills++
    if (src) src.kills++
    this.registerCombo()
    this.deathRing(e)
    this.burst.particleTint = e.def.tint
    this.burst.explode(e.def.boss ? 80 : 12, e.x, e.y)
    sfx('pop')
    if (e.def.splits) {
      for (let i = 0; i < e.def.splits.count; i++) {
        const child = this.spawnEnemy(e.def.splits.type, e.pathIdx, Math.max(0, e.dist + (i - 1) * 18))
        child.x = e.x
        child.y = e.y
      }
    }
    if (e.def.boss) {
      this.cameras.main.shake(700, 0.012)
      this.cameras.main.flash(300, 200, 255, 200)
      this.floatText(e.x, e.y - 40, `+$${e.def.reward}`, '#ffe066', 44)
      this.slowMo = 1.4
      for (let i = 0; i < 9; i++) {
        this.time.delayedCall(i * 110, () => {
          const x = e.x + (Math.random() - 0.5) * 160, y = e.y + (Math.random() - 0.5) * 160
          this.ringFx(x, y, 70 + Math.random() * 60, i % 2 ? 0xffd25a : 0x9effa0, 380)
          this.burst.particleTint = i % 2 ? 0xffb03a : 0xb8ffb0
          this.burst.explode(30, x, y)
        })
      }
      this.announce('MOTHERSHIP DOWN!', `+$${e.def.reward}`, '#9effa0')
    }
    if (e.def.golden) {
      const bonus = Math.round(reward * 1.4 * this.diff.cashMult)
      this.burst.particleTint = 0xffd84a
      this.burst.explode(45, e.x, e.y)
      this.ringFx(e.x, e.y, 120, 0xffd84a, 450)
      this.floatText(e.x, e.y - 40, `TREASURE +$${bonus}`, '#ffd84a', 36)
      this.cameras.main.flash(120, 255, 230, 140)
      sfx('gold')
    }
  }

  // ------------------------------------------------------------------ towers

  private canSee(t: Tower, e: Enemy) {
    return !e.def.cloaked || t.detect
  }

  private findTarget(t: Tower): Enemy | null {
    let best: Enemy | null = null
    let bestScore = -Infinity
    const r = t.eff.range
    for (const e of this.enemies) {
      if (e.dead || e.dist < 0) continue
      const d = Math.hypot(e.x - t.x, e.y - t.y)
      if (d > r + e.def.radius * 0.5) continue
      if (!this.canSee(t, e)) continue
      let score: number
      switch (t.target) {
        case 'first': score = e.dist / e.path.total; break
        case 'last': score = -e.dist / e.path.total; break
        case 'strong': score = e.hp + e.shield + (e.def.boss ? 1e7 : 0); break
        default: score = -d
      }
      if (score > bestScore) { bestScore = score; best = e }
    }
    return best
  }

  private updateTower(t: Tower, dt: number) {
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 4)
    if (t.def.kind === 'support') return
    t.cd -= dt
    if (t.cd > 0) return
    const target = this.findTarget(t)
    if (!target) return
    t.cd = 1 / t.eff.rate
    t.recoil = 1
    const ang = Math.atan2(target.y - t.y, target.x - t.x)
    if (t.def.rotates) t.body.rotation = ang + Math.PI / 2
    if (t.def.kind !== 'stomp' && this.enemies.length < 200) {
      this.muzzle.particleTint = t.def.kind === 'chain' ? 0xc8a0ff : 0xfff2c0
      this.muzzle.explode(3, t.x + Math.cos(ang) * 26, t.y + Math.sin(ang) * 26)
    }
    const s = t.eff
    switch (t.def.kind) {
      case 'projectile': {
        const n = s.shots
        const lead = this.predict(target, Math.hypot(target.x - t.x, target.y - t.y) / s.projSpeed)
        const a0 = s.homing ? ang : Math.atan2(lead.y - t.y, lead.x - t.x)
        for (let i = 0; i < n; i++) this.fireProjectile(t, a0 + (i - (n - 1) / 2) * s.spread, s.homing ? target : undefined)
        for (let i = 0; i < s.radial; i++) this.fireProjectile(t, (i / s.radial) * Math.PI * 2)
        sfx(t.def.id === 'hive' ? 'buzz' : 'quill')
        break
      }
      case 'hitscan': {
        this.applyHit(target, t, s.damage)
        this.fx.push({ pts: [t.x, t.y - 10, target.x, target.y], life: 0.14, max: 0.14, color: 0xfff1b0, width: 4 })
        this.burst.particleTint = 0xffe8a0
        this.burst.explode(6, target.x, target.y)
        sfx('snipe')
        break
      }
      case 'stomp': {
        for (const e of this.enemies) {
          if (e.dead || !this.canSee(t, e)) continue
          if (Math.hypot(e.x - t.x, e.y - t.y) <= s.range + e.def.radius * 0.5) this.applyHit(e, t, s.damage)
        }
        const ring = this.add.image(t.x, t.y, 'ring').setDepth(6).setTint(0xd8b080).setScale(0.1).setAlpha(0.9)
        this.tweens.add({ targets: ring, scale: (s.range * 2) / 236, alpha: 0, duration: 380, ease: 'Cubic.Out', onComplete: () => ring.destroy() })
        this.tweens.add({ targets: t.body, scaleY: TOWER_SCALE * 0.88, duration: 90, yoyo: true })
        sfx('stomp')
        break
      }
      case 'chain': {
        const hitSet = new Set<number>()
        let cur: Enemy = target
        let fromX = t.x, fromY = t.y - 20
        for (let i = 0; i <= s.chains; i++) {
          this.fx.push({ pts: this.jagged(fromX, fromY, cur.x, cur.y), life: 0.18, max: 0.18, color: 0xc8a0ff, width: 3 })
          hitSet.add(cur.uid)
          fromX = cur.x; fromY = cur.y
          this.applyHit(cur, t, s.damage)
          let next: Enemy | null = null
          let nd = 160
          for (const e of this.enemies) {
            if (e.dead || hitSet.has(e.uid) || !this.canSee(t, e)) continue
            const d = Math.hypot(e.x - fromX, e.y - fromY)
            if (d < nd) { nd = d; next = e }
          }
          if (!next) break
          cur = next
        }
        sfx('zap')
        break
      }
      case 'lob': {
        const dist = Math.hypot(target.x - t.x, target.y - t.y)
        const dur = Math.max(0.25, dist / s.projSpeed)
        const land = this.predict(target, dur)
        const sprite = this.add.image(t.x, t.y, t.def.projectile!).setDepth(30)
        this.projectiles.push({
          sprite, x: t.x, y: t.y, vx: 0, vy: 0, speed: 0, tower: t, stats: s, dmg: s.damage,
          pierce: 1, hit: new Set(), life: dur + 1, radius: 0, spin: (Math.random() - 0.5) * 12, dead: false,
          lob: { sx: t.x, sy: t.y, tx: land.x, ty: land.y, t: 0, dur, h: 40 + dist * 0.25 },
        })
        sfx(t.def.id === 'frog' ? 'spit' : 'thud')
        break
      }
    }
  }

  private predict(e: Enemy, time: number) {
    if (e.stunT > 0) return { x: e.x, y: e.y }
    const p = e.path.at(e.dist + e.speed * e.slowF * time)
    return { x: p.x, y: p.y }
  }

  private jagged(x1: number, y1: number, x2: number, y2: number): number[] {
    const pts = [x1, y1]
    const segs = 6
    for (let i = 1; i < segs; i++) {
      const f = i / segs
      pts.push(x1 + (x2 - x1) * f + (Math.random() - 0.5) * 22, y1 + (y2 - y1) * f + (Math.random() - 0.5) * 22)
    }
    pts.push(x2, y2)
    return pts
  }

  private applyHit(e: Enemy, t: Tower, dmg: number, stats: TowerStats = t.eff) {
    if (e.dead) return
    if (stats.stun > 0 && !e.def.boss) e.stunT = Math.max(e.stunT, stats.stun)
    else if (stats.stun > 0) e.stunT = Math.max(e.stunT, stats.stun * 0.25)
    if (stats.slow > 0) {
      const f = e.def.boss ? 1 - stats.slow * 0.4 : 1 - stats.slow
      e.slowF = Math.min(e.slowF === 1 ? 1 : e.slowF, f)
      e.slowT = Math.max(e.slowT, stats.slowDur)
    }
    if (stats.poisonDps > 0) {
      if (stats.poisonDps >= e.poisonDps || e.poisonT <= 0) {
        e.poisonDps = stats.poisonDps
        e.poisonSrc = t
      }
      e.poisonT = Math.max(e.poisonT, stats.poisonDur)
    }
    const crit = Math.random() < 0.08
    if (crit) {
      dmg *= 2
      this.muzzle.particleTint = 0xffa030
      this.muzzle.explode(6, e.x, e.y)
      sfx('crit')
    }
    this.hurt(e, dmg, t, { ap: stats.armorPierce, shred: stats.shred, crit })
  }

  private fireProjectile(t: Tower, angle: number, homing?: Enemy) {
    const s = t.eff
    const sprite = this.add.image(t.x, t.y, t.def.projectile!).setDepth(30).setRotation(angle)
    if (t.def.id === 'hive') sprite.setScale(1.1)
    this.projectiles.push({
      sprite, x: t.x, y: t.y,
      vx: Math.cos(angle) * s.projSpeed, vy: Math.sin(angle) * s.projSpeed, speed: s.projSpeed,
      tower: t, stats: s, dmg: s.damage, pierce: s.pierce, hit: new Set(),
      life: homing ? 3 : (s.range * 1.4) / s.projSpeed + 0.1, homing, radius: 10, spin: 0, dead: false,
    })
  }

  private updateProjectile(p: Projectile, dt: number) {
    if (p.lob) {
      const L = p.lob
      L.t += dt
      const f = Math.min(1, L.t / L.dur)
      p.x = L.sx + (L.tx - L.sx) * f
      p.y = L.sy + (L.ty - L.sy) * f - Math.sin(f * Math.PI) * L.h
      p.sprite.setPosition(p.x, p.y).setScale(1 + Math.sin(f * Math.PI) * 0.5)
      p.sprite.rotation += p.spin * dt
      if (f >= 1) {
        p.dead = true
        this.explode(L.tx, L.ty, p.stats.splash, p.dmg, p.tower, p.stats)
        if (p.stats.cluster > 0) {
          for (let i = 0; i < p.stats.cluster; i++) {
            const a = (i / p.stats.cluster) * Math.PI * 2 + Math.random()
            this.explode(L.tx + Math.cos(a) * 55, L.ty + Math.sin(a) * 55, p.stats.splash * 0.55, p.dmg * 0.5, p.tower, p.stats)
          }
        }
      }
      return
    }
    if (p.homing) {
      if (p.homing.dead) p.homing = this.nearestVisible(p.tower, p.x, p.y, 260) ?? undefined
      if (p.homing) {
        const want = Math.atan2(p.homing.y - p.y, p.homing.x - p.x)
        const cur = Math.atan2(p.vy, p.vx)
        const next = Phaser.Math.Angle.RotateTo(cur, want, 9 * dt)
        p.vx = Math.cos(next) * p.speed
        p.vy = Math.sin(next) * p.speed
      }
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
    p.sprite.setPosition(p.x, p.y).setRotation(Math.atan2(p.vy, p.vx))
    if (p.life <= 0 || p.x < -50 || p.y < -50 || p.x > WORLD_W + 50 || p.y > WORLD_H + 50) { p.dead = true; return }
    for (const e of this.enemies) {
      if (e.dead || p.hit.has(e.uid)) continue
      if (Math.abs(e.x - p.x) > e.def.radius + p.radius || Math.abs(e.y - p.y) > e.def.radius + p.radius) continue
      if (Math.hypot(e.x - p.x, e.y - p.y) > e.def.radius + p.radius) continue
      p.hit.add(e.uid)
      this.applyHit(e, p.tower, p.dmg, p.stats)
      if (--p.pierce <= 0) { p.dead = true; break }
    }
  }

  private nearestVisible(t: Tower, x: number, y: number, maxD: number): Enemy | null {
    let best: Enemy | null = null
    let bd = maxD
    for (const e of this.enemies) {
      if (e.dead || !this.canSee(t, e)) continue
      const d = Math.hypot(e.x - x, e.y - y)
      if (d < bd) { bd = d; best = e }
    }
    return best
  }

  private explode(x: number, y: number, radius: number, dmg: number, t: Tower, stats: TowerStats) {
    for (const e of this.enemies) {
      if (e.dead) continue
      if (Math.hypot(e.x - x, e.y - y) <= radius + e.def.radius * 0.6) this.applyHit(e, t, dmg, stats)
    }
    const frog = t.def.id === 'frog'
    const ring = this.add.image(x, y, 'ring').setDepth(31).setTint(frog ? 0x8aff4a : 0xc8b8a0).setScale(0.05).setAlpha(0.9)
    this.tweens.add({ targets: ring, scale: (radius * 2) / 236, alpha: 0, duration: 300, ease: 'Cubic.Out', onComplete: () => ring.destroy() })
    this.burst.particleTint = frog ? 0x9aff5a : 0xb0a490
    this.burst.explode(frog ? 10 : 14, x, y)
  }

  // ------------------------------------------------------------------ placement & selection

  private canPlace(x: number, y: number): boolean {
    if (x < 30 || y < 30 || x > WORLD_W - 30 || y > WORLD_H - 30) return false
    for (const p of this.paths) if (p.distTo(x, y) < this.map.pathWidth / 2 + TOWER_FOOTPRINT - 4) return false
    for (const o of this.obstacles) if (Math.hypot(o.x - x, o.y - y) < o.r * 0.8 + TOWER_FOOTPRINT * 0.7) return false
    for (const t of this.towers) if (Math.hypot(t.x - x, t.y - y) < TOWER_FOOTPRINT * 2 - 6) return false
    return true
  }

  private startPlacing(id: TowerId) {
    if (game.over) return
    this.cancelPlacing()
    this.select(null)
    game.placingId = id
    const base = this.add.image(0, 0, 'tower_base').setScale(TOWER_SCALE)
    const body = this.add.image(0, 0, `tower_${id}`).setScale(TOWER_SCALE)
    this.ghost = this.add.container(-200, -200, [base, body]).setDepth(50).setAlpha(0.75)
    const p = this.input.activePointer
    if (p) this.onMove(p)
  }

  private cancelPlacing() {
    this.ghost?.destroy()
    this.ghost = null
    game.placingId = null
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (!this.ghost) return
    this.ghost.setPosition(p.worldX, p.worldY)
    this.ghostValid = this.canPlace(p.worldX, p.worldY)
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (game.aiming) {
      if (!p.rightButtonDown()) this.eagleStrike(p.worldX, p.worldY)
      game.aiming = null
      return
    }
    if (p.rightButtonDown()) {
      this.cancelPlacing()
      this.select(null)
      return
    }
    if (game.placingId) {
      this.onMove(p)
      if (!this.ghostValid) { sfx('error'); return }
      const id = game.placingId
      if (this.placeTower(id, p.worldX, p.worldY)) {
        const shift = (p.event as MouseEvent | undefined)?.shiftKey
        if (shift && game.cash >= towerCost(getTower(id).cost)) return
        this.cancelPlacing()
      }
      return
    }
    const hit = this.towers.find((t) => Math.hypot(t.x - p.worldX, t.y - p.worldY) < TOWER_FOOTPRINT + 4)
    this.select(hit ?? null)
  }

  private placeTower(id: TowerId, x: number, y: number): boolean {
    const def = getTower(id)
    const cost = towerCost(def.cost)
    if (game.cash < cost) { sfx('error'); return false }
    game.cash -= cost
    const depth = 10 + y / 2000
    const base = this.add.image(x, y, 'tower_base').setScale(TOWER_SCALE).setDepth(depth)
    const body = this.add.image(x, y, `tower_${id}`).setScale(TOWER_SCALE).setDepth(depth + 0.0001)
    const pips = this.add.graphics().setDepth(depth + 0.0002)
    const stats = computeStats(def, [0, 0])
    const t: Tower = {
      uid: this.uid++, def, x, y, tiers: [0, 0], stats, eff: { ...stats }, cd: 0, target: 'first',
      base, body, pips, kills: 0, damage: 0, spent: cost, detect: stats.detect, buffed: false, recoil: 0, glow: false,
    }
    this.towers.push(t)
    this.recalcTowers()
    this.drawPips(t)
    body.setScale(0)
    this.tweens.add({ targets: body, scale: TOWER_SCALE, duration: 260, ease: 'Back.Out' })
    this.burst.particleTint = 0xffffff
    this.burst.explode(10, x, y)
    sfx('place')
    return true
  }

  private recalcTowers() {
    const globalDetect = this.towers.some((t) => t.stats.globalDetect)
    for (const t of this.towers) {
      const eff: TowerStats = { ...t.stats }
      let bRate = 0, bRange = 0, bDmg = 0
      let aura = false
      for (const o of this.towers) {
        if (o === t) continue
        const d = Math.hypot(o.x - t.x, o.y - t.y)
        if (o.def.kind === 'support' && d <= o.stats.range) {
          bRate = Math.max(bRate, o.stats.buffRate)
          bRange = Math.max(bRange, o.stats.buffRange)
          bDmg = Math.max(bDmg, o.stats.buffDamage)
        }
        if (o.stats.detectAura && d <= o.stats.range) aura = true
      }
      if (t.def.kind !== 'support') {
        eff.rate *= 1 + bRate
        eff.range *= 1 + bRange
        eff.damage += bDmg
      }
      t.buffed = bRate > 0 && t.def.kind !== 'support'
      t.detect = eff.detect || globalDetect || aura
      t.eff = eff
    }
  }

  private drawPips(t: Tower) {
    const g = t.pips
    g.clear()
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < 3; i++) {
        const x = t.x + (p === 0 ? -1 : 1) * (10 + i * 9)
        const y = t.y + 34
        g.fillStyle(0x000000, 0.55).fillCircle(x, y, 4.5)
        if (i < t.tiers[p]) g.fillStyle(p === 0 ? 0xffc93c : 0x5ad1ff, 1).fillCircle(x, y, 3.4)
      }
    }
    const total = t.tiers[0] + t.tiers[1]
    const scale = TOWER_SCALE * (1 + total * 0.035)
    t.body.setScale(scale)
    if (!t.glow && (t.tiers[0] >= 3 || t.tiers[1] >= 3)) {
      t.glow = true
      t.body.preFX?.addGlow(t.tiers[0] >= 3 ? 0xffd25a : 0x6ad8ff, 3, 0, false, 0.1, 12)
      t.base.setTint(t.tiers[0] >= 3 ? 0xffe6a0 : 0xbfeaff)
    }
  }

  private select(t: Tower | null) {
    this.selected = t
    this.refreshInfo()
  }

  private refreshInfo() {
    const t = this.selected
    if (!t) { game.selected = null; return }
    const next = ([0, 1] as const).map((p): UpgradeInfo | null => {
      const tier = t.tiers[p]
      if (tier >= 3) return { name: 'Max tier', desc: '', cost: 0, locked: true, maxed: true }
      const u = t.def.paths[p][tier]
      return { name: u.name, desc: u.desc, cost: towerCost(u.cost), locked: !canUpgradePath(t.tiers, p), maxed: false }
    }) as [UpgradeInfo | null, UpgradeInfo | null]
    const info: SelectedInfo = {
      uid: t.uid, id: t.def.id, name: t.def.name, tiers: [...t.tiers] as [number, number],
      pathNames: t.def.pathNames,
      owned: [t.def.paths[0].slice(0, t.tiers[0]).map((u) => u.name), t.def.paths[1].slice(0, t.tiers[1]).map((u) => u.name)],
      next, stats: { ...t.eff }, kills: t.kills, damage: Math.round(t.damage),
      sellValue: Math.floor(t.spent * 0.7), target: t.target, detecting: t.detect, buffed: t.buffed,
    }
    game.selected = info
  }

  private upgrade(path: 0 | 1) {
    const t = this.selected
    if (!t || game.over) return
    const tier = t.tiers[path]
    if (!canUpgradePath(t.tiers, path)) { sfx('error'); return }
    const cost = towerCost(t.def.paths[path][tier].cost)
    if (game.cash < cost) { sfx('error'); return }
    game.cash -= cost
    t.spent += cost
    t.tiers[path]++
    t.stats = computeStats(t.def, t.tiers)
    this.recalcTowers()
    this.drawPips(t)
    this.burst.particleTint = path === 0 ? 0xffd25a : 0x6ad8ff
    this.burst.explode(24, t.x, t.y)
    sfx('upgrade')
    const col = path === 0 ? 0xffd25a : 0x6ad8ff
    const pillar = this.add.rectangle(t.x, t.y - 260, 70, 520, col, 0.45).setDepth(39).setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({ targets: pillar, scaleX: 0, alpha: 0, duration: 650, ease: 'Cubic.In', onComplete: () => pillar.destroy() })
    this.ringFx(t.x, t.y, 90, col, 450)
    this.refreshInfo()
  }

  private sell() {
    const t = this.selected
    if (!t) return
    game.cash += Math.floor(t.spent * 0.7)
    t.base.destroy(); t.body.destroy(); t.pips.destroy()
    this.towers = this.towers.filter((o) => o !== t)
    for (const p of this.projectiles) if (p.tower === t) p.dead = true
    this.recalcTowers()
    this.burst.particleTint = 0xffe066
    this.burst.explode(16, t.x, t.y)
    sfx('sell')
    this.select(null)
  }

  private setTarget(mode: TargetMode) {
    if (!this.selected) return
    this.selected.target = mode
    this.refreshInfo()
  }

  private cycleTarget() {
    if (!this.selected) return
    const modes: TargetMode[] = ['first', 'last', 'strong', 'close']
    this.setTarget(modes[(modes.indexOf(this.selected.target) + 1) % modes.length])
  }

  // ------------------------------------------------------------------ powers & juice

  private usePower(id: PowerId) {
    if (game.over || !game.waveActive || this.powerCd[id] > 0) { sfx('error'); return }
    if (id === 'strike') {
      game.aiming = game.aiming ? null : 'strike'
      this.cancelPlacing()
      return
    }
    this.powerCd[id] = POWERS.find((p) => p.id === id)!.cd
    if (id === 'roar') this.thunderRoar()
    else this.stampede()
  }

  private thunderRoar() {
    for (const e of this.enemies) e.stunT = Math.max(e.stunT, e.def.boss ? 0.8 : 2.5)
    this.ringFx(WORLD_W / 2, WORLD_H / 2, 1300, 0xffd25a, 900)
    for (const t of this.towers) if (t.def.id === 'lion') this.ringFx(t.x, t.y, 400, 0xffb03a, 700)
    this.cameras.main.shake(600, 0.012)
    this.cameras.main.flash(250, 255, 220, 120)
    this.announce('THUNDER ROAR!', 'All aliens stunned', '#ffd25a')
    sfx('roar')
  }

  private stampede() {
    const dmg = 25 + game.wave * 9
    for (const path of this.paths) {
      const hit = new Set<number>()
      for (let i = 0; i < 5; i++) {
        const sprite = this.add.image(-300, -300, 'tower_elephant').setDepth(35).setScale(0.6).setTint(0xffe6c0)
        this.runners.push({ sprite, path, dist: path.total + 40 + i * 85, hit, dmg })
      }
    }
    this.cameras.main.shake(1800, 0.005)
    this.announce('STAMPEDE!', 'Clear the trail!', '#ffb347')
    sfx('stampede')
  }

  private updateRunners(dt: number) {
    for (const r of this.runners) {
      r.dist -= 560 * dt
      const p = r.path.at(r.dist)
      r.sprite.setPosition(p.x, p.y).setRotation(p.angle - Math.PI / 2)
      if (Math.random() < 0.5) this.dust.emitParticleAt(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.5) * 40)
      for (const e of this.enemies) {
        if (e.dead || r.hit.has(e.uid)) continue
        if (Math.hypot(e.x - p.x, e.y - p.y) > e.def.radius + 36) continue
        r.hit.add(e.uid)
        e.dist = Math.max(0, e.dist - (e.def.boss ? 15 : 70))
        this.hurt(e, r.dmg * (e.def.boss ? 3 : 1), undefined, { ap: true })
      }
    }
    this.runners = this.runners.filter((r) => {
      if (r.dist < -80) { r.sprite.destroy(); return false }
      return true
    })
  }

  private eagleStrike(x: number, y: number) {
    if (this.powerCd.strike > 0) return
    this.powerCd.strike = POWERS.find((p) => p.id === 'strike')!.cd
    const dmg = 60 + game.wave * 12
    this.announce('EAGLE STRIKE!', '', '#ffb03a')
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 110, () => {
        const tx = x + (Math.random() - 0.5) * 90, ty = y + (Math.random() - 0.5) * 90
        const eg = this.add.image(tx - 300, ty - 700, 'tower_eagle').setDepth(56).setScale(0.7)
          .setRotation(Math.atan2(700, 300) + Math.PI / 2)
        this.tweens.add({
          targets: eg, x: tx, y: ty, duration: 320, ease: 'Quad.In',
          onComplete: () => { eg.destroy(); this.blast(tx, ty, 80, dmg) },
        })
      })
    }
  }

  private blast(x: number, y: number, radius: number, dmg: number) {
    for (const e of this.enemies) {
      if (e.dead) continue
      if (Math.hypot(e.x - x, e.y - y) <= radius + e.def.radius * 0.6) this.hurt(e, dmg, undefined, { ap: true })
    }
    this.ringFx(x, y, radius * 1.4, 0xffb03a, 350)
    this.burst.particleTint = 0xffc060
    this.burst.explode(26, x, y)
    this.cameras.main.shake(140, 0.006)
    sfx('strike')
  }

  private registerCombo() {
    this.combo = this.gameTime - this.lastKillT < 1.2 ? this.combo + 1 : 1
    this.lastKillT = this.gameTime
    game.combo = this.combo
    if (this.combo > game.bestCombo) game.bestCombo = this.combo
    const tier = COMBO_TIERS.find((t) => t.at === this.combo)
    if (tier) {
      const bonus = Math.round(tier.at * 2 * this.diff.cashMult)
      game.cash += bonus
      game.score += Math.round(tier.at * 25 * this.diff.scoreMult)
      this.announce(`${tier.name}!`, `x${tier.at} combo  ·  +$${bonus}`, tier.color)
      sfx('streak')
    }
  }

  private ringFx(x: number, y: number, radius: number, color: number, duration: number) {
    if (this.ringCount > 30) return
    this.ringCount++
    const ring = this.add.image(x, y, 'ring').setDepth(42).setTint(color).setScale(0.05).setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({
      targets: ring, scale: (radius * 2) / 236, alpha: 0, duration, ease: 'Cubic.Out',
      onComplete: () => { ring.destroy(); this.ringCount-- },
    })
  }

  private deathRing(e: Enemy) {
    if (this.enemies.length > 160) return
    this.ringFx(e.x, e.y, e.def.radius * 2.2, e.def.tint, 280)
  }

  private dmgNumber(x: number, y: number, dmg: number, crit: boolean) {
    if ((!crit && dmg < 4) || this.dmgTexts > 35) return
    this.dmgTexts++
    const txt = this.add.text(x + (Math.random() - 0.5) * 24, y, crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`, {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: crit ? '30px' : '19px', fontStyle: '900',
      color: crit ? '#ffb02a' : '#ffffff', stroke: '#1a1030', strokeThickness: crit ? 6 : 4,
    }).setOrigin(0.5).setDepth(55).setScale(crit ? 1.5 : 1)
    this.tweens.add({
      targets: txt, y: y - (crit ? 55 : 35), alpha: 0, scale: 1, duration: crit ? 800 : 550, ease: 'Cubic.Out',
      onComplete: () => { txt.destroy(); this.dmgTexts-- },
    })
  }

  private announceObjs: Phaser.GameObjects.Text[] = []

  private announce(title: string, sub: string, color: string) {
    for (const o of this.announceObjs) { this.tweens.killTweensOf(o); o.destroy() }
    const t = this.add.text(WORLD_W / 2, 220, title, {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '64px', fontStyle: '900',
      color, stroke: '#1a1030', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(61).setScale(2).setAlpha(0).setShadow(0, 0, color, 24, true, true)
    const s = this.add.text(WORLD_W / 2, 280, sub, {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '28px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#1a1030', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(61).setAlpha(0)
    this.announceObjs = [t, s]
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' })
    this.tweens.add({ targets: s, alpha: 1, duration: 260, delay: 120 })
    this.tweens.add({ targets: [t, s], alpha: 0, y: '-=30', delay: 1300, duration: 450, onComplete: () => { t.destroy(); s.destroy() } })
  }

  private createAmbient() {
    const deco = this.map.theme.deco
    const area = { x: { min: 0, max: WORLD_W }, y: { min: 0, max: WORLD_H } }
    let cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig
    if (deco === 'arctic') {
      cfg = {
        x: { min: -100, max: WORLD_W + 100 }, y: -20, lifespan: 16000, speedY: { min: 45, max: 100 },
        speedX: { min: -30, max: 25 }, scale: { min: 0.1, max: 0.32 }, alpha: { min: 0.5, max: 0.95 },
        frequency: 45, advance: 16000,
      }
    } else if (deco === 'jungle') {
      cfg = {
        ...area, lifespan: { min: 2500, max: 5200 }, speed: { min: 5, max: 28 }, scale: { min: 0.18, max: 0.38 },
        alpha: { values: [0, 1, 0.2, 0.9, 0] }, tint: 0xe2ff7a, blendMode: 'ADD', frequency: 70, advance: 5000,
      }
    } else {
      cfg = {
        ...area, lifespan: { min: 4000, max: 8000 }, speedX: { min: 10, max: 45 }, speedY: { min: -12, max: 8 },
        scale: { min: 0.06, max: 0.2 }, alpha: { values: [0, 0.7, 0] }, tint: 0xfff0c0, blendMode: 'ADD',
        frequency: 70, advance: 8000,
      }
    }
    this.add.particles(0, 0, 'spark', cfg).setDepth(48)
  }

  // ------------------------------------------------------------------ waves

  private startWave() {
    if (game.waveActive || game.over) return
    game.wave++
    this.autoTimer = -1
    const groups = buildWave(game.wave)
    this.queue = []
    let k = 0
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) this.queue.push({ t: g.delay + i * g.interval, type: g.type, pathIdx: k++ })
    }
    this.queue.sort((a, b) => a.t - b.t)
    this.waveTime = 0
    game.waveActive = true
    game.nextWave = summarizeWave(buildWave(game.wave + 1))
    const boss = groups.some((g) => ENEMIES[g.type].boss)
    this.banner(`Wave ${game.wave}`, boss ? '⚠ MOTHERSHIP INCOMING ⚠' : groups.some((g) => g.type === 'brute') ? 'Brutes approaching!' : '')
    sfx('wave')
  }

  private waveComplete() {
    game.waveActive = false
    const bonus = Math.round((100 + game.wave * 15) * this.diff.cashMult)
    const income = this.towers.reduce((s, t) => s + t.stats.income, 0)
    game.cash += bonus + income
    game.score += Math.round(game.wave * 50 * this.diff.scoreMult)
    this.floatText(WORLD_W / 2, 150, `Wave cleared! +$${bonus}${income ? `  ·  Tribute +$${income}` : ''}`, '#ffe066', 38)
    sfx('cash')
    if (!game.freeplay && game.wave >= this.diff.waves) {
      game.score += Math.round(game.lives * 25 * this.diff.scoreMult)
      game.over = { won: true, saved: false }
      this.cancelPlacing()
      sfx('win')
      return
    }
    if (game.autoStart) this.autoTimer = 1.5
  }

  // ------------------------------------------------------------------ rendering

  private render(realDt: number) {
    // enemies visuals
    for (const e of this.enemies) {
      e.bob += realDt * 6
      const sq = e.def.faces || e.def.boss ? 1 : 1 + Math.sin(e.bob) * 0.05
      const w = e.warp < 1 ? Phaser.Math.Easing.Back.Out(e.warp) : 1
      e.sprite.setPosition(e.x, e.y).setScale(e.baseScale * (2 - sq) * w, e.baseScale * sq * w)
      if (e.def.golden && Math.random() < 0.6) this.goldTrail.emitParticleAt(e.x, e.y)
      if (e.poisonT > 0) e.sprite.setTint(0xb8ff9a)
      else if (e.stunT > 0) e.sprite.setTint(0xfff2a0)
      else if (e.slowT > 0) e.sprite.setTint(0xa8d8ff)
      else e.sprite.clearTint()
      if (e.shieldSprite) {
        e.shieldSprite.setPosition(e.x, e.y).setVisible(e.shield > 0.5).setAlpha(0.4 + (e.shield / e.maxShield) * 0.6)
      }
    }

    // towers recoil
    for (const t of this.towers) {
      if (t.def.rotates && t.recoil > 0) {
        const off = t.recoil * 4
        t.body.setPosition(t.x - Math.sin(t.body.rotation) * off, t.y + Math.cos(t.body.rotation) * off)
      } else if (t.def.id === 'lion' || t.def.id === 'owl') {
        t.body.y = t.y + Math.sin(this.time.now / 500 + t.uid) * 1.5
      }
    }

    // hp bars
    const g = this.hpG
    g.clear()
    let boss: Enemy | null = null
    for (const e of this.enemies) {
      if (e.def.boss && (!boss || e.hp > boss.hp)) boss = e
      if (e.hp >= e.maxHp && e.shield >= e.maxShield) continue
      const w = Math.max(28, e.def.radius * 1.6)
      const x = e.x - w / 2, y = e.y - e.def.radius * 1.25 - 8
      g.fillStyle(0x000000, 0.6).fillRoundedRect(x - 1, y - 1, w + 2, 7, 3)
      const f = Math.max(0, e.hp / e.maxHp)
      g.fillStyle(f > 0.5 ? 0x5aff6a : f > 0.25 ? 0xffd23a : 0xff4a4a, 1).fillRoundedRect(x, y, w * f, 5, 2)
      if (e.maxShield > 0 && e.shield > 0) g.fillStyle(0x5ad8ff, 1).fillRect(x, y - 4, w * (e.shield / e.maxShield), 3)
      if (e.armor > 0) g.fillStyle(0xb8c4d6, 1).fillCircle(x - 6, y + 2, 4)
    }
    game.boss = boss ? { name: boss.def.name, frac: Math.round((boss.hp / boss.maxHp) * 200) / 200 } : null

    // fx
    const f = this.fxG
    f.clear()
    for (const b of this.fx) {
      const a = Math.max(0, b.life / b.max)
      f.lineStyle(b.width * 2.5, b.color, a * 0.35)
      this.polyline(f, b.pts)
      f.lineStyle(b.width, 0xffffff, a)
      this.polyline(f, b.pts)
    }
    for (const p of game.powers) {
      const cd = Math.ceil(this.powerCd[p.id])
      if (p.cd !== cd) p.cd = cd
    }

    // range circles
    const r = this.rangeG
    r.clear()
    if (this.selected) {
      const t = this.selected
      const col = t.def.kind === 'support' ? 0xffb84a : 0xffffff
      r.fillStyle(col, 0.1).fillCircle(t.x, t.y, Math.min(t.eff.range, 2400))
      r.lineStyle(2, col, 0.6).strokeCircle(t.x, t.y, Math.min(t.eff.range, 2400))
      r.lineStyle(3, 0xffe066, 1).strokeCircle(t.x, t.y, TOWER_FOOTPRINT + 4)
    }
    if (game.aiming) {
      const ptr = this.input.activePointer
      const pulse = 1 + Math.sin(this.time.now / 120) * 0.06
      r.fillStyle(0xff7a2a, 0.15).fillCircle(ptr.worldX, ptr.worldY, 110 * pulse)
      r.lineStyle(3, 0xffb03a, 0.9).strokeCircle(ptr.worldX, ptr.worldY, 110 * pulse)
      r.lineStyle(2, 0xffffff, 0.8)
      r.lineBetween(ptr.worldX - 30, ptr.worldY, ptr.worldX + 30, ptr.worldY)
      r.lineBetween(ptr.worldX, ptr.worldY - 30, ptr.worldX, ptr.worldY + 30)
    }
    if (this.ghost && game.placingId) {
      const def = getTower(game.placingId)
      const range = Math.min(computeStats(def, [0, 0]).range, 2400)
      const col = this.ghostValid ? 0x7aff7a : 0xff4a4a
      r.fillStyle(col, 0.12).fillCircle(this.ghost.x, this.ghost.y, range)
      r.lineStyle(2, col, 0.7).strokeCircle(this.ghost.x, this.ghost.y, range)
    }

    this.infoTimer -= realDt
    if (this.selected && this.infoTimer <= 0) {
      this.infoTimer = 0.3
      this.refreshInfo()
    }
  }

  private polyline(g: Phaser.GameObjects.Graphics, pts: number[]) {
    g.beginPath()
    g.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
    g.strokePath()
  }

  private bannerObjs: Phaser.GameObjects.Text[] = []

  private banner(title: string, sub: string) {
    for (const o of this.bannerObjs) { this.tweens.killTweensOf(o); o.destroy() }
    const t = this.add.text(WORLD_W / 2, 330, title, {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '84px', fontStyle: '900',
      color: '#ffffff', stroke: '#1a1030', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(60).setAlpha(0).setShadow(0, 6, 'rgba(0,0,0,0.5)', 12, true, true)
    const s = this.add.text(WORLD_W / 2, 410, sub, {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '34px', fontStyle: 'bold',
      color: sub.includes('⚠') ? '#ff6a7a' : '#ffe8a0', stroke: '#1a1030', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(60).setAlpha(0)
    this.bannerObjs = [t, s]
    this.tweens.add({ targets: [t, s], alpha: 1, y: '-=20', duration: 350, ease: 'Back.Out' })
    this.tweens.add({ targets: [t, s], alpha: 0, delay: 1800, duration: 500, onComplete: () => { t.destroy(); s.destroy() } })
  }

  private floatText(x: number, y: number, text: string, color: string, size = 28) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: `${size}px`, fontStyle: 'bold',
      color, stroke: '#1a1030', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(60)
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1800, ease: 'Cubic.Out', onComplete: () => t.destroy() })
  }
}
