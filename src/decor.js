import { AdditiveBlending, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PlaneGeometry, RepeatWrapping, SphereGeometry, TorusGeometry } from 'three'
import { PALETTE } from './config.js'
import { bake } from './bake.js'
import { neon, put } from './propkit.js'
import { mulberry32, paintFacade, paintWaterfall, toTexture } from './textures.js'
import { canvasTexture, outlinedText, plain, pumpkin, sbox, studMat, voxelTree } from './kit.js'
import { bob, onFrame, sparkles, weather } from './fx.js'
import { cactus, snowyPine } from './lanekit.js'

// The prop library the themed zones (zones.js) are dressed from. Every
// builder is (root, x, y, z, rand, opts) and adds its pieces to `root` at
// that spot; colours come from the zone theme (opts). Static pieces get
// merged by bakeStatic later; anything that moves flags itself dynamic.
// DECOR maps the names used in ZONE_THEMES to builders.

const add = (root, g, x, y, z, rotY = 0, s = 1) => {
  g.position.set(x, y, z)
  g.rotation.y = rotY
  g.scale.setScalar(s)
  root.add(g)
  return g
}
const glowMat = (hex, k = 3) => neon(hex, k)

// --- Plants -------------------------------------------------------------------------------------
function tree(root, x, y, z, r, o) {
  const t = voxelTree(o.leaves ?? PALETTE.leavesGreen, (o.scale ?? 1) * (0.8 + r() * 0.5), Math.floor(r() * 9999))
  add(root, bake(t, true), x, y, z, r() * Math.PI)
}
function palm(root, x, y, z, r, o) {
  const g = new Group()
  const bark = studMat('#8a5a32')
  const lean = (r() - 0.5) * 0.5
  for (let i = 0; i < 7; i++) sbox(g, 0.55 - i * 0.03, 0.9, 0.55 - i * 0.03, null, Math.sin(i * 0.25) * 0.6 * Math.sign(lean || 1), i * 0.85, 0, { mat: bark, tile: 1 })
  const top = 6.2
  const leaf = studMat(o.leaf ?? '#3fb83a')
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const f = sbox(g, 3.4, 0.22, 0.9, null, Math.cos(a) * 1.5 + 0.6, top - 0.4, Math.sin(a) * 1.5, { mat: leaf, tile: 1 })
    f.rotation.set(0, -a, -0.35)
  }
  for (let i = 0; i < 3; i++) sbox(g, 0.4, 0.4, 0.4, '#7a4a20', 0.6 + (i - 1) * 0.35, top - 0.9, (i % 2) * 0.3, { tile: 1 })
  g.rotation.z = lean * 0.3
  add(root, bake(g, true), x, y, z, r() * Math.PI, (o.scale ?? 1) * (0.85 + r() * 0.4))
}
function pine(root, x, y, z, r, o) {
  if (o.snow) return add(root, bake(snowyPine(1 + r() * 0.5, Math.floor(r() * 999)), true), x, y, z)
  const g = new Group()
  sbox(g, 0.6, 2, 0.6, PALETTE.trunk, 0, 0, 0, { tile: 1 })
  const m = studMat(o.leaf ?? '#2f8a3a')
  let yy = 1.5
  for (const w of [3.6, 2.8, 2.0, 1.2]) {
    sbox(g, w, 1.1, w, null, 0, yy, 0, { mat: m, tile: 1 })
    yy += 1.1
  }
  add(root, bake(g, true), x, y, z, r() * Math.PI, (o.scale ?? 1) * (0.9 + r() * 0.5))
}
function bamboo(root, x, y, z, r, o) {
  const g = new Group()
  const stem = plain(o.color ?? '#7fcf4a', { roughness: 0.5 })
  const node = plain('#4f9a2a')
  for (let i = 0; i < 5; i++) {
    const h = 6 + r() * 5
    const px = (r() - 0.5) * 1.6
    const pz = (r() - 0.5) * 1.6
    put(g, new CylinderGeometry(0.16, 0.18, h, 8), stem, px, h / 2, pz)
    for (let k = 1; k < h; k += 1.1) put(g, new CylinderGeometry(0.2, 0.2, 0.08, 8), node, px, k, pz, false)
    const lf = put(g, new BoxGeometry(1.2, 0.04, 0.3), plain('#5fbf3a'), px + 0.5, h - 0.5, pz, false)
    lf.rotation.y = r() * 3
  }
  add(root, bake(g, true), x, y, z)
}
function mushroom(root, x, y, z, r, o) {
  const g = new Group()
  const h = (o.height ?? 3) * (0.7 + r() * 0.6)
  const w = h * 0.9
  sbox(g, w * 0.3, h, w * 0.3, o.stem ?? '#f2ead6', 0, 0, 0, { tile: 1 })
  const capMat = o.glow ? new MeshStandardMaterial({ color: o.cap, emissive: o.cap, emissiveIntensity: 0.7, roughness: 0.5 }) : studMat(o.cap ?? '#e0262b')
  sbox(g, w, h * 0.32, w, null, 0, h, 0, { mat: capMat, tile: 1 })
  sbox(g, w * 0.7, h * 0.2, w * 0.7, null, 0, h + h * 0.32, 0, { mat: capMat, tile: 1 })
  const dot = o.glow ? glowMat(o.dots ?? '#ffffff', 2.4) : plain(o.dots ?? '#ffffff')
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2
    put(g, new BoxGeometry(w * 0.16, 0.06, w * 0.16), dot, Math.cos(a) * w * 0.3, h + h * 0.32 + 0.03, Math.sin(a) * w * 0.3, false)
  }
  add(root, bake(g, true), x, y, z, r() * Math.PI)
  if (o.glow && r() < 0.5) sparkles(root, x, y + h * 0.5, z, { count: 10, radius: w * 0.6, height: h, color: o.cap, size: 0.3, speed: 0.4, soft: true, seed: Math.floor(r() * 99) })
}
function flowers(root, x, y, z, r, o) {
  const cols = o.colors ?? ['#ff5fa8', '#ffd23a', '#ffffff', '#b07bff']
  for (let i = 0; i < 6; i++) {
    const px = x + (r() - 0.5) * 2.4
    const pz = z + (r() - 0.5) * 2.4
    sbox(root, 0.08, 0.4, 0.08, '#3a9a2a', px, y, pz, { studs: false, shadows: false })
    sbox(root, 0.3, 0.14, 0.3, cols[Math.floor(r() * cols.length)], px, y + 0.4, pz, { studs: false, shadows: false })
  }
}
function coral(root, x, y, z, r, o) {
  const g = new Group()
  const cols = o.colors ?? ['#ff6f91', '#ffb347', '#b07bff', '#4fe0d0']
  const c = cols[Math.floor(r() * cols.length)]
  const m = new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.6 })
  const branch = (bx, by, bz, h, d) => {
    put(g, new BoxGeometry(0.35, h, 0.35), m, bx, by + h / 2, bz)
    if (d > 0) for (const s of [-1, 1]) branch(bx + s * 0.4, by + h * 0.7, bz + (r() - 0.5) * 0.4, h * 0.7, d - 1)
  }
  branch(0, 0, 0, 1.6 + r(), 2)
  add(root, bake(g, true), x, y, z, r() * Math.PI, o.scale ?? 1)
}
function kelp(root, x, y, z, r, o) {
  const m = plain(o.color ?? '#2f9a4a', { roughness: 0.6 })
  for (let i = 0; i < 3; i++) {
    const g = new Group()
    const h = 4 + r() * 4
    for (let k = 0; k < h; k += 0.6) put(g, new BoxGeometry(0.22, 0.6, 0.5), m, Math.sin(k) * 0.15, k + 0.3, 0)
    const s = add(root, g, x + (r() - 0.5) * 1.5, y, z + (r() - 0.5) * 1.5)
    s.userData.dynamic = true
    const ph = r() * 9
    onFrame((dt, t) => (s.rotation.z = Math.sin(t * 0.9 + ph) * 0.12))
  }
}

// --- Rocks, ruins, structures ---------------------------------------------------------------------
function rock(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#8a8f9a')
  const s = (o.scale ?? 1) * (0.8 + r() * 0.8)
  sbox(root, 2.2 * s, 1.4 * s, 1.8 * s, null, x, y, z, { mat: m, tile: 1, rotY: r() })
  sbox(root, 1.4 * s, 1.0 * s, 1.2 * s, null, x + 0.4 * s, y + 1.4 * s, z, { mat: m, tile: 1, rotY: r() })
}
function pillar(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#d8c9a2')
  const h = 3 + r() * 4
  sbox(root, 1.6, 0.5, 1.6, null, x, y, z, { mat: m, tile: 1 })
  sbox(root, 1.1, h, 1.1, null, x, y + 0.5, z, { mat: m, tile: 1 })
  if (r() < 0.6) sbox(root, 1.6, 0.5, 1.6, null, x, y + 0.5 + h, z, { mat: m, tile: 1 })
  else sbox(root, 1.0, 0.8, 1.0, null, x + 1.6, y, z + 0.6, { mat: m, tile: 1, rotY: 0.6 }) // fallen chunk
}
function obelisk(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#d9b86a')
  sbox(root, 1.8, 0.6, 1.8, null, x, y, z, { mat: m, tile: 1 })
  sbox(root, 1.1, 7, 1.1, null, x, y + 0.6, z, { mat: m, tile: 1 })
  put(root, new ConeGeometry(0.8, 1.2, 4), o.glowTip ? glowMat(o.glowTip, 3) : plain('#ffd23a', { metalness: 0.6, roughness: 0.3 }), x, y + 8.2, z).rotation.y = Math.PI / 4
}
function torii(root, x, y, z, r, o) {
  const red = plain(o.color ?? '#e0262b', { roughness: 0.5 })
  const blk = plain('#1a1a20')
  for (const s of [-1, 1]) put(root, new CylinderGeometry(0.32, 0.36, 6, 12), red, x + s * 2.6, y + 3, z)
  put(root, new BoxGeometry(7.4, 0.5, 0.7), blk, x, y + 6.2, z)
  put(root, new BoxGeometry(6.4, 0.35, 0.5), red, x, y + 5.2, z)
}
function lantern(root, x, y, z, r, o) {
  const c = o.color ?? '#ff6a2a'
  put(root, new CylinderGeometry(0.08, 0.08, 3, 6), plain('#3a2a1a'), x, y + 1.5, z)
  put(root, new BoxGeometry(1, 0.08, 0.08), plain('#3a2a1a'), x + 0.45, y + 3, z, false)
  const l = put(root, new CylinderGeometry(0.32, 0.32, 0.6, 10), glowMat(c, 2.4), x + 0.85, y + 2.55, z, false)
  l.userData.dynamic = true
  const ph = r() * 9
  onFrame((dt, t) => (l.rotation.z = Math.sin(t * 1.2 + ph) * 0.08))
}
function torch(root, x, y, z, r, o) {
  put(root, new CylinderGeometry(0.1, 0.14, 2.4, 8), plain('#4a2e1a'), x, y + 1.2, z)
  put(root, new CylinderGeometry(0.26, 0.16, 0.3, 8), plain('#2a2a30', { metalness: 0.5 }), x, y + 2.5, z)
  const fire = new MeshBasicMaterial({ color: '#ffb02a', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false })
  const f = put(root, new ConeGeometry(0.22, 0.7, 8), fire, x, y + 2.95, z, false)
  f.userData.dynamic = true
  const ph = r() * 9
  onFrame((dt, t) => {
    const s = 0.85 + Math.sin(t * 13 + ph) * 0.1 + Math.sin(t * 7.3 + ph) * 0.08
    f.scale.set(s, 1.1 * s, s)
  })
  sparkles(root, x, y + 2.9, z, { count: 8, radius: 0.15, height: 1.6, color: o.color ?? '#ff8a1a', size: 0.18, speed: 1.2, seed: Math.floor(r() * 999) })
}
function tombstone(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#8a8f9a')
  const h = 1.1 + r() * 0.6
  sbox(root, 1.0, h, 0.3, null, x, y, z, { mat: m, tile: 0.6, rotY: (r() - 0.5) * 0.4 })
  if (r() < 0.5) sbox(root, 0.7, 0.18, 0.22, null, x, y + h, z, { mat: m, tile: 0.6 })
  if (r() < 0.4) sbox(root, 1.2, 0.1, 2.0, '#4a3a2a', x, y, z + 1.1, { studs: false })
}
function pumpkins(root, x, y, z, r) {
  for (let i = 0; i < 3; i++) add(root, pumpkin(0.8 + r() * 0.8, r() < 0.6), x + (r() - 0.5) * 2.5, y, z + (r() - 0.5) * 2.5, r() * 6)
}
function cauldron(root, x, y, z, r, o) {
  const pot = plain('#1c1c22', { metalness: 0.4, roughness: 0.5 })
  put(root, new SphereGeometry(1.1, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), pot, x, y + 1.3, z)
  put(root, new CircleGeometry(0.95, 16), glowMat(o.color ?? '#5fff6a', 2.2), x, y + 1.55, z, false).rotation.x = -Math.PI / 2
  for (let i = 0; i < 3; i++) sbox(root, 0.4, 0.4, 0.4, '#4a3a2a', x + Math.cos(i * 2.1) * 0.7, y, z + Math.sin(i * 2.1) * 0.7, { studs: false })
  weather(root, { kind: 'rise', x0: x - 0.6, x1: x + 0.6, y0: y + 1.6, y1: y + 4, z0: z - 0.6, z1: z + 0.6, count: 16, colors: [o.color ?? '#5fff6a'], size: 0.35, speed: 0.8, sway: 0.3, seed: Math.floor(r() * 99) })
}
function crystal(root, x, y, z, r, o) {
  const c = o.color ?? '#b07bff'
  const m = new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.92 })
  const g = new Group()
  for (let i = 0; i < 4 + Math.floor(r() * 3); i++) {
    const h = 1.5 + r() * 3.5
    const cr = put(g, new OctahedronGeometry(0.5, 0), m, (r() - 0.5) * 1.4, h / 2, (r() - 0.5) * 1.4)
    cr.scale.set(0.6 + r() * 0.4, h, 0.6 + r() * 0.4)
    cr.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5)
  }
  add(root, bake(g, true), x, y, z, 0, o.scale ?? 1)
  sparkles(root, x, y + 0.5, z, { count: 10, radius: 1.4, height: 4, color: c, size: 0.35, speed: 0.5, seed: Math.floor(r() * 99) })
}
function iceSpike(root, x, y, z, r, o) {
  const m = new MeshStandardMaterial({ color: '#bfeaff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, emissive: '#5fc8ff', emissiveIntensity: 0.25 })
  for (let i = 0; i < 3; i++) {
    const h = 2 + r() * 4
    const c = put(root, new ConeGeometry(0.5 + r() * 0.4, h, 6), m, x + (r() - 0.5) * 1.6, y + h / 2, z + (r() - 0.5) * 1.6)
    c.rotation.z = (r() - 0.5) * 0.3
  }
}
function goldPile(root, x, y, z, r, o) {
  const gold = plain('#ffcc2a', { metalness: 0.8, roughness: 0.25, emissive: '#6a4a00', emissiveIntensity: 0.4 })
  for (let i = 0; i < 9; i++) {
    const s = 0.4 + r() * 0.9
    sbox(root, s * 1.6, s * 0.6, s * 1.2, null, x + (r() - 0.5) * 2.4, y + r() * 0.6, z + (r() - 0.5) * 2.4, { mat: gold, studs: false, rotY: r() * 3 })
  }
  sparkles(root, x, y + 0.4, z, { count: 12, radius: 1.6, height: 2, color: '#fff2a0', size: 0.4, speed: 0.4, seed: Math.floor(r() * 99) })
}
function bones(root, x, y, z, r, o) {
  const bone = plain('#efe8d6', { roughness: 0.8 })
  sbox(root, 1.4, 1.1, 1.3, null, x, y, z, { mat: bone, studs: false, rotY: r() }) // skull
  for (const s of [-1, 1]) put(root, new BoxGeometry(0.3, 0.3, 0.05), plain('#1a1a20'), x + s * 0.3, y + 0.65, z + 0.66, false)
  for (let i = 0; i < 4; i++) {
    const rib = put(root, new TorusGeometry(0.7, 0.08, 6, 12, Math.PI), bone, x + 1.8 + i * 0.45, y + 0.1, z)
    rib.rotation.y = Math.PI / 2
  }
}
function barrels(root, x, y, z, r, o) {
  const m = plain(o.color ?? '#8a5a2c', { roughness: 0.8 })
  const band = metal()
  for (let i = 0; i < 3; i++) {
    const px = x + (r() - 0.5) * 2
    const pz = z + (r() - 0.5) * 2
    put(root, new CylinderGeometry(0.45, 0.45, 1.1, 12), m, px, y + 0.55, pz)
    put(root, new CylinderGeometry(0.47, 0.47, 0.08, 12), band, px, y + 0.85, pz, false)
  }
  sbox(root, 1.2, 1.2, 1.2, '#a8743a', x + 1.4, y, z - 0.6, { tile: 1 })
}
function metal(hex = '#9aa3b2') {
  return plain(hex, { metalness: 0.7, roughness: 0.3 })
}
function gear(root, x, y, z, r, o) {
  const g = new Group()
  const m = metal(o.color ?? '#b08a3a')
  put(g, new CylinderGeometry(1.6, 1.6, 0.4, 20), m, 0, 0, 0).rotation.x = Math.PI / 2
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const t = put(g, new BoxGeometry(0.5, 0.5, 0.4), m, Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0)
    t.rotation.z = a
  }
  put(g, new CylinderGeometry(0.4, 0.4, 0.6, 10), metal('#5a606e'), 0, 0, 0).rotation.x = Math.PI / 2
  const s = add(root, bake(g, true), x, y + 2.4, z, o.face ?? 0, o.scale ?? 1)
  s.userData.dynamic = true
  const dir = r() < 0.5 ? -1 : 1
  onFrame((dt) => (s.rotation.z += dir * dt * 0.6))
}
function steamPipe(root, x, y, z, r, o) {
  const m = metal(o.color ?? '#b08a3a')
  put(root, new CylinderGeometry(0.3, 0.3, 4, 10), m, x, y + 2, z)
  put(root, new CylinderGeometry(0.4, 0.4, 0.3, 10), m, x, y + 4, z)
  weather(root, { kind: 'rise', x0: x - 0.4, x1: x + 0.4, y0: y + 4, y1: y + 8, z0: z - 0.4, z1: z + 0.4, count: 14, colors: ['#e8eef4'], size: 1.2, speed: 1.4, sway: 0.6, bright: 0.6, seed: Math.floor(r() * 99) })
}
function building(root, x, y, z, r, o) {
  const h = 10 + r() * 16
  const w = 5 + r() * 4
  const { color, lit } = facadeTex(o.glass ?? '#2b4f7e')
  const m = new MeshStandardMaterial({ map: color, roughness: 0.4, metalness: 0.3, emissive: '#ffe8b0', emissiveMap: lit, emissiveIntensity: 1.2 })
  const b = put(root, new BoxGeometry(w, h, w), m, x, y + h / 2, z)
  b.castShadow = true
  const c = o.neon ? o.neon[Math.floor(r() * o.neon.length)] : '#ff3cb4'
  put(root, new BoxGeometry(w + 0.1, 0.25, w + 0.1), glowMat(c, 3), x, y + h * (0.4 + r() * 0.5), z, false)
  put(root, new BoxGeometry(w + 0.1, 0.25, w + 0.1), glowMat(c, 3), x, y + h, z, false)
}
const facades = new Map()
// Window-grid facade: { color, lit } textures (lit = the windows with lights on).
function facadeTex(glass) {
  let t = facades.get(glass)
  if (!t) {
    const c = paintFacade(glass)
    t = { color: toTexture(c.color, { srgb: true }), lit: toTexture(c.lit, { srgb: true }) }
    for (const x of [t.color, t.lit]) x.repeat.set(1, 2)
    facades.set(glass, t)
  }
  return t
}
function neonSign(root, x, y, z, r, o) {
  const words = o.words ?? ['OPEN', 'BIKES', '24/7', 'NEON', 'CYBER', 'ZOOM']
  const c = (o.neon ?? ['#ff3cb4', '#3ff0ff', '#ffe14a', '#7dff3a'])[Math.floor(r() * 4) % (o.neon?.length ?? 4)]
  const word = words[Math.floor(r() * words.length)]
  const tex = canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0a0a14'
    ctx.fillRect(0, 0, w, h)
    ctx.shadowColor = c
    ctx.shadowBlur = 18
    outlinedText(ctx, word, w / 2, h / 2 + 4, { size: 58, color: '#ffffff', outline: c, width: 8 })
  })
  const m = new MeshBasicMaterial({ map: tex })
  put(root, new BoxGeometry(0.3, 2.2, 0.3), plain('#2a2a34'), x, y + 1.1, z)
  const p = put(root, new PlaneGeometry(4, 1.5), m, x, y + 2.9, z, false)
  p.rotation.y = o.face ?? 0
  p.material.color.setScalar(1.6)
  p.userData.dynamic = true
  const ph = r() * 9
  onFrame((dt, t) => {
    const f = Math.sin(t * 23 + ph) > 0.96 ? 0.4 : 1.6 // flickers now and then
    p.material.color.setScalar(f)
  })
}
function cloudPuff(root, x, y, z, r, o) {
  const m = plain('#ffffff', { roughness: 0.9, emissive: '#e8f0ff', emissiveIntensity: 0.35 })
  for (let i = 0; i < 5; i++) {
    const s = 0.8 + r() * 1.4
    const p = put(root, new IcosahedronGeometry(s, 1), m, x + (r() - 0.5) * 3, y + s * 0.4, z + (r() - 0.5) * 3)
    p.scale.y = 0.7
  }
}
function floatRock(root, x, y, z, r, o) {
  const g = new Group()
  sbox(g, 3, 1, 3, o.top ?? '#62d83c', 0, 0, 0, { tile: 1 })
  sbox(g, 2.4, 1.4, 2.4, o.color ?? '#8a6a4a', 0, -1.4, 0, { tile: 1 })
  sbox(g, 1.2, 1.2, 1.2, o.color ?? '#8a6a4a', 0, -2.6, 0, { tile: 1 })
  const s = add(root, bake(g, true), x, y + 6 + r() * 6, z, r() * 3, 0.8 + r() * 0.8)
  bob(s, 0.5, 0.5 + r() * 0.5, r() * 9)
}
function orb(root, x, y, z, r, o) {
  const c = o.color ?? '#9fe8ff'
  const s = put(root, new SphereGeometry(0.4 + r() * 0.4, 14, 10), glowMat(c, 3), x, y + 2 + r() * 5, z, false)
  bob(s, 0.6, 0.6 + r() * 0.6, r() * 9)
}
function jelly(root, x, y, z, r, o) {
  const c = o.color ?? '#ff7ad8'
  const g = new Group()
  put(g, new SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }), 0, 0, 0, false)
  for (let i = 0; i < 5; i++) put(g, new BoxGeometry(0.05, 1.6, 0.05), glowMat(c, 2), Math.cos(i * 1.3) * 0.4, -0.8, Math.sin(i * 1.3) * 0.4, false)
  const s = add(root, g, x, y + 3 + r() * 5, z)
  bob(s, 0.8, 0.5 + r() * 0.4, r() * 9)
}
function waterPool(root, x, y, z, r, o) {
  const tex = toTexture(paintWaterfall(), { srgb: true })
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(2, 2)
  const w = o.w ?? 8
  const d = o.d ?? 5
  const m = neon(o.color ?? '#8fe8ff', o.k ?? 1.2, { map: tex, transparent: true, opacity: 0.9 })
  put(root, new PlaneGeometry(w, d), m, x, y + 0.05, z, false).rotation.x = -Math.PI / 2
  onFrame((dt) => {
    tex.offset.x += dt * 0.05
    tex.offset.y += dt * 0.08
  })
}
function lavaPool(root, x, y, z, r, o) {
  waterPool(root, x, y, z, r, { ...o, color: o.color ?? '#ff5a1a', k: 2.4 })
  weather(root, { kind: 'rise', x0: x - (o.w ?? 8) / 2, x1: x + (o.w ?? 8) / 2, y0: y + 0.2, y1: y + 4, z0: z - (o.d ?? 5) / 2, z1: z + (o.d ?? 5) / 2, count: 18, colors: ['#ffb02a', '#ff5a1a'], size: 0.25, speed: 1.2, sway: 0.4, bright: 2, seed: Math.floor(r() * 99) })
}
function candy(root, x, y, z, r, o) {
  const cols = ['#ff5fa8', '#ffd23a', '#5fd8ff', '#7dff3a', '#b07bff']
  if (r() < 0.5) {
    put(root, new CylinderGeometry(0.12, 0.12, 3, 8), plain('#ffffff'), x, y + 1.5, z)
    const disc = put(root, new CylinderGeometry(1.2, 1.2, 0.3, 20), plain(cols[Math.floor(r() * 5)], { roughness: 0.3 }), x, y + 3.6, z)
    disc.rotation.x = Math.PI / 2
    put(root, new TorusGeometry(0.7, 0.12, 6, 18), plain('#ffffff', { roughness: 0.3 }), x, y + 3.6, z + 0.16, false)
  } else {
    const red = plain('#e0262b', { roughness: 0.3 })
    const wht = plain('#ffffff', { roughness: 0.3 })
    for (let i = 0; i < 8; i++) put(root, new CylinderGeometry(0.2, 0.2, 0.5, 10), i % 2 ? red : wht, x, y + 0.25 + i * 0.5, z)
    const hook = put(root, new TorusGeometry(0.5, 0.2, 8, 14, Math.PI), red, x + 0.5, y + 4, z)
    hook.rotation.z = 0
  }
}
function toyBlocks(root, x, y, z, r, o) {
  const cols = ['#e0262b', '#2a6dff', '#ffd23a', '#3fb83a', '#ff8a1a']
  for (let i = 0; i < 5; i++) sbox(root, 1.2, 1.2, 1.2, cols[Math.floor(r() * 5)], x + (i % 3) * 1.25 - 1.2, y + Math.floor(i / 3) * 1.2, z, { tile: 0.6, rotY: (r() - 0.5) * 0.3 })
}
function dome(root, x, y, z, r, o) {
  put(root, new SphereGeometry(3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3 }), x, y, z)
  put(root, new CylinderGeometry(3.1, 3.1, 0.4, 20), metal('#d9dee6'), x, y + 0.2, z)
  put(root, new BoxGeometry(0.4, 0.4, 0.4), glowMat('#3ff0ff', 3), x, y + 3.1, z, false)
}
function crater(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#9aa0aa')
  const ring = put(root, new TorusGeometry(2.4 + r() * 1.5, 0.45, 6, 18), m, x, y + 0.05, z)
  ring.rotation.x = Math.PI / 2
  ring.scale.z = 0.6
}
function dish(root, x, y, z, r, o) {
  put(root, new CylinderGeometry(0.2, 0.3, 3, 8), metal(), x, y + 1.5, z)
  const d = put(root, new SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), metal('#e8edf4'), x, y + 3.4, z)
  d.rotation.x = -0.9
  put(root, new BoxGeometry(0.2, 0.2, 0.2), glowMat('#ff2236', 3), x, y + 4.6, z + 0.5, false)
}
function statue(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#d8d0b8')
  sbox(root, 2.2, 1, 2.2, null, x, y, z, { mat: m, tile: 1 })
  sbox(root, 0.9, 1.6, 0.6, null, x, y + 1, z, { mat: m, tile: 1 })
  sbox(root, 1.4, 1.4, 0.8, null, x, y + 2.6, z, { mat: m, tile: 1 })
  sbox(root, 0.9, 0.9, 0.9, null, x, y + 4, z, { mat: m, tile: 1 })
  for (const s of [-1, 1]) sbox(root, 0.4, 1.4, 0.4, null, x + s * 0.95, y + 2.5, z, { mat: m, tile: 1 })
  if (o.halo) put(root, new TorusGeometry(0.6, 0.08, 6, 20), glowMat('#ffe88a', 3), x, y + 5.2, z, false).rotation.x = Math.PI / 2
}
function beam(root, x, y, z, r, o) {
  const m = new MeshBasicMaterial({ color: o.color ?? '#fff2b0', transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
  const c = put(root, new CylinderGeometry(1.2, 2.4, 40, 16, 1, true), m, x, y + 20, z, false)
  c.userData.dynamic = true
  const ph = r() * 9
  onFrame((dt, t) => (m.opacity = 0.12 + Math.sin(t * 0.8 + ph) * 0.05))
}
function rainbow(root, x, y, z, r, o) {
  const cols = ['#ff3b3b', '#ff9a1a', '#ffe14a', '#3fdc4c', '#2a9cff', '#8a3cff']
  cols.forEach((c, i) => {
    const t = put(root, new TorusGeometry(14 - i * 0.9, 0.45, 6, 40, Math.PI), glowMat(c, 1.6), x, y, z, false)
    t.scale.y = 0.75
  })
}
function rails(root, x, y, z, r, o) {
  const m = metal('#6a707e')
  const len = o.len ?? 30
  for (const s of [-0.6, 0.6]) put(root, new BoxGeometry(0.12, 0.14, len), m, x + s, y + 0.07, z, false)
  for (let k = -len / 2; k < len / 2; k += 1.2) put(root, new BoxGeometry(1.8, 0.1, 0.3), plain('#5a3a20'), x, y + 0.03, z + k, false)
  const cart = new Group()
  sbox(cart, 1.6, 1, 1.2, '#5a606e', 0, 0.4, 0, { studs: false })
  goldPile(cart, 0, 1.2, 0, r, {})
  add(root, cart, x, y, z + (r() - 0.5) * len * 0.6)
}
function anvil(root, x, y, z, r, o) {
  const m = metal('#3a3d46')
  sbox(root, 1.2, 0.8, 0.8, null, x, y, z, { mat: plain('#5a3a20'), studs: false })
  sbox(root, 1.6, 0.5, 0.6, null, x, y + 0.8, z, { mat: m, studs: false })
  put(root, new ConeGeometry(0.3, 0.6, 4), m, x + 1, y + 1.05, z).rotation.z = -Math.PI / 2
  sparkles(root, x, y + 1.3, z, { count: 10, radius: 0.5, height: 1.5, color: '#ffb02a', size: 0.2, speed: 2.2, seed: Math.floor(r() * 99) })
}
function tumbleweed(root, x, y, z, r, o) {
  const m = new MeshStandardMaterial({ color: '#b08a4a', wireframe: true })
  const w = put(root, new IcosahedronGeometry(0.7, 1), m, x, y + 0.7, z, false)
  w.userData.dynamic = true
  const span = 20
  const ph = r() * span
  onFrame((dt, t) => {
    const p = ((t * 2.2 + ph) % span) - span / 2
    w.position.x = x + p
    w.position.y = y + 0.7 + Math.abs(Math.sin(t * 3 + ph)) * 0.6
    w.rotation.z -= dt * 3
  })
}
function shipwreck(root, x, y, z, r, o) {
  const wood = studMat('#7a4a24')
  const g = new Group()
  sbox(g, 10, 2.4, 3.6, null, 0, 0, 0, { mat: wood })
  sbox(g, 7, 1.4, 3.2, null, -0.5, 2.4, 0, { mat: wood })
  put(g, new CylinderGeometry(0.22, 0.26, 9, 8), plain('#5a3a20'), 0.5, 7, 0)
  const sail = put(g, new PlaneGeometry(4, 4.5), new MeshStandardMaterial({ color: '#efe6cc', side: DoubleSide }), 0.5, 7.4, 0.3)
  sail.rotation.y = 0.2
  const flag = put(g, new PlaneGeometry(1.4, 0.9), new MeshBasicMaterial({ color: '#111116', side: DoubleSide }), 1.2, 11.3, 0)
  flag.rotation.y = 0.1
  g.rotation.z = 0.12
  add(root, bake(g, true), x, y - 0.5, z, o.face ?? 0)
}
function stage(root, x, y, z, r, o) {
  const g = new Group()
  sbox(g, 12, 1.2, 6, '#3a1a5a', 0, 0, 0)
  sbox(g, 12, 7, 0.6, '#2a1040', 0, 1.2, -2.8)
  for (const s of [-1, 1]) {
    sbox(g, 1.2, 9, 1.2, '#1a1a24', s * 6, 0, -2.4, { studs: false })
    put(g, new BoxGeometry(1.6, 1.6, 1.6), plain('#111116'), s * 4.6, 2.0, 2.2) // speakers
    put(g, new CircleGeometry(0.55, 14), plain('#3a3a44'), s * 4.6, 2.0, 3.01, false)
  }
  put(g, new BoxGeometry(12.4, 0.6, 0.6), plain('#1a1a24'), 0, 9, -2.4)
  add(root, bake(g, true), x, y, z, o.face ?? 0)
  const cols = ['#ff3cb4', '#3ff0ff', '#b07bff', '#ffe14a']
  for (let i = 0; i < 4; i++) {
    const m = new MeshBasicMaterial({ color: cols[i], transparent: true, opacity: 0.18, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
    const c = put(root, new ConeGeometry(2.2, 10, 14, 1, true), m, x - 4.5 + i * 3, y + 4.5, z + 1, false)
    c.rotation.x = Math.PI
    c.userData.dynamic = true
    onFrame((dt, t) => {
      c.rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.5
      m.opacity = 0.12 + Math.max(0, Math.sin(t * 4 + i)) * 0.12
    })
  }
  weather(root, { kind: 'fall', x0: x - 6, x1: x + 6, y0: y + 1, y1: y + 9, z0: z - 2, z1: z + 4, count: 50, colors: cols, size: 0.3, speed: 1.4, sway: 1.2, bright: 2, soft: false, seed: 7 })
}
function pyramid(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#d9b86a')
  for (let i = 0; i < 7; i++) {
    const w = 18 - i * 2.6
    sbox(root, w, 1.6, w, null, x, y + i * 1.6, z, { mat: m })
  }
  put(root, new ConeGeometry(1.2, 2, 4), glowMat('#ffd23a', 2.4), x, y + 12.2, z, false).rotation.y = Math.PI / 4
}
function volcano(root, x, y, z, r, o) {
  const m = studMat('#3a2a2a')
  for (let i = 0; i < 8; i++) sbox(root, 22 - i * 2.4, 1.8, 22 - i * 2.4, null, x, y + i * 1.8, z, { mat: m })
  put(root, new CylinderGeometry(2.6, 2.6, 0.3, 16), glowMat('#ff5a1a', 3), x, y + 14.5, z, false)
  weather(root, { kind: 'rise', x0: x - 3, x1: x + 3, y0: y + 14, y1: y + 34, z0: z - 3, z1: z + 3, count: 40, colors: ['#ffb02a', '#ff5a1a', '#3a3a3a'], size: 0.8, speed: 3, sway: 1.5, bright: 1.8, seed: 21 })
}
function dragonSkull(root, x, y, z, r, o) {
  const bone = studMat('#efe8d6')
  sbox(root, 6, 4, 5, null, x, y, z, { mat: bone })
  sbox(root, 4, 1.6, 4, null, x + 4.5, y, z, { mat: bone })
  for (const s of [-1, 1]) {
    put(root, new BoxGeometry(1.2, 1, 0.2), glowMat('#ff3b1a', 3), x + 2.6, y + 2.8, z + s * 1.4, false)
    const horn = put(root, new ConeGeometry(0.6, 4, 6), bone, x - 1.5, y + 5, z + s * 1.8)
    horn.rotation.x = s * 0.5
  }
}
function fountain(root, x, y, z, r, o) {
  const gold = plain(o.color ?? '#ffcc2a', { metalness: 0.8, roughness: 0.25 })
  put(root, new CylinderGeometry(4, 4.4, 1, 24), gold, x, y + 0.5, z)
  put(root, new CircleGeometry(3.7, 24), neon('#8fe8ff', 1.3), x, y + 1.02, z, false).rotation.x = -Math.PI / 2
  put(root, new CylinderGeometry(0.5, 0.8, 3, 12), gold, x, y + 2, z)
  put(root, new CylinderGeometry(1.8, 1.2, 0.5, 18), gold, x, y + 3.6, z)
  weather(root, { kind: 'rise', x0: x - 0.4, x1: x + 0.4, y0: y + 3.8, y1: y + 7, z0: z - 0.4, z1: z + 0.4, count: 30, colors: ['#bff4ff', '#ffffff'], size: 0.35, speed: 3, sway: 2.5, bright: 1.6, seed: 31 })
  sparkles(root, x, y + 1, z, { count: 20, radius: 3.5, height: 5, color: '#fff2a0', size: 0.4, speed: 0.6, seed: 32 })
}
function castleGate(root, x, y, z, r, o) {
  const m = studMat(o.color ?? '#8a8f9a')
  for (const s of [-1, 1]) {
    sbox(root, 4, 14, 4, null, x + s * 7, y, z, { mat: m })
    for (let i = 0; i < 3; i++) sbox(root, 1, 1.2, 1, null, x + s * 7 - 1.5 + i * 1.5, y + 14, z + 1.5, { mat: m })
    put(root, new ConeGeometry(2.9, 4, 4), plain(o.roof ?? '#3a2a6a'), x + s * 7, y + 16, z).rotation.y = Math.PI / 4
  }
  sbox(root, 10, 3, 4, null, x, y + 9, z, { mat: m })
}
function planet(root, x, y, z, r, o) {
  const c = o.color ?? '#ff8a5a'
  const p = put(root, new SphereGeometry(o.size ?? 14, 32, 20), new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, roughness: 0.8, fog: false }), x, y, z, false)
  p.userData.dynamic = true
  onFrame((dt) => (p.rotation.y += dt * 0.05))
  if (o.ring) {
    const ring = put(root, new TorusGeometry((o.size ?? 14) * 1.6, 0.8, 4, 48), new MeshBasicMaterial({ color: o.ring, transparent: true, opacity: 0.7, fog: false }), x, y, z, false)
    ring.rotation.x = 1.2
  }
}
function heroCrystal(root, x, y, z, r, o) {
  crystal(root, x, y, z, r, { ...o, scale: 3 })
}
function giantMushroom(root, x, y, z, r, o) {
  mushroom(root, x, y, z, r, { ...o, height: 10, glow: true })
}
function treeHouse(root, x, y, z, r, o) {
  tree(root, x, y, z, r, { ...o, scale: 2.6 })
}

export const DECOR = {
  tree, palm, pine, bamboo, mushroom, flowers, coral, kelp, rock, pillar, obelisk, torii, lantern, torch,
  tombstone, pumpkins, cauldron, crystal, iceSpike, goldPile, bones, barrels, gear, steamPipe, building,
  neonSign, cloudPuff, floatRock, orb, jelly, waterPool, lavaPool, candy, toyBlocks, dome, crater, dish,
  statue, beam, rainbow, rails, anvil, tumbleweed, shipwreck, stage, pyramid, volcano, dragonSkull,
  fountain, castleGate, planet, heroCrystal, giantMushroom, treeHouse,
  cactus: (root, x, y, z, r) => cactus(root, x, y, z, 1.6 + r() * 1.4, Math.floor(r() * 999)),
}
