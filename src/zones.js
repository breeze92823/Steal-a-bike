import { AdditiveBlending, BoxGeometry, Color, DoubleSide, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, TorusGeometry } from 'three'
import { GUARD_TIERS, LAYOUT, ZONE_GEN } from './config.js'
import { mulberry32 } from './textures.js'
import { neon, put, solidBox } from './propkit.js'
import { bicycle, bikeTag, canvasTexture, ghost, motorbike, outlinedText, plain, RARITY, sbox, shade } from './kit.js'
import { terraceWall } from './lobby.js'
import { bob, motes, onFrame, sparkles, weather, zzz } from './fx.js'
import { addSnore } from './audio.js'
import { scooter } from './vehicles.js'
import { guardVehicle } from './police.js'
import { DECOR } from './decor.js'
import { floor, parked, patch, place, postSign, SOUTH } from './lanekit.js'

// One generated zone of the north lane (zones 5..44) from its ZONE_THEMES
// entry: the floor (a step up from the last zone), themed cliffs, an entrance
// gate with the zone's name in neon, the theme's set piece and decor, weather
// and motes, and the guard posts: police vehicles that get stronger every
// five zones (GUARD_TIERS, five marks each), parked rarer bikes with their
// name tags and glowing auras, and a "Recommended" sign. lane.js decides
// when each zone is built and shown.
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
// What zone k's sign recommends (zone 4 says 20K; it grows from there).
export const recommended = (k) => 20000 * ZONE_GEN.growth ** (k - 4)
export const guardTier = (k) => Math.min(GUARD_TIERS.length - 1, Math.floor((k - 5) / 5))
export const guardMark = (k) => (k - 5) % 5

const BIKE_A = ['Turbo', 'Nitro', 'Shadow', 'Blaze', 'Frost', 'Thunder', 'Phantom', 'Viper', 'Comet', 'Nova', 'Titan', 'Zenith', 'Inferno', 'Aurora', 'Spectre', 'Cyclone', 'Neon', 'Royal', 'Galaxy', 'Storm']
const BIKE_B = ['Cruiser', 'Racer', 'Rider', 'Bolt', 'Hawk', 'Fang', 'GT', 'X', 'Wing', 'Drift', 'Fury', 'Glide', 'Dash', 'Rush', 'Edge', 'Flare']

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

// A bike for zone k's bays, in its rarity's colours, with tag and aura.
function bayBike(root, k, x, y, z, yaw, rand) {
  const rarity = ZONE_GEN.rarities[Math.min(ZONE_GEN.rarities.length - 1, Math.floor((k - 5) / 5))]
  const col = RARITY[rarity] ?? '#ffffff'
  const kind = rand()
  let bike
  if (k < 10 && kind < 0.35) bike = scooter(col)
  else if (k < 10 && kind < 0.55) bike = bicycle(col, '#1c1c22', { basket: false, saddle: '#24242c' })
  else bike = motorbike(col, kind < 0.5 ? '#1a1c24' : '#f4f6fb', k >= 25 ? '#7df9ff' : '#cfd6e0')
  parked(root, bike, x, y, z, yaw, 2.0, 1.1)
  const name = `${BIKE_A[Math.floor(rand() * BIKE_A.length)]} ${BIKE_B[Math.floor(rand() * BIKE_B.length)]}`
  const tag = bikeTag(rarity, name, `$${shortNumber(recommended(k) / 30 * (0.6 + rand() * 0.8))}/s`, 1.05)
  tag.position.set(x, y + 2.6, z)
  root.add(tag)
  bob(tag, 0.08, 1.6, rand() * 9)
  if (k >= 10) sparkles(root, x, y + 0.2, z, { count: 10 + Math.min(14, k - 10), radius: 1.2, height: 2.4, color: col, size: 0.35, speed: 0.7, seed: Math.floor(rand() * 999) })
  if (k >= 20) {
    const ring = put(root, new TorusGeometry(1.1, 0.06, 6, 28), neon(col, 3), x, y + 0.08, z, false)
    ring.rotation.x = Math.PI / 2
    ring.userData.dynamic = true
    onFrame((dt, t) => ring.scale.setScalar(1 + Math.sin(t * 2.5 + x) * 0.08))
  }
}

// A guard post: the vehicle asleep facing the lane, three bikes in bays in front, the sign.
function guardPost(root, k, x0, z0, y, side, rand) {
  const tier = GUARD_TIERS[guardTier(k)]
  const v = guardVehicle(tier.kind, guardMark(k))
  place(root, v, x0, y, z0 - 1.5, SOUTH - side * 0.35)
  if (v.userData.hover) bob(v, 0.25, 1.2, x0)
  zzz(root, x0, y + (v.userData.zzz ?? 3), z0 - 1.4, k * 0.7)
  addSnore(x0, y + 1, z0)
  const big = guardTier(k) >= 4
  solidBox(big ? 2.6 : 1.4, 1.5, big ? 1.8 : 1.0, x0, y + 1.5, z0 - 1.5, SOUTH - side * 0.35)
  for (let i = 0; i < 3; i++) bayBike(root, k, x0 - side * (i * 2.6 - 1.2), y, z0 + 4.2 + (i % 2) * 0.6, SOUTH + (rand() - 0.5) * 0.6, rand)
  place(root, postSign(shortNumber(recommended(k))), x0 + side * 4.2, y, z0 + 2.6, side < 0 ? 0.4 : Math.PI - 0.4)
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

  // Guard posts: alternate sides, spread down the zone.
  const n = ZONE_GEN.posts.find(([, upTo]) => k <= upTo)[0]
  const keep = [] // [x, z, r] spots decor stays out of
  for (let i = 0; i < n; i++) {
    const side = (k + i) % 2 ? 1 : -1
    const x0 = side * (hw - 9)
    const z = z0 - len * ((i + 1) / (n + 1)) - 2
    guardPost(root, k, x0, z, y, side, rand)
    keep.push([x0, z + 1, 9])
  }
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
