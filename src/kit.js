import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three'
import { LAYOUT, PALETTE } from './config.js'
import { label, neon, put } from './propkit.js'
import { mulberry32, paintText } from './textures.js'
import { bake } from './bake.js'

// The lego look and the small voxel props every part of the lobby shares:
// stud textures (one canvas per colour, UVs in metres so every surface has
// studs the same size), studded boxes, canvas sign textures, live text sprites,
// and the props (trees, pumpkins, ghosts, lamps, "!" markers, bicycles, motorbikes).

// --- Colour helpers ----------------------------------------------------------------
export function shade(hex, k) {
  const c = new Color(hex)
  if (k >= 0) c.lerp(new Color('#ffffff'), k)
  else c.multiplyScalar(1 + k)
  return '#' + c.getHexString()
}

// --- Stud textures -----------------------------------------------------------------
// A tile of studs x studs lego bumps: each a raised square with a dark rim on the
// left/bottom and a light rim on top (the light comes from the upper left). `checker`
// paints every other block of `checker` studs in `alt` (the purple walls).
function paintStudTile(hex, { studs = 6, px = 32, alt = null, checker = 0, seed = 1 } = {}) {
  const size = studs * px
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const rand = mulberry32(seed)
  for (let j = 0; j < studs; j++) {
    for (let i = 0; i < studs; i++) {
      const useAlt = alt && checker && (Math.floor(i / checker) + Math.floor(j / checker)) % 2 === 1
      const base = useAlt ? alt : hex
      const x = i * px
      const y = j * px
      ctx.fillStyle = shade(base, (rand() - 0.5) * 0.05)
      ctx.fillRect(x, y, px, px)
      const m = Math.round(px * 0.2)
      const s = px - 2 * m
      const w = Math.max(2, Math.round(px * 0.09))
      ctx.fillStyle = shade(base, -0.22) // rim in shadow: left + bottom
      ctx.fillRect(x + m, y + m, w, s)
      ctx.fillRect(x + m, y + m + s - w, s, w)
      ctx.fillStyle = shade(base, -0.1) // top rim, half in shade
      ctx.fillRect(x + m, y + m, s, w)
      ctx.fillStyle = shade(base, 0.08) // lit face
      ctx.fillRect(x + m + w, y + m + w, s - w * 1.6, s - w * 2)
    }
  }
  // Faint seams between bricks.
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, size - 2, size - 2)
  return c
}

const texCache = new Map()
const matCache = new Map()
function studTexture(hex, opts = {}) {
  const key = `${hex}|${opts.alt}|${opts.checker}`
  let t = texCache.get(key)
  if (!t) {
    t = new CanvasTexture(paintStudTile(hex, opts))
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    texCache.set(key, t)
  }
  return t
}

// Studded material in `hex` (cached). UVs of studBox/studPlane are in stud tiles.
export function studMat(hex, opts = {}) {
  const key = `${hex}|${opts.alt}|${opts.checker}|${opts.roughness}|${opts.emissive}`
  let m = matCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({
      map: studTexture(hex, opts),
      roughness: opts.roughness ?? 0.82,
      metalness: 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissive ? 0.35 : 0,
    })
    matCache.set(key, m)
  }
  return m
}

// Plain (unstudded) material, cached.
const plainCache = new Map()
export function plain(hex, extra) {
  const key = hex + JSON.stringify(extra ?? {})
  let m = plainCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, roughness: 0.7, metalness: 0, ...extra })
    plainCache.set(key, m)
  }
  return m
}

// BoxGeometry with UVs in stud tiles, so studs stay one size on every face.
export function meterBox(w, h, d, tile = LAYOUT.stud) {
  const g = new BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  const dims = [
    [d, h], [d, h], // +x, -x
    [w, d], [w, d], // +y, -y
    [w, h], [w, h], // +z, -z
  ]
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile)
    }
  }
  return g
}

export function meterPlane(w, d, tile = LAYOUT.stud) {
  const g = new PlaneGeometry(w, d)
  g.rotateX(-Math.PI / 2)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile)
  return g
}

// A studded box whose bottom sits at y (x/z = centre). `mat` overrides the stud material.
export function sbox(parent, w, h, d, hex, x, y, z, { mat = null, tile, shadows = true, rotY = 0, studs = true } = {}) {
  const m = put(parent, meterBox(w, h, d, tile), mat ?? (studs ? studMat(hex) : plain(hex)), x, y + h / 2, z, shadows)
  m.rotation.y = rotY
  return m
}

// --- Canvas signs ------------------------------------------------------------------------
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

// Outlined text drawn into a 2D context (signs painted on surfaces).
export function outlinedText(ctx, text, x, y, { size = 60, color = '#fff', outline = '#1b1035', width = 10, font = 'Fredoka', weight = 700, align = 'center' } = {}) {
  ctx.font = `${weight} ${size}px ${font}, "Arial Black", sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  if (width > 0) {
    ctx.lineWidth = width
    ctx.strokeStyle = outline
    ctx.strokeText(text, x, y)
  }
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

// A text sprite whose text can change (timers, prices). `opts` go to paintText.
export function liveLabel(text, height, opts = {}) {
  const sprite = label(text, height, opts)
  let current = text
  return {
    sprite,
    set(next) {
      if (next === current) return
      current = next
      const t = paintText(next, opts)
      const tex = sprite.material.map
      tex.dispose() // the new canvas may be a different size
      tex.image = t.canvas
      tex.needsUpdate = true
      sprite.scale.set((height * t.canvas.width) / t.canvas.height, height, 1)
    },
  }
}

// Small three-line bike tag: rarity (coloured), name, income (green). Used over every displayed bike.
export const RARITY = { Common: '#e8e8e8', Rare: '#4aa8ff', Epic: '#c45cff', Legendary: '#ffd23a', Mythical: '#ff3b5c', Insane: '#ff4fd8', Secret: '#c8ccd8', Cosmic: '#7df9ff', Limited: '#ff3b3b', Exclusive: '#ff4fd8', Fuse: '#55ffb0', Standard: '#d0d0d0' }
export function bikeTag(rarity, name, income, height = 1.2) {
  return label(`${rarity}\n${name}\n${income}`, height, {
    colors: [RARITY[rarity] ?? '#ffffff', '#ffffff', '#5dff4a'],
    font: '700 64px Fredoka, "Arial Black", sans-serif',
    outlineWidth: 12,
  })
}

// --- Geometry helpers --------------------------------------------------------------------
const UP = new Vector3(0, 1, 0)
const tmp = new Vector3()
// A cylinder from a to b ([x, y, z] arrays).
export function tube(parent, a, b, r, mat, shadows = true) {
  const av = new Vector3(...a)
  const bv = new Vector3(...b)
  tmp.subVectors(bv, av)
  const len = tmp.length()
  const m = put(parent, new CylinderGeometry(r, r, len, 8), mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, shadows)
  m.quaternion.copy(new Quaternion().setFromUnitVectors(UP, tmp.normalize()))
  return m
}

// --- Props ---------------------------------------------------------------------------------

// Voxel tree: a forked trunk and a stack of studded leaf blocks.
export function voxelTree(colors = PALETTE.leavesOrange, scale = 1, seed = 3) {
  const rand = mulberry32(seed)
  const g = new Group()
  const bark = studMat(PALETTE.trunk)
  sbox(g, 0.8, 4.2, 0.8, null, 0, 0, 0, { mat: bark })
  for (const s of [-1, 1]) {
    const b = sbox(g, 0.55, 2.4, 0.55, null, s * 0.55, 3.2, 0, { mat: bark })
    b.rotation.z = -s * 0.5
  }
  const w = 3.6 + rand() * 1.2
  sbox(g, w, 1.6, w * (0.8 + rand() * 0.3), colors[0], (rand() - 0.5) * 0.6, 4.6, 0)
  sbox(g, w * 0.7, 1.3, w * 0.65, colors[1], (rand() - 0.5) * 0.8, 6.2, (rand() - 0.5) * 0.6)
  sbox(g, w * 0.45, 1, w * 0.4, colors[2] ?? colors[1], (rand() - 0.5) * 1.2, 7.5, (rand() - 0.5) * 0.6)
  sbox(g, w * 0.5, 1, w * 0.5, colors[1], w * 0.45, 5.4, (rand() - 0.5) * 1.2)
  g.scale.setScalar(scale)
  return g
}

// Jack-o'-lantern face (front of a pumpkin block).
let faceTex = null
function jackFace() {
  faceTex ??= canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#1a0d05'
    ctx.beginPath()
    ctx.moveTo(26, 52); ctx.lineTo(50, 30); ctx.lineTo(54, 58); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(102, 52); ctx.lineTo(78, 30); ctx.lineTo(74, 58); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(20, 74); ctx.lineTo(108, 74); ctx.lineTo(96, 104); ctx.lineTo(32, 104); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#ffb21a'
    for (const x of [44, 64, 84]) ctx.fillRect(x - 6, 74, 12, 12)
  })
  return faceTex
}

// Pumpkin: a studded orange block with a stem; `face` adds a jack-o'-lantern face on +Z.
export function pumpkin(size = 1.3, face = false) {
  const g = new Group()
  sbox(g, size, size * 0.85, size, '#ff8a12', 0, 0, 0)
  sbox(g, size * 0.18, size * 0.28, size * 0.18, '#3f8a22', 0, size * 0.85, 0, { studs: false })
  if (face) {
    const p = put(g, new PlaneGeometry(size * 0.8, size * 0.65), new MeshStandardMaterial({ map: jackFace(), transparent: true, emissive: '#ff9a1a', emissiveMap: jackFace(), emissiveIntensity: 0.6 }), 0, size * 0.42, size / 2 + 0.01, false)
    p.renderOrder = 1
  }
  return g
}

// A white lego ghost with stubby arms (faces +Z). Bobbed by the caller.
export function ghost() {
  const g = new Group()
  const white = studMat('#f4f6ff', { tile: 1 })
  sbox(g, 1.1, 1.4, 0.8, null, 0, 0.3, 0, { mat: white })
  for (const x of [-0.35, 0, 0.35]) sbox(g, 0.32, 0.35, 0.7, null, x, 0, 0, { mat: white })
  for (const s of [-1, 1]) sbox(g, 0.5, 0.22, 0.3, null, s * 0.75, 0.95, 0.05, { mat: white })
  const eye = plain('#111111')
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.14, 0.24, 0.05), eye, s * 0.2, 1.3, 0.41, false)
  return bake(g, true)
}

// Street lamp: dark post with a glowing yellow head (returns the group).
export function lampPost(height = 4.2) {
  const g = new Group()
  const pole = plain('#2c4a55', { roughness: 0.5, metalness: 0.3 })
  put(g, new BoxGeometry(0.22, height, 0.22), pole, 0, height / 2, 0)
  put(g, new BoxGeometry(0.6, 0.18, 0.6), pole, 0, height + 0.05, 0)
  put(g, new BoxGeometry(0.42, 0.42, 0.42), neon('#ffd84a', 3), 0, height + 0.35, 0, false)
  put(g, new BoxGeometry(0.62, 0.12, 0.62), pole, 0, height + 0.6, 0)
  put(g, new BoxGeometry(0.5, 0.3, 0.5), pole, 0, 0.15, 0)
  return g
}

// The red "!" that floats over things you can buy (bobbed by the caller).
export function exclamation(scale = 1) {
  const g = new Group()
  const red = new MeshStandardMaterial({ color: '#ff1a2a', emissive: '#c00010', emissiveIntensity: 0.45, roughness: 0.35 })
  const bar = put(g, new CylinderGeometry(0.24, 0.12, 0.95, 4), red, 0, 0.75, 0, false)
  bar.rotation.y = Math.PI / 4
  put(g, new BoxGeometry(0.24, 0.24, 0.24), red, 0, 0.1, 0, false)
  g.scale.setScalar(scale)
  return bake(g)
}

// Straw patch on the ground.
export function hay(parent, x, z, seed = 1) {
  const rand = mulberry32(seed)
  const mat = plain('#d9b24c', { roughness: 1 })
  for (let i = 0; i < 6; i++) {
    const m = put(parent, new BoxGeometry(0.9 + rand() * 1.4, 0.06, 0.25 + rand() * 0.3), mat, x + (rand() - 0.5) * 1.8, 0.03, z + (rand() - 0.5) * 1.4, false)
    m.rotation.y = rand() * Math.PI
    m.receiveShadow = true
  }
  for (let i = 0; i < 4; i++) {
    const m = put(parent, new BoxGeometry(0.08, 0.5 + rand() * 0.4, 0.08), mat, x + (rand() - 0.5) * 1.4, 0.3, z + (rand() - 0.5) * 1, false)
    m.rotation.z = (rand() - 0.5) * 0.6
  }
}

// --- Bikes -----------------------------------------------------------------------------------
let spokeTex = null
function spokes() {
  spokeTex ??= canvasTexture(128, 128, (ctx) => {
    ctx.strokeStyle = '#e9eef6'
    ctx.lineWidth = 3
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(64, 64)
      ctx.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62)
      ctx.stroke()
    }
    ctx.fillStyle = '#c9d2de'
    ctx.beginPath()
    ctx.arc(64, 64, 9, 0, Math.PI * 2)
    ctx.fill()
  })
  return spokeTex
}

// Bicycle, length along X (front at +X), wheels on the ground at y = 0.
// `basket` = front basket, `rack` = a white box on a rear rack. The wheel
// groups are in userData.wheels (spin them about Z to roll).
export function bicycle(frame = '#bfe3ff', tire = '#e6ecf5', { basket = true, rack = false, saddle = '#f2f2f2' } = {}) {
  const g = new Group()
  const fm = plain(frame, { roughness: 0.4, metalness: 0.2 })
  const tm = plain(tire, { roughness: 0.6 })
  const sm = new MeshStandardMaterial({ map: spokes(), transparent: true, alphaTest: 0.3, side: DoubleSide, roughness: 0.4 })
  g.userData.wheels = []
  for (const x of [-0.58, 0.58]) {
    const wheel = new Group()
    wheel.position.set(x, 0.42, 0)
    put(wheel, new TorusGeometry(0.38, 0.045, 8, 28), tm)
    put(wheel, new CircleGeometry(0.37, 20), sm, 0, 0, 0, false)
    g.add(wheel)
    g.userData.wheels.push(wheel)
  }
  const r = 0.035
  tube(g, [-0.58, 0.42, 0], [0, 0.42, 0], r, fm)
  tube(g, [-0.58, 0.42, 0], [-0.16, 0.98, 0], r, fm)
  tube(g, [0, 0.42, 0], [-0.18, 1.02, 0], r, fm)
  tube(g, [-0.16, 0.96, 0], [0.42, 1.0, 0], r, fm)
  tube(g, [0, 0.42, 0], [0.42, 0.98, 0], r, fm)
  tube(g, [0.58, 0.42, 0], [0.42, 1.12, 0], r, fm)
  tube(g, [0.42, 1.14, -0.26], [0.42, 1.14, 0.26], r * 0.9, plain('#c9d0da', { roughness: 0.4, metalness: 0.4 }))
  put(g, new BoxGeometry(0.28, 0.07, 0.14), plain(saddle), -0.2, 1.06, 0)
  if (basket) {
    const m = new MeshStandardMaterial({ color: '#f5f7fb', roughness: 0.5, transparent: true, opacity: 0.85 })
    put(g, new BoxGeometry(0.3, 0.22, 0.34), m, 0.66, 1.05, 0)
  }
  if (rack) {
    tube(g, [-0.58, 0.42, 0], [-0.5, 0.86, 0], r * 0.8, fm)
    put(g, new BoxGeometry(0.4, 0.26, 0.32), plain('#f4f6fb', { roughness: 0.5 }), -0.52, 1.0, 0)
  }
  return g
}

// Sport motorbike, length along X (front at +X), wheels on the ground at y = 0.
export function motorbike(body = '#ff7a1a', accent = '#222833', rim = '#cfd6e0') {
  const g = new Group()
  const bm = new MeshStandardMaterial({ color: body, roughness: 0.3, metalness: 0.25 })
  const am = plain(accent, { roughness: 0.5 })
  const tireM = plain('#17181d', { roughness: 0.9 })
  const rimM = plain(rim, { roughness: 0.3, metalness: 0.6 })
  for (const x of [-0.72, 0.78]) {
    put(g, new TorusGeometry(0.3, 0.11, 8, 22), tireM, x, 0.41, 0)
    const hub = put(g, new CylinderGeometry(0.22, 0.22, 0.1, 14), rimM, x, 0.41, 0)
    hub.rotation.x = Math.PI / 2
  }
  tube(g, [-0.72, 0.41, 0], [-0.05, 0.55, 0], 0.06, am)
  put(g, new BoxGeometry(0.55, 0.42, 0.34), am, 0.02, 0.6, 0)
  put(g, new BoxGeometry(0.6, 0.26, 0.42), bm, 0.18, 0.94, 0)
  const fair = put(g, new BoxGeometry(0.55, 0.5, 0.46), bm, 0.5, 0.82, 0)
  fair.rotation.z = -0.35
  const tail = put(g, new BoxGeometry(0.62, 0.2, 0.3), bm, -0.48, 0.98, 0)
  tail.rotation.z = 0.28
  put(g, new BoxGeometry(0.48, 0.09, 0.3), am, -0.18, 1.06, 0)
  for (const z of [-0.12, 0.12]) tube(g, [0.78, 0.41, z], [0.58, 1.05, z], 0.035, rimM)
  put(g, new BoxGeometry(0.07, 0.07, 0.72), am, 0.55, 1.1, 0)
  const screen = put(g, new BoxGeometry(0.05, 0.26, 0.36), new MeshStandardMaterial({ color: '#7fb6ff', transparent: true, opacity: 0.55, roughness: 0.1 }), 0.68, 1.14, 0, false)
  screen.rotation.z = -0.5
  put(g, new BoxGeometry(0.06, 0.12, 0.2), neon('#ffffff', 2.4), 0.8, 0.86, 0, false)
  return g
}
