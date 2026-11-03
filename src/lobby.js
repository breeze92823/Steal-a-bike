import { BoxGeometry, Group, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, TorusGeometry } from 'three'
import { LAYOUT, PALETTE } from './config.js'
import { bake, bakeStatic } from './bake.js'
import { label, neon, put, solidBox } from './propkit.js'
import { mulberry32 } from './textures.js'
import { bikeTag, bicycle, canvasTexture, exclamation, ghost, meterBox, motorbike, outlinedText, plain, pumpkin, sbox, studMat, tube, voxelTree } from './kit.js'
import { bob, onFrame, risingText, sparkles } from './fx.js'

// The plaza: lego ground, the east-west road with the junction stub north, the
// row of bike plots south of the road (yours with its treadmill and upgrade
// signs, two neighbours' two-deck garages with neon treadmills, unclaimed
// plots), and the purple terraced walls round the edge with autumn trees,
// ghosts and pumpkins. Static meshes are baked to a few draw calls per piece.
const L = LAYOUT
const P = PALETTE

// --- Shared bits -------------------------------------------------------------------------
function asphaltTexture() {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    const rand = mulberry32(77)
    ctx.fillStyle = P.road
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      const v = rand()
      ctx.fillStyle = v < 0.5 ? 'rgba(0,0,10,0.16)' : 'rgba(255,255,255,0.09)'
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2)
    }
  })
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}
let roadMat = null
export function asphalt() {
  roadMat ??= new MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.92 })
  return roadMat
}

// Flat road box with UVs in 4 m tiles: centre (x, z), size w x d, top at y = 0.04.
export function roadSlab(parent, x, z, w, d) {
  return put(parent, meterBox(w, 0.1, d, 4), asphalt(), x, -0.01, z, false)
}

// The treadmill belt: navy with white chevrons pointing north; the texture scrolls south.
function beltTexture(bg, fg) {
  const t = canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = fg
    ctx.lineWidth = 12
    ctx.lineJoin = 'miter'
    for (const y of [64, 192]) {
      ctx.beginPath()
      ctx.moveTo(18, y + 26)
      ctx.lineTo(64, y - 18)
      ctx.lineTo(110, y + 26)
      ctx.stroke()
    }
  })
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

// A treadmill whose console end is at z0 and belt runs south (+Z). `neonFrame` makes
// the glowing upgraded kind the neighbours have.
function treadmill(root, x, z0, { frame = P.treadFrame, neonFrame = null } = {}) {
  const g = new Group()
  const len = 4.6
  const zc = z0 + len / 2
  const fm = studMat(frame)
  sbox(g, 2.6, 0.3, len, null, 0, 0, 0, { mat: fm })
  for (const s of [-1, 1]) sbox(g, 0.32, 0.16, len, null, s * 1.14, 0.3, 0, { mat: fm })
  const belt = beltTexture(neonFrame ? '#7ff6ff' : P.treadBelt, neonFrame ? '#1e3a8a' : '#ffffff')
  belt.repeat.set(1, len / 2)
  const beltMat = neonFrame
    ? neon('#ffffff', 2.2, { map: belt })
    : new MeshStandardMaterial({ map: belt, emissive: '#ffffff', emissiveMap: belt, emissiveIntensity: 0.35, roughness: 0.4 })
  const beltMesh = put(g, new PlaneGeometry(1.95, len - 0.3), beltMat, 0, 0.31, 0, false)
  beltMesh.rotation.x = -Math.PI / 2
  beltMesh.receiveShadow = true
  // Console end: two uprights, a handle bar and the little display.
  const up = -len / 2 + 0.3
  for (const s of [-1, 1]) {
    const post = sbox(g, 0.22, 1.35, 0.22, null, s * 1.08, 0.3, up, { mat: fm })
    post.rotation.x = 0.12
  }
  sbox(g, 2.4, 0.18, 0.24, null, 0, 1.55, up - 0.12, { mat: fm })
  put(g, new BoxGeometry(1.2, 0.32, 0.3), plain('#1f2740'), 0, 1.75, up - 0.12)
  put(g, new BoxGeometry(0.3, 0.14, 0.04), neon('#ff3344', 2.5), -0.35, 1.78, up + 0.04, false)
  put(g, new BoxGeometry(0.3, 0.14, 0.04), neon('#36b6ff', 2.5), 0.35, 1.78, up + 0.04, false)
  if (neonFrame) {
    // Glowing edges, a light pillar at the console and a hovering ring.
    const edge = neon(neonFrame, 3.2)
    for (const s of [-1, 1]) put(g, new BoxGeometry(0.1, 0.1, len), edge, s * 1.32, 0.3, 0, false)
    put(g, new BoxGeometry(2.7, 0.1, 0.1), edge, 0, 0.3, len / 2, false)
    for (const [cx, cz] of [[-1.2, -len / 2], [1.2, -len / 2], [-1.2, len / 2], [1.2, len / 2]]) put(g, new BoxGeometry(0.35, 0.35, 0.35), edge, cx, 0.35, cz, false)
    put(g, new BoxGeometry(0.28, 2.2, 0.28), neon(neonFrame, 3.5), 0, 1.1, up - 0.35, false)
    const ring = put(g, new TorusGeometry(0.85, 0.07, 8, 32), neon(neonFrame, 3.5), 0, 2.5, up - 0.35, false)
    ring.rotation.x = Math.PI / 2 - 0.25
    ring.userData.dynamic = true
    onFrame((dt, t) => {
      ring.position.y = 2.5 + Math.sin(t * 2) * 0.12
      ring.rotation.z += dt * 1.5
    })
  }
  g.position.set(x, 0, zc)
  root.add(g)
  onFrame((dt) => {
    belt.offset.y -= dt * (neonFrame ? 1.6 : 0.9)
  })
  solidBox(1.3, 0.16, len / 2, x, 0.16, zc)
  return g
}

// Upgrade sign: a brick block with a slanted panel on top. `face` = yaw the panel faces.
function upgradeSign(root, x, z, face, lines) {
  const g = new Group()
  sbox(g, 2.6, 1.15, 1.1, P.brick, 0, 0, 0)
  sbox(g, 1.0, 0.75, 1.0, P.brick, 1.75, 0, 0.1) // the lower block beside it (L shape)
  const tex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8f5242'
    ctx.fillRect(0, 0, w, h)
    outlinedText(ctx, lines[0], w / 2, 46, { size: 54, width: 9 })
    outlinedText(ctx, lines[1], w / 2, 108, { size: 50, width: 9, color: '#7dff5a' })
    // Price pills: cash (green) and gems (pink).
    const pills = lines.slice(2)
    const pw = pills.length > 1 ? 210 : 300
    pills.forEach((text, i) => {
      const px = pills.length > 1 ? 30 + i * 240 : (w - pw) / 2
      ctx.fillStyle = i === 0 ? '#2fd14a' : '#d93cff'
      ctx.fillRect(px, 150, pw, 76)
      ctx.strokeStyle = '#123'
      ctx.lineWidth = 6
      ctx.strokeRect(px, 150, pw, 76)
      outlinedText(ctx, text, px + pw / 2, 190, { size: 52, width: 9 })
    })
  })
  const panel = put(g, new PlaneGeometry(2.5, 1.25), new MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 1.35, 0.15, false)
  panel.rotation.x = -0.9
  g.position.set(x, 0, z)
  g.rotation.y = face
  root.add(g)
  solidBox(1.3, 0.6, 0.6, x, 0.6, z, face)
  const mark = exclamation(1)
  mark.position.set(x, 2.3, z)
  root.add(mark)
  bob(mark, 0.15, 2.4, x)
  return g
}

// A blocky rider sitting on a bike (the neighbours on their treadmills).
function rider(skin = '#f2f2f2', shirt = '#ffffff', hair = '#f7f7ff') {
  const g = new Group()
  sbox(g, 0.5, 0.6, 0.32, shirt, 0, 1.15, 0, { studs: false })
  sbox(g, 0.42, 0.42, 0.42, skin, 0, 1.78, 0, { studs: false })
  sbox(g, 0.5, 0.22, 0.5, hair, -0.04, 2.1, 0, { studs: false })
  for (const s of [-1, 1]) {
    const arm = sbox(g, 0.18, 0.55, 0.18, shirt, 0.2, 1.25, s * 0.34, { studs: false })
    arm.rotation.z = -1.1
    const leg = sbox(g, 0.2, 0.6, 0.2, '#2a2a3a', 0.15, 0.6, s * 0.16, { studs: false })
    leg.rotation.z = -0.9
  }
  return g
}

// --- Plots -------------------------------------------------------------------------------------
function plotGeometry(root, cx) {
  const x0 = cx - plotWidth() / 2
  const depth = L.plotRows * L.plotRowDepth
  const z0 = L.plotZ
  sbox(root, plotWidth() + 0.6, 0.16, depth + 0.6, null, cx, 0, z0 + depth / 2, { mat: plain(P.padEdge) })
  sbox(root, plotWidth(), 0.22, depth, null, cx, 0, z0 + depth / 2, { mat: plain(P.padLine) })
  let x = x0
  L.plotColumns.forEach((w, c) => {
    const isPath = c === 2
    for (let r = 0; r < L.plotRows; r++) {
      sbox(root, w - 0.14, 0.24, L.plotRowDepth - 0.14, isPath ? P.path : P.pad, x + w / 2, 0, z0 + r * L.plotRowDepth + L.plotRowDepth / 2)
    }
    x += w
  })
  solidBox(plotWidth() / 2, 0.12, depth / 2, cx, 0.12, z0 + depth / 2)
}
const plotWidth = () => L.plotColumns.reduce((a, b) => a + b, 0)
// x of a column centre in a plot centred on cx.
function columnX(cx, c) {
  let x = cx - plotWidth() / 2
  for (let i = 0; i < c; i++) x += L.plotColumns[i]
  return x + L.plotColumns[c] / 2
}
const rowZ = (r) => L.plotZ + r * L.plotRowDepth + L.plotRowDepth / 2

const GARAGE_BIKES = [
  ['Limited', 'Hellfire Dragster', '$5M/s', '#ff6a1a', '#222'],
  ['Mythical', 'MX09', '$260K/s', '#f2f2f2', '#c21d2d'],
  ['Insane', 'Super Dook', '$130K/s', '#ffb21a', '#1b1b22'],
  ['Insane', 'M1100RR', '$700K/s', '#2b5cff', '#f2f2f2'],
  ['Fuse', 'Quantum Reactor', '$65M/s', '#1ad6ff', '#141a33'],
  ['Limited', 'Venom Widow', '$100M/s', '#9b39ff', '#1aff6a'],
  ['Legendary', 'Club Racer', '$6K/s', '#e43b3b', '#222'],
  ['Epic', 'Grum', '$3.4K/s', '#ffd21a', '#333'],
  ['Legendary', 'Fat Boi', '$32.5K/s', '#ff8a1a', '#2a2a2a'],
  ['Insane', 'Hayabusa', '$140K/s', '#f5f5f5', '#2b5cff'],
  ['Epic', 'Canopy Scout', '$735/s', '#3cd23c', '#1b1b22'],
  ['Legendary', 'Glacier Runner', '$12.8K/s', '#9fe8ff', '#20324a'],
  ['Epic', 'Prism Coupe', '$161K/s', '#c44bff', '#ffffff'],
  ['Insane', 'Nebula Striker', '$129.5K/s', '#ffcf2a', '#1e2240'],
  ['Rare', 'YZ260F', '$567/s', '#2a6dff', '#f2f2f2'],
  ['Legendary', 'Gold Wing', '$95K/s', '#ffd700', '#5a3a10'],
  ['Epic', 'Spectrum Rally', '$24K/s', '#ff3c8a', '#2ad0ff'],
  ['Mythical', 'Furnace Titan', '$40.3K/s', '#ff3b1a', '#1a1a1a'],
]

// A neighbour's two-deck garage over their plot, every level full of bikes.
function garage(root, sprites, cx, seed) {
  const rand = mulberry32(seed)
  const g = new Group()
  const w = plotWidth()
  const depth = L.plotRows * L.plotRowDepth
  const zc = L.plotZ + depth / 2
  const steel = plain(P.steel, { roughness: 0.5, metalness: 0.3 })
  const levels = [4.4, 8.8]
  for (const px of [-w / 2 + 0.3, 0, w / 2 - 0.3]) {
    for (const pz of [-depth / 2 + 0.3, 0, depth / 2 - 0.3]) {
      put(g, new BoxGeometry(0.45, levels[1], 0.45), steel, cx + px, levels[1] / 2, zc + pz)
      solidBox(0.23, levels[1] / 2, 0.23, cx + px, levels[1] / 2, zc + pz)
    }
  }
  const yellow = neon('#ffe11a', 2.4)
  for (const y of levels) {
    put(g, new BoxGeometry(w + 0.4, 0.35, depth + 0.4), steel, cx, y - 0.18, zc)
    // Deck floor: pads either side of a light path, like the plot below.
    sbox(g, w, 0.06, depth, P.pad, cx, y, zc, { shadows: false })
    sbox(g, L.plotColumns[2], 0.07, depth, P.path, columnX(cx, 2), y, zc, { shadows: false })
    solidBox(w / 2, 0.2, depth / 2, cx, y - 0.1, zc)
    // Railing: beams along the edges, neon yellow along the top.
    for (const s of [-1, 1]) {
      put(g, new BoxGeometry(w, 0.12, 0.12), steel, cx, y + 0.9, zc + s * depth / 2)
      put(g, new BoxGeometry(0.12, 0.12, depth), steel, cx + s * w / 2, y + 0.9, zc)
    }
    put(g, new BoxGeometry(w + 0.2, 0.1, 0.1), yellow, cx, y + 1.0, zc - depth / 2 - 0.05, false)
    put(g, new BoxGeometry(0.1, 0.1, depth), yellow, cx - w / 2 - 0.05, y + 1.0, zc, false)
    put(g, new BoxGeometry(0.1, 0.1, depth), yellow, cx + w / 2 + 0.05, y + 1.0, zc, false)
  }
  // Ramp up the west side.
  const ramp = put(g, new BoxGeometry(1.6, 0.25, 10), steel, cx - w / 2 + 1.2, 2.2, zc + 2)
  ramp.rotation.x = Math.atan2(4.4, 10)
  // Bikes: two rows on the ground and on each deck, skipping the path column.
  let k = Math.floor(rand() * GARAGE_BIKES.length)
  for (const y of [0.24, ...levels.map((v) => v + 0.06)]) {
    for (const c of [0, 1, 3]) {
      for (const r of [0, 2]) {
        const spec = GARAGE_BIKES[k++ % GARAGE_BIKES.length]
        const bike = motorbike(spec[3], spec[4])
        const bx = columnX(cx, c)
        const bz = rowZ(r) + (rand() - 0.5) * 1.2
        bike.position.set(bx, y, bz)
        bike.rotation.y = Math.PI / 2 + (rand() - 0.5) * 0.5 // nose north
        g.add(bike)
        const tag = bikeTag(spec[0], spec[1], spec[2], 0.95)
        tag.position.set(bx, y + 2.1, bz)
        sprites.add(tag)
      }
    }
  }
  root.add(bake(g, true))
}

// Neon treadmill in front of a neighbour's plot, with their bike, rider and name.
function neighbourTreadmill(root, sprites, cx, name, income, frame, glow, bikeColor, accent) {
  const x = columnX(cx, 2)
  treadmill(root, x, L.treadmillZ, { frame, neonFrame: glow })
  const bike = motorbike(bikeColor, accent, '#7ff6ff')
  bike.position.set(x, 0.32, L.treadmillZ + 2.4)
  bike.rotation.y = Math.PI / 2
  root.add(bike)
  const r = rider()
  r.position.set(x, 0.32, L.treadmillZ + 2.4)
  r.rotation.y = Math.PI / 2
  root.add(r)
  sparkles(root, x, 0.4, L.treadmillZ + 2.3, { count: 26, radius: 1.3, height: 2.8, color: glow, size: 0.32, speed: 0.9, seed: cx | 0 })
  const tag = label(name, 0.6, { color: '#e8e8f0', outline: '#30304a', outlineWidth: 8 })
  tag.position.set(x, 3.3, L.treadmillZ + 2.4)
  sprites.add(tag)
  const inc = label(income, 1.2, { color: '#ffffff', outline: '#1b2f6a' })
  inc.position.set(x + 1.6, 2.6, L.treadmillZ + 0.6)
  sprites.add(inc)
  bob(inc, 0.08, 2, cx)
}

// --- Walls --------------------------------------------------------------------------------------
export const PURPLE_WALL = { main: P.wall, alt: P.wallAlt, panel: P.wallPanel, top: P.wallTop, ledge: P.ledge, leaves: P.leavesOrange, windows: true }
export const BROWN_CLIFF = { main: P.cliff, alt: '#b0623f', panel: '#96503a', top: P.cliffTop, band: '#d9d23a', ledge: null, leaves: P.leavesGreen, windows: false }

// A terraced wall along one edge. The face is the line `at` (x for axis 'z',
// z for axis 'x'), running from `from` to `to`; `out` (+1/-1) is the outward
// direction. Two tiers with stepped tops (a `band` colour shows a layer under
// the top on some segments), protruding panels, ledges, little windows along
// the bottom and trees on top; `base` lifts the whole wall. Returns the baked group.
export function terraceWall(root, { axis, at, from, to, out, height = L.wallHeight, theme = PURPLE_WALL, seed = 1, trees = true, collide = true, base = 0 }) {
  const rand = mulberry32(seed)
  const g = new Group()
  const len = to - from
  const mid = (from + to) / 2
  const mainMat = studMat(theme.main, { alt: theme.alt, checker: 3 })
  // place(a, y, d, w, h, depth, mat): a = along the wall, d = outward distance of the box centre.
  const place = (a, y, d, w, h, dep, hex, mat) => {
    const wx = axis === 'x' ? w : dep
    const wz = axis === 'x' ? dep : w
    const x = axis === 'x' ? a : at + out * d
    const z = axis === 'x' ? at + out * d : a
    return sbox(g, wx, h, wz, hex, x, y + base, z, { mat })
  }
  const tiers = [
    { d: 3, h: height, dep: 6 },
    { d: 9, h: height + 7, dep: 6 },
  ]
  for (const t of tiers) {
    place(mid, 0, t.d, len, t.h, t.dep, null, mainMat)
    // Stepped cap along the top.
    let a = from
    while (a < to) {
      const w = Math.min(to - a, 5 + rand() * 9)
      const h = 0.8 + rand() * 2.4
      place(a + w / 2, t.h, t.d - t.dep / 2 + 1.2 + rand() * 2, w, h, 2.4 + rand() * 1.6, theme.top)
      place(a + w / 2, t.h - 0.4, t.d + 0.6, w, 0.8, t.dep - 1, theme.top)
      // Some segments show a yellow layer under the green (cliffs only).
      if (theme.band && rand() < 0.45) place(a + w / 2, t.h - 1.6 - rand() * 1.4, t.d - t.dep / 2 + 0.2, w, 1.6, 1.2, theme.band)
      a += w
    }
  }
  // Panels proud of the lower tier's face, ledges and windows.
  let a = from + 2
  while (a < to - 4) {
    const w = 4 + rand() * 6
    const h = 3 + rand() * 6
    const y = 1.5 + rand() * (height - h - 3)
    place(a + w / 2, y, -0.3 - rand() * 0.4, w, h, 1.2, theme.panel)
    if (theme.ledge && rand() < 0.8) place(a + rand() * w, y + h + 0.3 + rand() * 2, -0.4, 2.5 + rand() * 3, 0.32, 1.2, theme.ledge)
    if (theme.windows && rand() < 0.6) place(a + w / 2, 1.8, -0.1, 1.6, 0.7, 0.4, null, plain(P.window, { roughness: 0.3 }))
    a += w + 1 + rand() * 4
  }
  root.add(bake(g, true))
  if (trees) {
    const back = tiers[1]
    for (let t = from + 6 + rand() * 4; t < to - 4; t += 9 + rand() * 7) {
      const tree = voxelTree(theme.leaves, 1 + rand() * 0.35, Math.floor(rand() * 1000))
      const x = axis === 'x' ? t : at + out * (back.d + (rand() - 0.5) * 2)
      const z = axis === 'x' ? at + out * (back.d + (rand() - 0.5) * 2) : t
      tree.position.set(x, back.h + 0.8 + base, z)
      tree.rotation.y = rand() * Math.PI
      root.add(bake(tree, true))
    }
  }
  if (collide) {
    const hx = axis === 'x' ? len / 2 : 3
    const hz = axis === 'x' ? 3 : len / 2
    solidBox(hx, height / 2 + 4, hz, axis === 'x' ? mid : at + out * 3, base + height / 2 + 4, axis === 'x' ? at + out * 3 : mid)
  }
  return g
}

// The big yellow bicycle drawn on the south wall (faces north).
function wallBikeLogo(root, x, y, z) {
  const g = new Group()
  const yellow = neon('#ffd21a', 1.6)
  const white = plain('#e9edf6', { roughness: 0.4 })
  const r = 3.2
  for (const wx of [-5, 5]) {
    const wheel = put(g, new TorusGeometry(r, 0.32, 8, 40, Math.PI * 1.15), white, wx, 0, 0)
    wheel.rotation.z = -0.08 * Math.PI
  }
  const t = 0.34
  tube(g, [-5, 0, 0], [-1, 0, 0], t, yellow)
  tube(g, [-5, 0, 0], [-1.6, 5, 0], t, yellow)
  tube(g, [-1, 0, 0], [-1.9, 5.6, 0], t, yellow)
  tube(g, [-1.7, 4.8, 0], [3.6, 4.6, 0], t, yellow)
  tube(g, [-1, 0, 0], [3.6, 4.6, 0], t, yellow)
  tube(g, [5, 0, 0], [3.4, 6.2, 0], t, yellow)
  tube(g, [3.4, 6.2, 0], [4.6, 6.6, 0], t, yellow)
  tube(g, [-2.8, 5.7, 0], [-0.9, 5.7, 0], t * 1.3, yellow)
  g.position.set(x, y, z)
  g.scale.setScalar(1.35)
  g.rotation.y = Math.PI // drawn facing north
  root.add(g)
}

// --- Build ---------------------------------------------------------------------------------------
export function buildLobby(scene) {
  const root = new Group()
  const flat = new Group() // ground-level statics, baked without shadows cast
  const sprites = new Group()
  scene.add(root, sprites)

  // Ground: one studded slab for the whole plaza.
  const w = L.maxX - L.minX + 12
  const d = L.southZ - L.northZ + 12
  const cz = (L.southZ + L.northZ) / 2
  const ground = put(root, meterBox(w, 1, d), studMat(P.ground), 0, -0.5, cz, false)
  ground.receiveShadow = true
  solidBox(w / 2, 0.5, d / 2, 0, -0.5, cz)

  // Road east-west, curbs and the dashed centre line.
  const rw = L.road.halfWidth
  roadSlab(flat, 0, L.road.z, w, rw * 2)
  const curb = plain(P.curb, { roughness: 0.6 })
  for (const s of [-1, 1]) {
    put(flat, new BoxGeometry(w, 0.06, L.road.curb), curb, 0, 0.03, L.road.z + s * (rw + L.road.curb / 2), false)
  }
  const line = plain(P.roadLine, { roughness: 0.5 })
  for (let x = L.minX + 2; x < L.maxX - 2; x += 6) put(flat, new BoxGeometry(2.6, 0.02, 0.22), line, x, 0.05, L.road.z, false)

  // Plots.
  L.plotCenters.forEach((cx, i) => {
    plotGeometry(flat, cx)
    if (!L.plotOwners[i]) {
      const tag = label('Unclaimed', 1.0, { color: '#ffffff', outline: '#2a2244' })
      tag.position.set(cx, 2.4, L.plotZ + 6)
      sprites.add(tag)
    }
  })
  const flatBaked = bake(flat, false)
  flatBaked.traverse((o) => (o.receiveShadow = true))
  root.add(flatBaked)

  // Your plot: treadmill, upgrade signs, your first bike.
  const me = L.plotCenters[L.plotOwners.indexOf('me')]
  const tx = columnX(me, 2)
  treadmill(root, tx, L.treadmillZ)
  const tm = label('+2/s', 1.05, { color: '#ffffff', outline: '#1b2f6a' })
  tm.position.set(tx + 0.4, 2.7, L.treadmillZ + 0.4)
  sprites.add(tm)
  bob(tm, 0.08, 2)
  upgradeSign(root, tx + 3.1, L.treadmillZ + 2.0, -Math.PI / 2 + 0.3, ['Upgrade Treadmill', 'Lv 1 > 2', '$600', '◎ 11'])
  upgradeSign(root, columnX(me, 3) - 0.6, L.plotZ - 1.3, Math.PI - 0.2, ['Upgrade Plot', '6 > 8 Bikes', '$1K'])
  const bx = columnX(me, 3)
  const bz = rowZ(0) + 0.5
  const club = bicycle()
  club.position.set(bx, 0.24, bz)
  club.rotation.y = Math.PI * 0.75
  root.add(club)
  const clubTag = bikeTag('Common', 'Club Tourer', '$8/s', 1.25)
  clubTag.position.set(bx, 2.9, bz)
  sprites.add(clubTag)
  risingText(sprites, bx, 1.6, bz, '💵 +$8', { every: 1, rise: 1.0, height: 0.7, opts: { color: '#5dff4a', outline: '#0d3a10', outlineWidth: 10 } })

  // Neighbours: garages full of bikes, neon treadmills out front.
  const [navName, jepName] = L.plotOwners.filter((o) => o && o !== 'me')
  const nav = L.plotCenters[L.plotOwners.indexOf(navName)]
  const jep = L.plotCenters[L.plotOwners.indexOf(jepName)]
  garage(root, sprites, nav, 11)
  garage(root, sprites, jep, 29)
  neighbourTreadmill(root, sprites, nav, navName, '+6K/s', '#8a3cff', '#5ff4ff', '#f2f2f2', '#2ad0ff')
  neighbourTreadmill(root, sprites, jep, jepName, '+2.1K/s', '#2a7cff', '#3fe6ff', '#1a1a22', '#e0262b')

  // Walls: south, west, east all the way; north either side of the valley
  // (brown cliff next to it, purple beyond).
  terraceWall(root, { axis: 'x', at: L.southZ, from: L.minX - 10, to: L.maxX + 10, out: 1, seed: 3 })
  terraceWall(root, { axis: 'z', at: L.minX, from: L.northZ - 10, to: L.southZ + 10, out: -1, seed: 5 })
  terraceWall(root, { axis: 'z', at: L.maxX, from: L.northZ - 10, to: L.southZ + 10, out: 1, seed: 7 })
  const vw = L.valley.halfWidth
  for (const s of [-1, 1]) {
    const lo = s < 0 ? L.minX - 10 : vw + 10
    const hi = s < 0 ? -vw - 10 : L.maxX + 10
    terraceWall(root, { axis: 'x', at: L.northZ, from: lo, to: hi, out: -1, seed: s < 0 ? 9 : 13 })
    terraceWall(root, { axis: 'x', at: L.northZ, from: s < 0 ? -vw - 10 : vw, to: s < 0 ? -vw : vw + 10, out: -1, theme: BROWN_CLIFF, height: L.valley.cliffHeight, seed: s < 0 ? 17 : 19 })
  }
  wallBikeLogo(root, -6, 10.5, L.southZ - 0.6)

  // Halloween dressing: ghosts drifting by the walls and jack-o'-lanterns on the ground.
  const sz = L.southZ
  const ghosts = [[-62, sz - 5], [-36, sz - 6], [-10, sz - 4.5], [14, sz - 5.5], [40, sz - 5], [62, sz - 6], [-75, 20], [75, 30]]
  ghosts.forEach(([x, z], i) => {
    const gh = ghost()
    gh.position.set(x, 1.6 + (i % 3) * 0.8, z)
    gh.rotation.y = x < -70 ? Math.PI / 2 : x > 70 ? -Math.PI / 2 : Math.PI
    root.add(gh)
    bob(gh, 0.35, 1.3, i)
  })
  for (const [x, z, face] of [[-56, sz - 4, true], [-26, sz - 3, true], [27, sz - 3.5, false], [52, sz - 3, true], [-77, sz - 6, true], [77, 12, false], [-77, 6, false]]) {
    const p = pumpkin(1.3, face)
    p.position.set(x, 0, z)
    p.rotation.y = x < -70 ? Math.PI / 2 : x > 70 ? -Math.PI / 2 : Math.PI
    root.add(p)
  }
  bakeStatic(root)
  return { plotX: me, roots: [root, sprites] }
}
