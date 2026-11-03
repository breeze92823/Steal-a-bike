import { BoxGeometry, Group, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, TorusGeometry } from 'three'
import { LAYOUT, PALETTE } from './config.js'
import { bake, bakeStatic } from './bake.js'
import { label, neon, put, solidBox } from './propkit.js'
import { mulberry32 } from './textures.js'
import { canvasTexture, exclamation, ghost, liveLabel, meterBox, outlinedText, plain, pumpkin, sbox, studMat, tube, voxelTree } from './kit.js'
import { bob, onFrame } from './fx.js'

// The plaza: lego ground, the east-west road with the junction stub north, the
// row of bike plots south of the road (every one a player's base: treadmill, upgrade signs;
// plots.js stands each owner's floors and bikes on it),
// and the purple terraced walls round the edge with autumn trees,
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
// the glowing upgraded kind the neighbours have. `g.userData.beltSpeed` (repeats/s)
// can be changed later (training speeds yours up).
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
  g.userData.beltSpeed = neonFrame ? 1.6 : 0.9
  g.userData.belt = beltMesh // its material (baked meshes keep sharing it) brightens while you train
  onFrame((dt) => {
    belt.offset.y -= dt * g.userData.beltSpeed
  })
  solidBox(1.3, 0.16, len / 2, x, 0.16, zc)
  return g
}

// Upgrade sign: a brick block with a slanted panel on top. `face` = yaw the panel faces.
// Returns `setLines(lines)` to repaint the panel (prices after an upgrade) and its bobbing "!".
function upgradeSign(root, x, z, face, lines) {
  const g = new Group()
  sbox(g, 2.6, 1.15, 1.1, P.brick, 0, 0, 0)
  sbox(g, 1.0, 0.75, 1.0, P.brick, 1.75, 0, 0.1) // the lower block beside it (L shape)
  const paint = (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
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
  }
  const tex = canvasTexture(512, 256, paint)
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
  const setLines = (next) => {
    lines = next
    paint(tex.image.getContext('2d'), tex.image.width, tex.image.height)
    tex.needsUpdate = true
  }
  return { group: g, setLines, mark }
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
export const plotWidth = () => L.plotColumns.reduce((a, b) => a + b, 0)
// x of a column centre in a plot centred on cx.
export function columnX(cx, c) {
  let x = cx - plotWidth() / 2
  for (let i = 0; i < c; i++) x += L.plotColumns[i]
  return x + L.plotColumns[c] / 2
}
export const rowZ = (r) => L.plotZ + r * L.plotRowDepth + L.plotRowDepth / 2

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

  // Plots: every one is a player's base (plots.js stands the owner's floors and bikes on it), each
  // with its treadmill, the treadmill's rate, the Upgrade Treadmill sign and the Upgrade Base sign.
  const plots = L.plotCenters.map((cx, i) => {
    plotGeometry(flat, cx)
    const tx = columnX(cx, 2)
    const mill = treadmill(root, tx, L.treadmillZ)
    const rate = liveLabel('+1/s', 1.05, { color: '#ffffff', outline: '#1b2f6a' })
    rate.sprite.position.set(tx - 1.9, 2.4, L.treadmillZ + 0.6)
    sprites.add(rate.sprite)
    bob(rate.sprite, 0.08, 2, i)
    const signX = tx + 3.1
    const signZ = L.treadmillZ + 2.0
    const sign = upgradeSign(root, signX, signZ, -Math.PI / 2 + 0.3, ['Upgrade Treadmill', 'Lv 1 > 2', '$600', '◎ 11'])
    const bx = columnX(cx, 0) + 0.6
    const bz = L.plotZ - 1.3
    const base = upgradeSign(root, bx, bz, Math.PI + 0.2, ['Upgrade Base', 'Floor 1 > 2', '$50K'])
    return {
      cx,
      // For training.js (whoever owns it): belt centre x, console end z0, length, the group (belt
      // speed), the floating rate label and the upgrade sign.
      treadmill: { x: tx, z0: L.treadmillZ, len: 4.6, group: mill, rate, sign: { x: signX, z: signZ, setLines: sign.setLines, mark: sign.mark }, sprites },
      baseSign: { x: bx, z: bz, setLines: base.setLines, mark: base.mark },
    }
  })
  const flatBaked = bake(flat, false)
  flatBaked.traverse((o) => (o.receiveShadow = true))
  root.add(flatBaked)

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
  return { roots: [root, sprites], plots }
}
