import { AdditiveBlending, BoxGeometry, Color, DoubleSide, Group, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, TorusGeometry } from 'three'
import { INDEX_WORLDS, LAYOUT } from './config.js'
import { mulberry32 } from './textures.js'
import { neon, put, solidBox } from './propkit.js'
import { bikeTag, canvasTexture, ghost, outlinedText, plain, RARITY, sbox, shade } from './kit.js'
import { terraceWall } from './lobby.js'
import { bob, motes, onFrame, sparkles, weather } from './fx.js'
import { fleetVehicle } from './fleet.js'
import { bikeModel } from './bikes3d.js'
import { bikeValue, CATALOG } from './bikeart.js'
import { DECOR } from './decor.js'
import { floor, patch, place, postSign, sleepingGuard, SOUTH, stealBay } from './lanekit.js'

// One generated world of the north lane (zones 5..12) from its ZONE_THEMES
// entry: the floor (a step up from the last zone), themed cliffs, an entrance
// gate with the world's name in neon, the theme's set piece and decor, weather
// and motes, and its guard post: the world's police vehicle (theme.guard,
// fleet.js) asleep by three of that world's Bike Index bikes (their rarity
// tags, sparkles and auras) and the "Recommended" sign. lane.js decides when
// each zone is built and shown.
const hw = LAYOUT.valley.halfWidth

// --- Numbers ----------------------------------------------------------------------------------
const SUFFIX = [['Sx', 1e21], ['Qi', 1e18], ['Qa', 1e15], ['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]]
export function shortNumber(n) {
  for (const [u, v] of SUFFIX) {
    if (n >= v) {
      const x = n / v
      return `${x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10}${u}`
    }
  }
  return `${Math.floor(n)}`
}

// Three of a world's Index bikes for its bays: two from the commoner part of
// its list and one from the rarer end (its rarest are not left lying about).
function bayPicks(world, rand) {
  const list = (INDEX_WORLDS.find((w) => w.name === world)?.bikes ?? []).map((b) => b[0])
  if (list.length <= 3) return list
  const cut = Math.ceil(list.length / 2)
  const low = list.slice(0, cut)
  const high = list.slice(cut, list.length - 1)
  const take = (arr) => arr.splice(Math.floor(rand() * arr.length), 1)[0]
  return [take(low), take(low), take(high.length ? high : low)]
}
const RANK = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical', 'Insane', 'Secret', 'Limited']

// --- Pieces -------------------------------------------------------------------------------------
// The entrance gate: two studded pillars and a beam lined with neon in the
// zone's colour, ZONE k and the name on a sign, sparkles drifting up.
function zoneGate(root, k, theme, z, y) {
  const c = theme.gate
  const m = plain(shade(theme.wall.main, 0.9), { roughness: 0.6 })
  const glowMat = neon(c, 2.6)
  for (const s of [-1, 1]) {
    sbox(root, 2.2, 11, 2.2, null, s * (hw - 3), y, z, { mat: m })
    put(root, new BoxGeometry(0.25, 10.6, 0.25), glowMat, s * (hw - 3) - s * 1.13, y + 5.5, z + 1.13, false)
    put(root, new BoxGeometry(2.6, 0.4, 2.6), glowMat, s * (hw - 3), y + 11.2, z, false)
    sparkles(root, s * (hw - 3), y + 0.5, z + 1.4, { count: 12, radius: 1, height: 10, color: c, size: 0.4, speed: 0.8, seed: k * 3 + s })
  }
  put(root, new BoxGeometry(hw * 2 - 4, 1.4, 1.6), m, 0, y + 11.6, z)
  put(root, new BoxGeometry(hw * 2 - 4, 0.18, 0.18), glowMat, 0, y + 10.85, z + 0.85, false)
  put(root, new BoxGeometry(hw * 2 - 4, 0.18, 0.18), glowMat, 0, y + 12.35, z + 0.85, false)
  const tex = canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(10,10,24,0.82)'
    ctx.beginPath()
    ctx.roundRect(8, 8, w - 16, h - 16, 40)
    ctx.fill()
    ctx.lineWidth = 10
    ctx.strokeStyle = c
    ctx.stroke()
    outlinedText(ctx, `ZONE ${k}`, w / 2, 70, { size: 64, color: c, outline: '#0a0a18', width: 10 })
    outlinedText(ctx, theme.name, w / 2, 170, { size: 104, color: '#ffffff', outline: '#0a0a18', width: 14 })
  })
  const sign = put(root, new PlaneGeometry(14, 3.5), new MeshBasicMaterial({ map: tex, transparent: true }), 0, y + 14.4, z + 0.3, false)
  sign.material.color.setScalar(1.15)
  // Both faces readable: a second copy looking north for the way back.
  const back = put(root, new PlaneGeometry(14, 3.5), sign.material, 0, y + 14.4, z - 0.3, false)
  back.rotation.y = Math.PI
}

// Neon grid lines over the floor (city and cyber zones).
function gridFloor(root, z0, z1, y, color) {
  const m = neon(color, 2.2)
  for (let x = -hw + 2; x <= hw - 2; x += 4) put(root, new BoxGeometry(0.12, 0.02, z0 - z1), m, x, y + 0.035, (z0 + z1) / 2, false)
  for (let z = z1 + 2; z < z0; z += 4) put(root, new BoxGeometry(hw * 2 - 4, 0.02, 0.12), m, 0, y + 0.035, z, false)
}
// Six glowing stripes down the lane (Rainbow Road).
function rainbowFloor(root, z0, z1, y) {
  const cols = ['#ff3b3b', '#ff9a1a', '#ffe14a', '#3fdc4c', '#2a9cff', '#8a3cff']
  cols.forEach((c, i) => put(root, new BoxGeometry(3, 0.02, z0 - z1), neon(c, 1.4), -7.5 + i * 3, y + 0.035, (z0 + z1) / 2, false))
}
// Aurora curtains: wavy additive ribbons high over the zone.
const auroraFrag = /* glsl */ `
  uniform float time; uniform vec3 colA; uniform vec3 colB; varying vec2 vUv;
  void main() {
    float wave = sin(vUv.x * 9.0 + time * 0.6) * 0.12 + sin(vUv.x * 23.0 - time * 0.9) * 0.05;
    float band = smoothstep(0.0, 0.5, vUv.y + wave) * (1.0 - smoothstep(0.5, 1.0, vUv.y + wave));
    vec3 col = mix(colA, colB, vUv.y + wave);
    gl_FragColor = vec4(col * 1.6, band * 0.55);
  }`
function aurora(root, z0, z1, y) {
  for (let i = 0; i < 3; i++) {
    const mat = new ShaderMaterial({
      uniforms: { time: { value: 0 }, colA: { value: new Color('#3fffb0') }, colB: { value: new Color('#b07bff') } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: auroraFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
    })
    const p = put(root, new PlaneGeometry(120, 26, 1, 1), mat, (i - 1) * 20, y + 48 + i * 6, z1 + (z0 - z1) * (0.2 + i * 0.3), false)
    p.rotation.y = 0.3 * (i - 1)
    p.userData.dynamic = true
    onFrame((dt, t) => (mat.uniforms.time.value = t + i * 3))
  }
}

// A catalog bike in a bay: its 3D model, its rarity / name / income tag,
// sparkles from Epic up and a pulsing ring from Mythical up. Stealing it wakes `guard`.
export function bayBike(root, name, x, y, z, yaw, rand, guard, { bayW = 2.0, bayD = 1.1 } = {}) {
  const c = CATALOG.get(name) ?? { rarity: 'Common', income: 4 }
  const col = RARITY[c.rarity] ?? '#ffffff'
  const rank = RANK.indexOf(c.rarity)
  const tag = bikeTag(c.rarity, name, `$${shortNumber(c.income)}/s`, 1.05)
  tag.position.set(x, y + 2.6, z)
  root.add(tag)
  bob(tag, 0.08, 1.6, rand() * 9)
  const extras = [tag]
  if (rank >= 3) sparkles(root, x, y + 0.2, z, { count: 8 + rank * 2, radius: 1.2, height: 2.4, color: col, size: 0.35, speed: 0.7, seed: Math.floor(rand() * 999) })
  if (rank >= 5) {
    const ring = put(root, new TorusGeometry(1.1, 0.06, 6, 28), neon(col, 3), x, y + 0.08, z, false)
    ring.rotation.x = Math.PI / 2
    ring.userData.dynamic = true
    onFrame((dt, t) => ring.scale.setScalar(1 + Math.sin(t * 2.5 + x) * 0.08))
    extras.push(ring)
  }
  stealBay(root, () => bikeModel(name), x, y, z, yaw, { name, guard, value: bikeValue(name), bayW, bayD, extras })
}

// A guard post: the world's vehicle asleep facing the lane, three of its bikes in bays in front, the sign.
function guardPost(root, k, theme, x0, z0, y, side, rand) {
  let v = fleetVehicle(theme.guard.kind, theme.guard.mk)
  if (v.userData.hover) {
    // The hull bobs inside a holder that does the driving.
    const holder = new Group()
    holder.userData = { ...v.userData }
    v.userData = {}
    holder.add(v)
    bob(v, 0.25, 1.2, x0)
    v = holder
  }
  const ud = v.userData
  const yaw = SOUTH - side * 0.35
  // Its collider covers the body (not a helicopter's rotor disc or tail).
  const hx = Math.min(ud.length, ud.sound === 'heli' ? 3 : 9) / 2 - 0.2
  const collider = solidBox(hx, 1.4, ud.width / 2 - 0.15, x0, y + 1.4, z0 - 1.5, yaw)
  const guard = sleepingGuard(root, v, x0, y, z0 - 1.5, yaw, { tier: k - 1, zzzAt: [x0, y + (ud.zzz ?? 3), z0 - 1.4], phase: k * 0.7, collider })
  const front = z0 + Math.max(4.2, ud.length / 2 + 1.6)
  bayPicks(theme.name, rand).forEach((name, i) => bayBike(root, name, x0 - side * (i * 2.6 - 1.2), y, front + (i % 2) * 0.6, SOUTH + (rand() - 0.5) * 0.6, rand, guard))
  place(root, postSign(shortNumber(theme.rec)), x0 + side * 4.8, y, front - 1.6, side < 0 ? 0.4 : Math.PI - 0.4)
}

// --- The zone -------------------------------------------------------------------------------------
// Builds zone k into `root`: z0 > z1 (south edge, north edge), floor at y.
export function buildThemedZone(root, k, theme, z0, z1, y, { last = false } = {}) {
  const rand = mulberry32(k * 7919)
  const len = z0 - z1
  floor(root, z0, z1, theme.floor, y, { lip: shade(theme.floor, 0.72) })
  for (let i = 0; i < 6; i++) {
    const w = 5 + rand() * 9
    const d = 4 + rand() * 7
    patch(root, (rand() - 0.5) * (hw * 2 - w), z1 + 4 + rand() * (len - 8), w, d, theme.patch, y)
  }
  if (theme.grid) gridFloor(root, z0, z1, y, theme.grid)
  if (theme.rainbowFloor) rainbowFloor(root, z0, z1, y)
  for (const s of [-1, 1]) terraceWall(root, { axis: 'z', at: s * hw, from: z1, to: z0, out: s, theme: theme.wall, height: LAYOUT.valley.cliffHeight, seed: k * 31 + s, base: y - 1 })
  if (last) terraceWall(root, { axis: 'x', at: z1, from: -hw - 12, to: hw + 12, out: -1, theme: theme.wall, height: LAYOUT.valley.cliffHeight + 6, seed: k * 37, base: y - 1 })
  zoneGate(root, k, theme, z0 - 1.6, y)

  // The guard post, on one side half way down the zone.
  const keep = [] // [x, z, r] spots decor stays out of
  const side = k % 2 ? 1 : -1
  const x0 = side * (hw - 9)
  const pz = z0 - len * 0.5 - 2
  guardPost(root, k, theme, x0, pz, y, side, rand)
  keep.push([x0, pz + 2, 11])
  keep.push([0, z0 - 1.6, 4]) // the gate's walkway

  // The set piece.
  const [heroKind, heroOpts] = theme.hero
  const hz = (z0 + z1) / 2
  const heroSide = k % 2 ? -1 : 1
  const hero = DECOR[heroKind]
  if (heroKind === 'planet') hero(root, heroSide * 60, y + 46, hz, rand, heroOpts)
  else if (heroKind === 'rainbow') hero(root, 0, y, hz, rand, heroOpts)
  else if (heroKind === 'castleGate') {
    // Mid-zone, so the chase camera never ends up inside it at a zone border.
    hero(root, 0, y, hz, rand, heroOpts)
    for (const s of [-1, 1]) solidBox(2, 7, 2, s * 7, y + 7, hz)
    keep.push([0, hz, 9])
  } else if (heroKind === 'fountain') {
    hero(root, 0, y, hz, rand, heroOpts)
    solidBox(4.2, 0.6, 4.2, 0, y + 0.6, hz)
    keep.push([0, hz, 7])
  } else if (heroKind === 'pyramid' || heroKind === 'volcano') {
    hero(root, heroSide * (hw + 4), y, hz, rand, heroOpts)
  } else {
    hero(root, heroSide * (hw - 5), y, hz, rand, heroOpts)
    keep.push([heroSide * (hw - 5), hz, 7])
  }

  // Decor recipes.
  const free = (x, z) => keep.every(([kx, kz, r]) => Math.hypot(x - kx, z - kz) > r)
  for (const [kind, count, where, opts = {}] of theme.decor) {
    const build = DECOR[kind]
    for (let i = 0; i < count; i++) {
      let x
      let z
      let yy = y
      for (let tries = 0; tries < 8; tries++) {
        z = z1 + 3 + rand() * (len - 7)
        if (where === 'edge') x = (rand() < 0.5 ? -1 : 1) * (hw - 1.8 - rand() * 4)
        else if (where === 'center') x = 0
        else if (where === 'far') x = (rand() < 0.5 ? -1 : 1) * (hw + 50 + rand() * 30)
        else x = (rand() - 0.5) * (hw * 2 - 10)
        if (where === 'sky' || where === 'far' || free(x, z)) break
      }
      if (where === 'sky') yy = y + 2 + rand() * 8
      if (where === 'far') yy = y + 30 + rand() * 20
      build(root, x, yy, z, rand, opts)
    }
  }

  // Weather, motes, extras.
  for (const w of theme.weather) weather(root, { ...w, x0: -hw, x1: hw, y0: y + 0.3, y1: y + 16, z0: z1, z1: z0, seed: k * 13 + 1 })
  motes(root, { x0: -hw + 2, x1: hw - 2, y0: y + 0.5, y1: y + 9, z0: z1, z1: z0, count: 50, colors: theme.motes, size: 0.22, bright: 1.8, seed: k * 17 })
  if (theme.aurora) aurora(root, z0, z1, y)
  if (theme.ghosts) {
    for (let i = 0; i < 5; i++) {
      const g = ghost()
      g.position.set((rand() - 0.5) * (hw * 2 - 8), y + 2 + rand() * 3, z1 + 4 + rand() * (len - 8))
      g.rotation.y = rand() * 6
      root.add(g)
      bob(g, 0.5, 0.8 + rand() * 0.5, rand() * 9, 0.3)
    }
  }
  if (last) {
    const tex = canvasTexture(1024, 256, (ctx, w, h) => {
      outlinedText(ctx, 'MORE ZONES', w / 2, 90, { size: 110, color: '#ffd23a', outline: '#3a2200', width: 14 })
      outlinedText(ctx, 'COMING SOON', w / 2, 190, { size: 80, color: '#ffffff', outline: '#3a2200', width: 12 })
    })
    put(root, new PlaneGeometry(18, 4.5), new MeshBasicMaterial({ map: tex, transparent: true }), 0, y + 10, z1 + 2.2, false)
  }
}
