import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, NormalBlending, Points, PointsMaterial, Sprite, SpriteMaterial, SRGBColorSpace, Vector3 } from 'three'
import { TRAINING } from './config.js'
import { player, resetPlayer } from './player.js'
import { isLocked, onKey } from './input.js'
import { outlinedText } from './kit.js'
import { fontReady } from './propkit.js'
import { sparkles } from './fx.js'
import { paintSoftDot, paintSparkle } from './textures.js'
import { setTrainingHum, sfx } from './audio.js'
import { BIKE_ICON, shortNumber } from './hud.js'
import { trailMultiplier } from './trailshop.js'
import { registerStore } from './stores.js'

// Training on your treadmill. Walk onto the belt and you mount your bike facing
// the console and pedal; the belt speeds up, the treadmill hums and every
// TRAINING.tick s you gain the level's rate in speed: a "+1" with a bike icon
// pops off you and little bikes fly into the speed counter. The "x4 CLICK!"
// badge beside you (or E, or a click while the mouse is captured) pops a
// wheelie and pays four ticks at once in a burst of icons and sparks. Jump
// gets you off. The Upgrade Treadmill sign sells the next level's rate.
// main.js draws the bike + wheelie from `state`.
const T = TRAINING

// --- "+N" sprites with the bike icon -----------------------------------------------------
let iconImg = null
const popTextures = new Map() // text -> { canvas, tex, paint }
function bikeIcon() {
  if (iconImg) return iconImg
  iconImg = new Image()
  const svg = BIKE_ICON.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  iconImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return iconImg
}
function popTexture(text) {
  let e = popTextures.get(text)
  if (e) return e.tex
  const canvas = document.createElement('canvas')
  const paint = () => {
    const ctx = canvas.getContext('2d')
    ctx.font = '700 96px Fredoka, "Arial Black", sans-serif'
    const tw = ctx.measureText(text).width
    canvas.width = Math.ceil(150 + tw + 24)
    canvas.height = 128
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const img = bikeIcon()
    if (img.complete && img.naturalWidth) ctx.drawImage(img, 6, 14, 128, 100)
    outlinedText(ctx, text, 140 + tw / 2, 66, { size: 96, color: '#8fe6ff', outline: '#0b2560', width: 18 })
    e.tex.needsUpdate = true
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  e = { canvas, tex, paint }
  popTextures.set(text, e)
  paint()
  return tex
}
// Repaint every cached "+N" once the icon and Fredoka are ready.
function repaintPops() {
  for (const e of popTextures.values()) e.paint()
}

// --- A small pool of free particles (sparks, dust) -----------------------------------------
function particlePool(parent, { count, map, additive = true, size = 0.3 }) {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const vel = new Float32Array(count * 3)
  const life = new Float32Array(count) // s left
  const span = new Float32Array(count)
  const tint = new Float32Array(count * 3)
  const drag = new Float32Array(count)
  const grav = new Float32Array(count)
  for (let i = 0; i < count; i++) pos[i * 3 + 1] = -999
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  const mat = new PointsMaterial({ size, map, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? AdditiveBlending : NormalBlending, sizeAttenuation: true, opacity: additive ? 1 : 0.7 })
  const points = new Points(geo, mat)
  points.frustumCulled = false
  parent.add(points)
  let k = 0
  let alive = 0
  const c = new Color()
  return {
    emit(x, y, z, vx, vy, vz, seconds, color, { g = -9, d = 1.5 } = {}) {
      const i = k++ % count
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      vel[i * 3] = vx
      vel[i * 3 + 1] = vy
      vel[i * 3 + 2] = vz
      life[i] = span[i] = seconds
      c.set(color)
      tint[i * 3] = c.r
      tint[i * 3 + 1] = c.g
      tint[i * 3 + 2] = c.b
      grav[i] = g
      drag[i] = d
      alive = count
    },
    update(dt) {
      if (!alive) return
      let any = 0
      const pa = geo.attributes.position.array
      const ca = geo.attributes.color.array
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) continue
        life[i] -= dt
        if (life[i] <= 0) {
          pa[i * 3 + 1] = -999
          continue
        }
        any = 1
        const f = Math.max(0, 1 - drag[i] * dt)
        vel[i * 3] *= f
        vel[i * 3 + 2] *= f
        vel[i * 3 + 1] = vel[i * 3 + 1] * f + grav[i] * dt
        pa[i * 3] += vel[i * 3] * dt
        pa[i * 3 + 1] += vel[i * 3 + 1] * dt
        pa[i * 3 + 2] += vel[i * 3 + 2] * dt
        const fade = Math.min(1, life[i] / span[i] / 0.5)
        ca[i * 3] = tint[i * 3] * fade
        ca[i * 3 + 1] = tint[i * 3 + 1] * fade
        ca[i * 3 + 2] = tint[i * 3 + 2] * fade
      }
      geo.attributes.position.needsUpdate = true
      geo.attributes.color.needsUpdate = true
      if (!any) alive = 0
    },
  }
}
const canvasTex = (c) => {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const SPARK_COLORS = ['#8ff4ff', '#4fb2ff', '#ffffff', '#ffe14a']

export function createTraining({ scene, hud, camera, mill }) {
  const len = mill.len
  const seatZ = mill.z0 + T.seat
  const beltTop = 0.32
  let level = 1
  const rate = () => Math.round(T.rates[level - 1] * trailMultiplier()) // the equipped trail multiplies it
  registerStore({
    snapshot: () => ({ treadmill: level }),
    hydrate(doc) {
      if (!Number.isFinite(doc.treadmill)) return
      level = Math.min(T.rates.length, Math.max(1, Math.floor(doc.treadmill)))
      mill.sign.setLines(upgradeText())
      mill.rate.set(`+${shortNumber(rate())}/s`)
    },
  })

  // --- World effects ---
  const pops = []
  for (let i = 0; i < 18; i++) {
    const s = new Sprite(new SpriteMaterial({ map: popTexture('+1'), transparent: true, depthWrite: false, depthTest: false, fog: false }))
    s.renderOrder = 10
    s.visible = false
    s.userData = { age: -1, vx: 0, vy: 0, vz: 0, life: 1, h: 0.6 }
    scene.add(s)
    pops.push(s)
  }
  let popK = 0
  const pop = (text, x, y, z, vx, vy, vz, life = 1.15, h = 0.6) => {
    const s = pops[popK++ % pops.length]
    const tex = popTexture(text)
    s.material.map = tex
    s.userData.aspect = tex.image.width / tex.image.height
    Object.assign(s.userData, { age: 0, vx, vy, vz, life, h })
    s.position.set(x, y, z)
    s.visible = true
  }
  bikeIcon().addEventListener('load', repaintPops)
  fontReady.then(repaintPops)

  const sparks = particlePool(scene, { count: 90, map: canvasTex(paintSparkle(64)), size: 0.32 })
  const dust = particlePool(scene, { count: 40, map: canvasTex(paintSoftDot(64)), additive: false, size: 0.55 })
  // Blue sparkles rising round you while you train (hidden otherwise).
  const aura = sparkles(scene, mill.x, beltTop, seatZ, { count: 22, radius: 1.1, height: 2.6, color: '#5fd8ff', size: 0.3, speed: 1.1, seed: 41 })
  aura.visible = false

  const beltMat = mill.group.userData.belt.material
  const beltGlow = beltMat.emissiveIntensity

  // --- HUD bits ---
  const badge = document.createElement('button')
  badge.type = 'button'
  badge.className = 'hud-x4'
  badge.innerHTML = `${BIKE_ICON}<span class="x ot">x${T.clickMult}</span><span class="c ot">CLICK!</span><span class="bar"><i></i></span>`
  badge.setAttribute('aria-label', `Pedal hard: x${T.clickMult} speed`)
  const barFill = badge.querySelector('.bar i')
  badge.addEventListener('pointerdown', (e) => {
    e.stopPropagation() // keep taps off the look/joystick zones
    e.preventDefault()
    pedalHard()
  })
  hud.mount(badge)
  const hint = document.createElement('div')
  hint.className = 'hud-trainhint ot'
  hud.mount(hint)
  const upgrade = hud.button('hud-upgrade', '<span class="t ot"></span><span class="p ot"></span>', () => buyUpgrade())
  const upT = upgrade.querySelector('.t')
  const upP = upgrade.querySelector('.p')
  hud.mount(upgrade)

  onKey('KeyE', () => {
    if (player.training) pedalHard()
    else if (nearSign) buyUpgrade()
  })
  // With the mouse captured there is no cursor to aim at the badge: any click pedals.
  window.addEventListener('pointerdown', (e) => {
    if (player.training && e.pointerType === 'mouse' && e.button === 0 && isLocked()) pedalHard()
  })

  // --- State ---
  let armed = true // re-armed once you step off the belt, so getting off doesn't remount
  let tickLeft = T.tick
  let combo = 0
  let cool = 0
  let wasReady = true
  let angle = 0 // wheelie, rad
  let wt = -1 // s since the wheelie started (-1 = none)
  let wFrom = 0 // angle it started from
  let landed = false
  let nearSign = false
  let shownUpgrade = ''
  let dustLeft = 0
  const head = new Vector3()
  const screen = { x: 0, y: 0 }

  const toScreen = (x, y, z) => {
    head.set(x, y, z).project(camera)
    screen.x = (head.x + 1) * 0.5 * window.innerWidth
    screen.y = (1 - head.y) * 0.5 * window.innerHeight
    return screen
  }
  const onBelt = (p) => Math.abs(p.x - mill.x) < 0.95 && p.z > mill.z0 + 0.4 && p.z < mill.z0 + len - 0.2 && p.y < beltTop + 0.5

  function mount() {
    player.training = { x: mill.x, y: beltTop, z: seatZ, facing: Math.PI } // facing the console (north)
    player.wantsOff = false
    tickLeft = T.tick
    combo = 0
    cool = 0
    aura.visible = true
    badge.classList.add('show', 'ready')
    hint.textContent = matchMedia('(pointer: coarse)').matches ? 'Tap x4 to pedal hard · Jump to get off' : 'Click x4 or press E to pedal hard · Space to get off'
    hint.classList.add('show')
    mill.rate.set(`+${shortNumber(rate())}/s`)
    sfx('mount')
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      sparks.emit(mill.x, beltTop + 0.2, seatZ, Math.cos(a) * 3, 2 + Math.random() * 2, Math.sin(a) * 3, 0.7, SPARK_COLORS[i % 4])
    }
  }

  function dismount() {
    player.training = null
    player.wantsOff = false
    armed = false
    angle = 0
    wt = -1
    aura.visible = false
    badge.classList.remove('show', 'ready', 'cool')
    hint.classList.remove('show')
    setTrainingHum(0)
    // Hop off the back of the belt, facing away from the console.
    resetPlayer({ x: mill.x, y: beltTop, z: mill.z0 + len + 0.9 }, 0)
    player.velocity.y = 5
    player.grounded = false
    sfx('dismount')
  }

  // One tick of speed: "+N" popping off you, a bike icon into the counter.
  function gain(n, icons, burst) {
    const x = mill.x
    const y = beltTop + 2.3
    const z = seatZ
    const text = `+${shortNumber(rate())}`
    for (let i = 0; i < icons; i++) {
      const a = burst ? (i / icons) * Math.PI * 2 + Math.random() * 0.5 : Math.random() * Math.PI * 2
      const r = burst ? 1.6 + Math.random() * 0.6 : 0.4
      pop(text, x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.4, Math.cos(a) * r, (burst ? 2.6 : 1.4) + Math.random() * 0.6, Math.sin(a) * r * 0.5, burst ? 1.0 : 1.2, burst ? 0.62 : 0.55)
    }
    hud.addSpeed(n, toScreen(x, y, z), icons)
  }

  // x4: pop a wheelie and pay four ticks at once.
  function pedalHard() {
    if (!player.training || cool > 0) return
    cool = T.clickCooldown
    wasReady = false
    // Up from wherever the front wheel is; a click while it is still up just holds it longer.
    if (wt >= 0 && wt < T.wheelie.rise + T.wheelie.hold) wt = Math.min(wt, T.wheelie.rise)
    else {
      wFrom = angle
      wt = 0
    }
    landed = false
    gain(rate() * T.clickMult, T.clickMult, true)
    sfx('click', combo++)
    badge.classList.remove('pop', 'ready')
    void badge.offsetWidth
    badge.classList.add('pop', 'cool')
    // Sparks spraying off the back wheel, a ring of them round the bike.
    const rz = seatZ + 0.75
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2
      sparks.emit(mill.x, beltTop + 0.15, rz, Math.cos(a) * 2.6, 1.5 + Math.random() * 3, Math.abs(Math.sin(a)) * 3.5 + 1, 0.6 + Math.random() * 0.3, SPARK_COLORS[i % 4])
    }
    for (let i = 0; i < 6; i++) dust.emit(mill.x + (Math.random() - 0.5) * 0.6, beltTop + 0.1, rz, (Math.random() - 0.5) * 1.2, 0.6 + Math.random(), 2.5 + Math.random() * 2, 0.7, '#ffffff', { g: 0.5, d: 2.5 })
  }

  function upgradeText() {
    if (level >= T.rates.length) return ['Upgrade Treadmill', 'Max Level', `+${shortNumber(rate())}/s`]
    return ['Upgrade Treadmill', `Lv ${level} > ${level + 1}`, `$${shortNumber(T.upgradeCash[level - 1])}`, `◎ ${T.upgradeGems[level - 1]}`]
  }
  function buyUpgrade() {
    if (level >= T.rates.length) {
      hud.say('Treadmill is max level!')
      return
    }
    const price = T.upgradeCash[level - 1]
    if (!hud.spend(price)) {
      hud.say(`Need $${shortNumber(price)}`)
      sfx('deny')
      return
    }
    level++
    mill.sign.setLines(upgradeText())
    mill.rate.set(`+${shortNumber(rate())}/s`)
    hud.say(`Treadmill Lv ${level}: +${shortNumber(rate())} speed/s`)
    sfx('upgrade')
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2
      sparks.emit(mill.sign.x, 1.6, mill.sign.z, Math.cos(a) * 3, 3 + Math.random() * 3, Math.sin(a) * 3, 0.9, SPARK_COLORS[i % 4])
    }
    for (let i = 0; i < 3; i++) pop(`+${shortNumber(rate())}/s`, mill.x - 1.9, 2.4, mill.z0 + 0.6, (Math.random() - 0.5) * 0.8, 1.2, 0, 1.4, 0.8)
  }
  mill.rate.set(`+${shortNumber(rate())}/s`)

  const W = T.wheelie
  return {
    // For main.js: whether you are on the bike, the wheelie angle (rad, front up) and the pedalling speed.
    state: { active: false, wheelie: 0, pedal: 0 },
    update(dt) {
      const s = this.state
      // Mount / dismount.
      if (!player.training) {
        const on = onBelt(player.position)
        if (!on) armed = true
        else if (armed && player.grounded && !player.riding && !player.holding) mount()
      } else if (player.wantsOff) dismount()
      const training = !!player.training
      s.active = training

      if (training) {
        tickLeft -= dt
        if (tickLeft <= 0) {
          tickLeft += T.tick
          gain(rate(), 1, false)
          sfx('tick', combo)
        }
        cool = Math.max(0, cool - dt)
        barFill.style.transform = `scaleX(${1 - cool / T.clickCooldown})`
        if (cool === 0 && !wasReady) {
          wasReady = true
          badge.classList.remove('cool')
          badge.classList.add('ready')
        }
        // Badge to the right of your head on screen.
        const p = toScreen(mill.x, beltTop + 2.6, seatZ)
        const r = badge.offsetWidth * 0.6
        badge.style.left = `${Math.min(window.innerWidth - r, Math.max(r, p.x + Math.max(70, window.innerWidth * 0.06)))}px`
        badge.style.top = `${Math.min(window.innerHeight - r, Math.max(r, p.y))}px`
        // Dust off the back wheel.
        dustLeft -= dt
        if (dustLeft <= 0) {
          dustLeft = 0.12
          dust.emit(mill.x + (Math.random() - 0.5) * 0.3, beltTop + 0.08, seatZ + 0.8, (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.4, 1.8 + Math.random(), 0.55, '#e8eef8', { g: 0.4, d: 2 })
        }
      }

      // Wheelie: snaps up from where it is (slight overshoot), wobbles while held,
      // drops, then a little bounce as the front wheel lands. Timed, so any frame rate works.
      if (wt >= 0) {
        wt += dt
        const up = W.rise
        const held = up + W.hold
        const down = held + W.fall
        if (wt < up) {
          const u = wt / up
          const back = 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2 // ease out with overshoot
          angle = wFrom + (W.angle - wFrom) * back
        } else if (wt < held) angle = W.angle + Math.sin((wt - up) * 18) * 0.025
        else if (wt < down) angle = W.angle * (1 - ((wt - held) / W.fall) ** 2)
        else if (wt < down + 0.16) {
          if (!landed && training) {
            landed = true
            // Front wheel lands: a puff of dust.
            for (let i = 0; i < 6; i++) dust.emit(mill.x + (Math.random() - 0.5) * 0.8, beltTop + 0.05, seatZ - 0.75, (Math.random() - 0.5) * 2, 0.5, (Math.random() - 0.5) * 1.5, 0.5, '#ffffff', { g: 0.3, d: 3 })
          }
          angle = Math.sin(((wt - down) / 0.16) * Math.PI) * W.angle * 0.1
        } else {
          angle = 0
          wt = -1
        }
      }
      s.wheelie = angle
      s.pedal = training ? T.pedalSpeed * (1 + angle * 1.6) : 0

      // Belt, glow and sound.
      const ud = mill.group.userData
      const beltTarget = training ? T.beltTraining * (1 + angle) : T.beltIdle
      ud.beltSpeed += (beltTarget - ud.beltSpeed) * Math.min(1, dt * 3)
      beltMat.emissiveIntensity = beltGlow * (training ? 2.2 + angle * 2 : 1)
      setTrainingHum(training ? 1 + angle * 1.1 : 0)

      // "+N" sprites: pop in, float up and drift, fade.
      for (const p of pops) {
        const u = p.userData
        if (u.age < 0) continue
        u.age += dt
        const f = u.age / u.life
        if (f >= 1) {
          p.visible = false
          u.age = -1
          continue
        }
        u.vy -= 1.6 * dt
        p.position.x += u.vx * dt
        p.position.y += u.vy * dt
        p.position.z += u.vz * dt
        u.vx *= 1 - 1.5 * dt
        u.vz *= 1 - 1.5 * dt
        const grow = f < 0.12 ? 0.4 + (f / 0.12) * 0.75 : f < 0.22 ? 1.15 - ((f - 0.12) / 0.1) * 0.15 : 1
        p.scale.set(u.h * u.aspect * grow, u.h * grow, 1)
        p.material.opacity = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3
      }
      sparks.update(dt)
      dust.update(dt)

      // Upgrade button by the sign (on foot only).
      const d = Math.hypot(player.position.x - mill.sign.x, player.position.z - mill.sign.z)
      nearSign = !training && d < T.upgradeRange
      upgrade.classList.toggle('show', nearSign)
      if (nearSign) {
        const max = level >= T.rates.length
        const label = max ? 'Treadmill Max Level' : `Upgrade Treadmill Lv ${level} > ${level + 1}`
        const price = max ? `+${shortNumber(rate())}/s` : `$${shortNumber(T.upgradeCash[level - 1])}`
        const key = label + price + (hud.cash >= (T.upgradeCash[level - 1] ?? 0))
        if (key !== shownUpgrade) {
          shownUpgrade = key
          upT.textContent = label
          upP.textContent = price
          upgrade.classList.toggle('max', max)
          upgrade.classList.toggle('poor', !max && hud.cash < T.upgradeCash[level - 1])
        }
      }
    },
  }
}
