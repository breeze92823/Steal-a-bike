import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, NormalBlending, Points, PointsMaterial, SRGBColorSpace } from 'three'
import { label } from './propkit.js'
import { mulberry32, paintSoftDot, paintSparkle } from './textures.js'

// Small always-on effects: things that bob and spin, rising sparkle particles,
// and text that pops up and floats away ("+$8", "Z"). Props register here
// while the lobby is built; main.js calls updateFx every frame.
// While a lane zone is being built (setFxOwner), everything it registers
// belongs to that zone's group and sleeps whenever the group is hidden.
const frameFns = []
let owner = null
export function setFxOwner(group) {
  owner = group
}
export function onFrame(fn) {
  frameFns.push(owner ? { fn, owner } : { fn, owner: null })
}
export function updateFx(dt, t) {
  for (const f of frameFns) if (!f.owner || f.owner.visible) f.fn(dt, t)
}

// Particle counts scale with the graphics preset (GRAPHICS_PRESETS.particles).
let particleScale = 1
export function setParticleScale(f) {
  particleScale = f
}
const scaled = (n) => Math.max(4, Math.round(n * particleScale))

// Bob an object up and down around its current height (and optionally spin it).
export function bob(obj, amp = 0.2, speed = 2, phase = 0, spin = 0) {
  obj.userData.dynamic = true // never merged by bakeStatic
  const y0 = obj.position.y
  onFrame((dt, t) => {
    obj.position.y = y0 + Math.sin(t * speed + phase) * amp
    if (spin) obj.rotation.y += spin * dt
  })
  return obj
}

let sparkleTex = null
let dotTex = null
function tex(c) {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// Particles rising through a cylinder (radius, height) at (x, y, z), fading out
// at the top. `soft` uses round dots instead of four-point stars. With bloom on,
// `bright` > 1 pushes them over the bloom threshold.
export function sparkles(parent, x, y, z, { count: count0 = 24, radius = 1, height = 2.5, color = '#8ff4ff', size = 0.35, speed = 0.8, soft = false, bright = 2.2, seed = 5 } = {}) {
  sparkleTex ??= tex(paintSparkle(64))
  dotTex ??= tex(paintSoftDot(64))
  const count = scaled(count0)
  const rand = mulberry32(seed)
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const life = new Float32Array(count)
  const vel = new Float32Array(count)
  const base = new Color(color).multiplyScalar(bright)
  const spawn = (i, initial) => {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * radius
    pos[i * 3] = Math.cos(a) * r
    pos[i * 3 + 1] = initial ? rand() * height : 0
    pos[i * 3 + 2] = Math.sin(a) * r
    vel[i] = speed * (0.6 + rand() * 0.8)
    life[i] = pos[i * 3 + 1] / height
  }
  for (let i = 0; i < count; i++) spawn(i, true)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  const mat = new PointsMaterial({ size, map: soft ? dotTex : sparkleTex, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true })
  const points = new Points(geo, mat)
  points.position.set(x, y, z)
  points.frustumCulled = false
  parent.add(points)
  const pa = geo.attributes.position
  const ca = geo.attributes.color
  onFrame((dt) => {
    for (let i = 0; i < count; i++) {
      pa.array[i * 3 + 1] += vel[i] * dt
      const h = pa.array[i * 3 + 1] / height
      if (h >= 1) spawn(i, false)
      const fade = Math.sin(Math.min(1, Math.max(0, pa.array[i * 3 + 1] / height)) * Math.PI) // in and out
      ca.array[i * 3] = base.r * fade
      ca.array[i * 3 + 1] = base.g * fade
      ca.array[i * 3 + 2] = base.b * fade
    }
    pa.needsUpdate = true
    ca.needsUpdate = true
  })
  return points
}

// Text that pops up at (x, y, z) every `every` seconds, floats `rise` m up and fades.
export function risingText(parent, x, y, z, text, { every = 1, rise = 1.3, height = 0.55, duration = 1.1, phase = 0, opts = {} } = {}) {
  const pool = []
  for (let i = 0; i < 2; i++) {
    const s = label(text, height, opts)
    s.visible = false
    s.userData.age = -1
    parent.add(s)
    pool.push(s)
  }
  let next = phase
  let k = 0
  onFrame((dt, t) => {
    if (t >= next) {
      next = t + every
      const s = pool[k++ % pool.length]
      s.userData.age = 0
      s.visible = true
    }
    for (const s of pool) {
      if (s.userData.age < 0) continue
      s.userData.age += dt
      const f = s.userData.age / duration
      if (f >= 1) {
        s.visible = false
        s.userData.age = -1
        continue
      }
      s.position.set(x, y + f * rise, z)
      s.material.opacity = f < 0.15 ? f / 0.15 : 1 - Math.max(0, (f - 0.6) / 0.4)
    }
  })
}

// "Z" letters drifting up from a sleeping guard: each starts small and grey,
// grows, brightens to glowing ice blue and drifts aside as it rises.
const Z_GREY = new Color('#8a93a6')
const Z_ICE = new Color('#d6fbff').multiplyScalar(1.6)
export function zzz(parent, x, y, z, phase = 0) {
  const every = 1.25
  const life = 2.6
  const pool = []
  for (let i = 0; i < 3; i++) {
    const s = label('Z', 1.35, { color: '#ffffff', outline: '#2f5a9a', outlineWidth: 10 })
    s.visible = false
    s.userData.age = -1
    s.userData.base = s.scale.clone()
    parent.add(s)
    pool.push(s)
  }
  let next = phase % every
  let k = 0
  onFrame((dt, t) => {
    if (t >= next) {
      next = t + every
      const s = pool[k++ % pool.length]
      s.userData.age = 0
      s.visible = true
    }
    for (const s of pool) {
      if (s.userData.age < 0) continue
      s.userData.age += dt
      const f = s.userData.age / life
      if (f >= 1) {
        s.visible = false
        s.userData.age = -1
        continue
      }
      const grow = 0.55 + f * 0.75
      s.scale.set(s.userData.base.x * grow, s.userData.base.y * grow, 1)
      s.position.set(x + Math.sin(f * 2.4) * 0.35, y + f * 1.9, z)
      s.material.color.copy(Z_GREY).lerp(Z_ICE, Math.min(1, f * 1.6))
      s.material.opacity = f < 0.12 ? f / 0.12 : 1 - Math.max(0, (f - 0.7) / 0.3)
    }
  })
}

// Specks of light hanging in the air over a box (x0..x1, y0..y1, z0..z1):
// each drifts slowly, wobbles and twinkles. `colors` mixes several tints.
export function motes(parent, { x0, x1, y0, y1, z0, z1, count: count0 = 80, color = '#ffffff', colors = [color], size = 0.16, bright = 1.6, seed = 11 }) {
  dotTex ??= tex(paintSoftDot(64))
  const count = scaled(count0)
  const rand = mulberry32(seed)
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const home = new Float32Array(count * 3)
  const ph = new Float32Array(count)
  const tint = new Float32Array(count * 3)
  const palette = colors.map((c) => new Color(c).multiplyScalar(bright))
  for (let i = 0; i < count; i++) {
    const c = palette[Math.floor(rand() * palette.length)]
    tint[i * 3] = c.r
    tint[i * 3 + 1] = c.g
    tint[i * 3 + 2] = c.b
    home[i * 3] = x0 + rand() * (x1 - x0)
    home[i * 3 + 1] = y0 + rand() * (y1 - y0)
    home[i * 3 + 2] = z0 + rand() * (z1 - z0)
    ph[i] = rand() * 100
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  const mat = new PointsMaterial({ size, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true })
  const points = new Points(geo, mat)
  points.frustumCulled = false
  points.userData.dynamic = true
  parent.add(points)
  const pa = geo.attributes.position
  const ca = geo.attributes.color
  const h = y1 - y0
  onFrame((dt, t) => {
    for (let i = 0; i < count; i++) {
      const p = ph[i]
      const rise = ((t * 0.25 + p) % h + h) % h // slow climb, wrapping round
      pa.array[i * 3] = home[i * 3] + Math.sin(t * 0.4 + p) * 1.2
      pa.array[i * 3 + 1] = y0 + ((home[i * 3 + 1] - y0 + rise) % h)
      pa.array[i * 3 + 2] = home[i * 3 + 2] + Math.cos(t * 0.33 + p * 1.3) * 1.2
      const tw = Math.max(0, Math.sin(t * 1.7 + p * 3))
      ca.array[i * 3] = tint[i * 3] * tw
      ca.array[i * 3 + 1] = tint[i * 3 + 1] * tw
      ca.array[i * 3 + 2] = tint[i * 3 + 2] * tw
    }
    pa.needsUpdate = true
    ca.needsUpdate = true
  })
  return points
}

// Weather over a box: 'fall' (snow, petals, leaves, ash, feathers, confetti:
// drifting down with a sway), 'rise' (embers, bubbles, spores, sparks) or
// 'rain' (fast streaks). `colors` mixes tints; `soft` = round dots.
let streakTex = null
export function weather(parent, { kind = 'fall', x0, x1, y0, y1, z0, z1, count: count0 = 120, colors = ['#ffffff'], size = 0.3, speed = 1.5, sway = 0.8, bright = 1.2, soft = true, seed = 3 }) {
  dotTex ??= tex(paintSoftDot(64))
  sparkleTex ??= tex(paintSparkle(64))
  streakTex ??= (() => {
    const c = document.createElement('canvas')
    c.width = 16
    c.height = 64
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 64)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(255,255,255,0.9)')
    ctx.fillStyle = g
    ctx.fillRect(6, 0, 4, 64)
    return tex(c)
  })()
  const count = scaled(count0)
  const rand = mulberry32(seed)
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const vel = new Float32Array(count)
  const ph = new Float32Array(count)
  const palette = colors.map((c) => new Color(c).multiplyScalar(bright))
  const h = y1 - y0
  for (let i = 0; i < count; i++) {
    pos[i * 3] = x0 + rand() * (x1 - x0)
    pos[i * 3 + 1] = y0 + rand() * h
    pos[i * 3 + 2] = z0 + rand() * (z1 - z0)
    vel[i] = speed * (0.6 + rand() * 0.8)
    ph[i] = rand() * 100
    const c = palette[Math.floor(rand() * palette.length)]
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  const map = kind === 'rain' ? streakTex : soft ? dotTex : sparkleTex
  const mat = new PointsMaterial({ size, map, vertexColors: true, transparent: true, depthWrite: false, blending: kind === 'rain' ? NormalBlending : AdditiveBlending, sizeAttenuation: true })
  const points = new Points(geo, mat)
  points.frustumCulled = false
  points.userData.dynamic = true
  parent.add(points)
  const pa = geo.attributes.position
  const dir = kind === 'rise' ? 1 : -1
  onFrame((dt, t) => {
    const a = pa.array
    for (let i = 0; i < count; i++) {
      let y = a[i * 3 + 1] + dir * vel[i] * dt
      if (y > y1) y = y0
      else if (y < y0) y = y1
      a[i * 3 + 1] = y
      if (kind !== 'rain') {
        a[i * 3] += Math.sin(t * 1.3 + ph[i]) * sway * dt
        a[i * 3 + 2] += Math.cos(t * 0.9 + ph[i]) * sway * 0.6 * dt
      }
    }
    pa.needsUpdate = true
  })
  return points
}
