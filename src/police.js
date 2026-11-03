import { AdditiveBlending, Box3, BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, TorusGeometry } from 'three'
import { neon, neonScale, put } from './propkit.js'
import { canvasTexture, plain, sbox, studMat, tube } from './kit.js'
import { bake } from './bake.js'
import { onGlobalFrame } from './fx.js'
import { bakedOfficer } from './vehicles.js'

// The police fleet guarding the lane's zones, weakest to strongest:
// police bike, police sports bike, police car, police SUV, SWAT truck,
// armoured truck, police tank, hover tank (GUARD_TIERS in config). Each takes
// a mark 0..4: higher marks add chrome, bigger light bars, gold trim and blue
// underglow. Every one has its officer asleep at the wheel (or on the seat,
// or out of the hatch). Kit convention: length along X, front at +X, on y = 0.
// The red/blue lamps share two materials that flash slowly, all in step.

// --- Shared materials ------------------------------------------------------------------------
const RED = neon('#ff2236', 4)
const BLUE = neon('#2a6dff', 5)
const WHITE_LAMP = neon('#ffffff', 2.6)
const TAIL = neon('#ff1a2a', 2.2)
const AMBER = neon('#ffaa1a', 2.6)
const GLOW = new MeshBasicMaterial({ color: '#3a8cff', transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
// While a guard is chasing you (setAlarm) every lamp double-flashes fast:
// red-red, blue-blue, like a real pursuit pattern.
let flashing = false
let alarm = false
export function setAlarm(on) {
  alarm = on
}
export function pursuitFlash(t) {
  const p = (t * 1.6) % 1
  const red = p < 0.07 || (p > 0.13 && p < 0.2) ? 1 : 0
  const blue = (p > 0.5 && p < 0.57) || (p > 0.63 && p < 0.7) ? 1 : 0
  return [red, blue]
}
function startFlashing() {
  if (flashing) return
  flashing = true
  onGlobalFrame((dt, t) => {
    let a, b
    if (alarm) {
      ;[a, b] = pursuitFlash(t)
      a = a * 1.4 - 0.1
      b = b * 1.4 - 0.1
    } else {
      const p = (t * 1.6) % 2
      a = p < 1 ? 1 - p * 0.85 : 0.15
      b = p >= 1 ? 1 - (p - 1) * 0.85 : 0.15
    }
    neonScale(RED, 0.25 + a)
    neonScale(BLUE, 0.25 + b)
    GLOW.opacity = 0.35 + Math.sin(t * 2.2) * 0.15
  })
}
const tyre = () => plain('#16171c', { roughness: 0.92 })
const metal = (hex = '#c9d0da') => plain(hex, { roughness: 0.3, metalness: 0.7 })
const paint = (hex) => new MeshStandardMaterial({ color: hex, roughness: 0.32, metalness: 0.25 })
const glassMat = () => new MeshStandardMaterial({ color: '#16203a', roughness: 0.08, metalness: 0.5 })

// Side livery: a stripe band with POLICE (or SWAT) and a star badge, cached per look.
const liveryCache = new Map()
function livery(text, band, ink, gold = false) {
  const key = `${text}|${band}|${ink}|${gold}`
  let m = liveryCache.get(key)
  if (!m) {
    const tex = canvasTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = band
      ctx.fillRect(0, 34, w, 60)
      ctx.fillStyle = gold ? '#ffd23a' : '#ffffff'
      ctx.fillRect(0, 30, w, 5)
      ctx.fillRect(0, 93, w, 5)
      ctx.fillStyle = ink
      ctx.font = '900 54px "Arial Black", Fredoka, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, w * 0.56, 66)
      // Star badge.
      ctx.save()
      ctx.translate(70, 64)
      ctx.fillStyle = gold ? '#ffd23a' : '#e9c84a'
      ctx.strokeStyle = '#5a4210'
      ctx.lineWidth = 4
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 14 : 32
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    })
    m = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    m.color.setScalar(0.92)
    liveryCache.set(key, m)
  }
  return m
}
// Livery decals on both sides of a body `halfW` wide, centred at (x, y), w x h.
function decals(g, mat, x, y, halfW, w, h) {
  for (const s of [-1, 1]) {
    const d = put(g, new PlaneGeometry(w, h), mat, x, y, s * (halfW + 0.012), false)
    d.rotation.y = s < 0 ? Math.PI : 0
  }
}

// A road wheel lying in the XY plane: tyre, rim, hub, spokes, brake disc.
function wheel(g, x, y, z, r, w, rimHex = '#cfd6e0', spokes = 5) {
  const t = put(g, new CylinderGeometry(r, r, w, 22), tyre(), x, y, z)
  t.rotation.x = Math.PI / 2
  const side = Math.sign(z) || 1
  const rim = put(g, new CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 18), metal(rimHex), x, y, z, false)
  rim.rotation.x = Math.PI / 2
  const hub = put(g, new CylinderGeometry(r * 0.18, r * 0.18, w + 0.08, 10), metal('#8a93a6'), x, y, z, false)
  hub.rotation.x = Math.PI / 2
  const sp = metal('#e8edf4')
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    const b = put(g, new BoxGeometry(r * 0.5, r * 0.12, 0.04), sp, x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, z + side * (w / 2 + 0.015), false)
    b.rotation.z = a
  }
  const disc = put(g, new CylinderGeometry(r * 0.45, r * 0.45, 0.02, 16), metal('#6a7080'), x, y, z - side * (w / 2 - 0.05), false)
  disc.rotation.x = Math.PI / 2
}
// A bike wheel (thin, many spokes) for the two-wheelers.
function bikeWheel(g, x, y, r, w, rimHex) {
  put(g, new TorusGeometry(r, w, 10, 26), tyre(), x, y, 0)
  put(g, new TorusGeometry(r - w * 0.9, w * 0.35, 6, 26), metal(rimHex), x, y, 0, false)
  const sp = metal('#dfe5ee')
  for (let i = 0; i < 8; i++) {
    const b = put(g, new BoxGeometry(r * 1.6, 0.025, 0.025), sp, x, y, 0, false)
    b.rotation.z = (i / 8) * Math.PI
  }
  const hub = put(g, new CylinderGeometry(r * 0.16, r * 0.16, w * 3, 10), metal('#8a93a6'), x, y, 0, false)
  hub.rotation.x = Math.PI / 2
  const disc = put(g, new CylinderGeometry(r * 0.42, r * 0.42, 0.02, 14), metal('#7a8090'), x, y, w * 1.2, false)
  disc.rotation.x = Math.PI / 2
}

// The light bar: a black base, alternating red/blue lamps, white takedowns,
// a siren speaker; marks 3+ get a second row and a spotlight.
function lightBar(g, x, y, width, mk, z = 0) {
  startFlashing()
  put(g, new BoxGeometry(0.42, 0.1, width), plain('#1a1c24'), x, y + 0.05, z)
  const n = 4 + Math.min(mk, 2) * 2
  const seg = width / n
  for (let i = 0; i < n; i++) {
    const zz = z - width / 2 + seg * (i + 0.5)
    const mat = i < n / 2 ? RED : BLUE
    put(g, new BoxGeometry(0.34, 0.18, seg * 0.82), mat, x, y + 0.19, zz, false)
  }
  put(g, new BoxGeometry(0.36, 0.08, width * 0.2), WHITE_LAMP, x + 0.02, y + 0.19, z, false)
  put(g, new BoxGeometry(0.2, 0.16, 0.24), plain('#2a2d36'), x + 0.18, y + 0.02, z) // siren speaker
  if (mk >= 3) {
    for (let i = 0; i < n; i++) {
      const zz = z - width / 2 + seg * (i + 0.5)
      put(g, new BoxGeometry(0.26, 0.1, seg * 0.7), i % 2 ? RED : BLUE, x - 0.02, y + 0.33, zz, false)
    }
    const spot = put(g, new CylinderGeometry(0.1, 0.14, 0.2, 10), metal(), x + 0.1, y + 0.1, z + width / 2 + 0.15)
    spot.rotation.z = Math.PI / 2
    put(g, new CircleGeometry(0.1, 10), WHITE_LAMP, x + 0.21, y + 0.1, z + width / 2 + 0.15, false).rotation.y = Math.PI / 2
  }
}
// Head + tail lamps, mirrors, plates on a body of half width hw from x0 (rear) to x1 (front).
function carFittings(g, x0, x1, y, hw, mk, plateText = 'POLICE') {
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.06, 0.16, 0.42), WHITE_LAMP, x1 + 0.01, y, s * (hw - 0.32), false)
    put(g, new BoxGeometry(0.06, 0.07, 0.16), AMBER, x1 + 0.01, y - 0.14, s * (hw - 0.22), false)
    put(g, new BoxGeometry(0.06, 0.16, 0.36), TAIL, x0 - 0.01, y, s * (hw - 0.28), false)
    if (mk >= 1) put(g, new BoxGeometry(0.05, 0.08, 0.12), s < 0 ? RED : BLUE, x1 + 0.02, y - 0.02, s * 0.25, false) // grille strobes
  }
  const plate = canvasTexture(128, 48, (ctx, w, h) => {
    ctx.fillStyle = '#f4f2e8'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#1b2a6a'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, w - 4, h - 4)
    ctx.fillStyle = '#1b2a6a'
    ctx.font = '900 26px "Arial Black", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(plateText, w / 2, h / 2 + 1)
  })
  const pm = new MeshBasicMaterial({ map: plate })
  for (const [x, ry] of [[x1 + 0.02, Math.PI / 2], [x0 - 0.02, -Math.PI / 2]]) put(g, new PlaneGeometry(0.5, 0.18), pm, x, y - 0.24, 0, false).rotation.y = ry
}
function mirrors(g, x, y, hw, body) {
  for (const s of [-1, 1]) {
    tube(g, [x, y, s * hw], [x + 0.05, y + 0.06, s * (hw + 0.18)], 0.02, plain('#1a1c24'), false)
    put(g, new BoxGeometry(0.08, 0.14, 0.2), body, x + 0.05, y + 0.1, s * (hw + 0.22))
  }
}
// The sleeping officer's head and shoulders behind a windscreen (cars, trucks).
function driver(g, x, y, z) {
  sbox(g, 0.3, 0.32, 0.55, '#4aa6ec', x, y, z, { studs: false, shadows: false })
  const head = sbox(g, 0.34, 0.34, 0.34, '#f0c497', x + 0.02, y + 0.32, z, { studs: false, shadows: false })
  head.rotation.z = -0.4
  const cap = sbox(g, 0.38, 0.12, 0.38, '#1b2a6a', x + 0.06, y + 0.62, z, { studs: false, shadows: false })
  cap.rotation.z = -0.4
}
// Blue underglow (marks 4: a bright pool of light on the ground).
function underglow(g, len, wid) {
  startFlashing()
  const m = put(g, new PlaneGeometry(len * 1.25, wid * 1.6), GLOW, 0, 0.05, 0, false)
  m.rotation.x = -Math.PI / 2
  m.renderOrder = 2
}
const trimHex = (mk) => (mk >= 4 ? '#ffd23a' : mk >= 2 ? '#d9dee6' : '#2a2d36')

// --- Tier 1: police bike ---------------------------------------------------------------------
// A big white police tourer (boxer twin): tall screen and fairing with twin
// headlamps, chrome crash bars carrying strobes, panniers and a top box in
// POLICE livery with blue/yellow checks, red and blue lamps on two rear masts.
let checkMat = null
function checks() {
  checkMat ??= (() => {
    const tex = canvasTexture(256, 64, (ctx) => {
      for (let c = 0; c < 8; c++) for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (c + r) % 2 ? '#ffd21a' : '#1f4fd8'
        ctx.fillRect(c * 32, r * 32, 32, 32)
      }
    })
    const m = new MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2 })
    m.color.setScalar(0.9)
    return m
  })()
  return checkMat
}
let plate = null
function plateMat() {
  plate ??= new MeshBasicMaterial({
    map: canvasTexture(96, 52, (ctx, w, h) => {
      ctx.fillStyle = '#f4f2e8'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#1b2a6a'
      ctx.font = '900 22px "Arial Black", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('PD 01', w / 2, h / 2 + 1)
    }),
  })
  return plate
}
// Cast alloy wheel: tyre, rim, five twin spokes, hub, brake disc(s) with red calipers.
function alloyWheel(g, x, y, r, w, rimHex, front) {
  put(g, new TorusGeometry(r - w * 0.2, w, 10, 30), tyre(), x, y, 0)
  put(g, new TorusGeometry(r - w * 1.05, w * 0.3, 6, 30), metal(rimHex), x, y, 0, false)
  const sp = metal(rimHex)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    for (const d of [-0.12, 0.12]) {
      const b = put(g, new BoxGeometry(r * 0.66, 0.03, 0.03), sp, x + Math.cos(a + d) * r * 0.36, y + Math.sin(a + d) * r * 0.36, 0, false)
      b.rotation.z = a + d
    }
  }
  const hub = put(g, new CylinderGeometry(r * 0.15, r * 0.15, w * 2.6, 12), metal('#8a93a6'), x, y, 0, false)
  hub.rotation.x = Math.PI / 2
  for (const s of front ? [-1, 1] : [1]) {
    const disc = put(g, new CylinderGeometry(r * 0.5, r * 0.5, 0.018, 20), metal('#9aa3b2'), x, y, s * w * 1.25, false)
    disc.rotation.x = Math.PI / 2
    put(g, new BoxGeometry(0.1, 0.16, 0.06), plain('#c4202c', { roughness: 0.4 }), x + 0.12, y + r * 0.32, s * w * 1.45) // caliper
  }
}
export function policeBike(mk = 0) {
  startFlashing()
  const g = new Group()
  const white = paint('#f4f6fb')
  const blk = plain('#1a1c24', { roughness: 0.55 })
  const grey = metal('#6a7080')
  const chrome = metal(mk >= 4 ? '#ffd23a' : '#dfe5ee')
  const rim = mk >= 2 ? trimHex(mk) : '#3a3f4c'
  const screen = new MeshStandardMaterial({ color: '#a8cfff', transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.2 })
  const XR = -0.8
  const XF = 0.84
  const R = 0.37
  alloyWheel(g, XR, R, R, 0.075, rim, false)
  alloyWheel(g, XF, R, R, 0.065, rim, true)

  // Rear: shaft-drive swingarm, hugger, number plate, tail lamp.
  put(g, new BoxGeometry(0.72, 0.1, 0.08), blk, -0.44, 0.44, 0.13).rotation.z = 0.2
  put(g, new BoxGeometry(0.2, 0.18, 0.12), blk, XR + 0.06, R, 0.14) // final drive
  put(g, new BoxGeometry(0.5, 0.05, 0.2), blk, XR + 0.05, R + 0.42, 0).rotation.z = -0.35
  // Engine: crankcase, gearbox, two boxer cylinders with finned heads.
  put(g, new BoxGeometry(0.5, 0.36, 0.32), grey, 0.08, 0.52, 0)
  put(g, new BoxGeometry(0.34, 0.3, 0.26), grey, -0.28, 0.56, 0)
  for (const s of [-1, 1]) {
    const cyl = put(g, new CylinderGeometry(0.11, 0.11, 0.24, 14), metal('#b8c0cc'), 0.2, 0.6, s * 0.28)
    cyl.rotation.x = Math.PI / 2
    for (let i = 0; i < 4; i++) {
      const fin = put(g, new CylinderGeometry(0.14, 0.14, 0.018, 14), metal('#d0d6de'), 0.2, 0.6, s * (0.2 + i * 0.05), false)
      fin.rotation.x = Math.PI / 2
    }
    put(g, new BoxGeometry(0.24, 0.2, 0.08), blk, 0.22, 0.6, s * 0.44) // valve cover
    tube(g, [0.28, 0.5, s * 0.36], [0.1, 0.28, s * 0.2], 0.03, chrome) // header
    // Crash bars round the cylinders, a strobe on each.
    tube(g, [0.48, 0.92, s * 0.22], [0.42, 0.66, s * 0.5], 0.024, chrome)
    tube(g, [0.42, 0.66, s * 0.5], [0.08, 0.4, s * 0.36], 0.024, chrome)
    put(g, new BoxGeometry(0.08, 0.1, 0.08), s < 0 ? RED : BLUE, 0.45, 0.72, s * 0.52, false)
    put(g, new BoxGeometry(0.14, 0.03, 0.12), blk, -0.12, 0.4, s * 0.24) // footpeg
  }
  tube(g, [0.1, 0.28, 0.2], [-0.45, 0.36, 0.25], 0.03, chrome)
  const muff = put(g, new CylinderGeometry(0.085, 0.07, 0.55, 14), chrome, -0.7, 0.42, 0.26)
  muff.rotation.z = Math.PI / 2 - 0.12
  put(g, new CylinderGeometry(0.05, 0.05, 0.03, 10), blk, -0.98, 0.45, 0.26, false).rotation.z = Math.PI / 2
  tube(g, [-0.2, 0.36, -0.18], [-0.38, 0.02, -0.34], 0.018, blk) // side stand

  // Front: forks, fender, the fairing, twin lamps, the screen, mirrors with indicators.
  for (const z of [-0.09, 0.09]) {
    tube(g, [XF, R, z], [0.68, 0.72, z], 0.032, blk)
    tube(g, [0.68, 0.72, z], [0.56, 1.05, z], 0.03, chrome)
  }
  put(g, new BoxGeometry(0.48, 0.05, 0.18), white, XF + 0.02, R + 0.42, 0).rotation.z = -0.18
  put(g, new BoxGeometry(0.3, 0.05, 0.18), white, XF - 0.22, R + 0.43, 0).rotation.z = 0.25
  put(g, new BoxGeometry(0.62, 0.42, 0.62), white, 0.48, 0.92, 0).rotation.z = -0.32
  put(g, new BoxGeometry(0.3, 0.32, 0.56), white, 0.7, 1.16, 0) // nose
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.62, 0.36, 0.06), white, 0.38, 0.92, s * 0.33).rotation.z = -0.25
    put(g, new BoxGeometry(0.4, 0.12, 0.065), blk, 0.3, 0.74, s * 0.335) // lower vent
    put(g, new CircleGeometry(0.075, 14), WHITE_LAMP, 0.856, 1.14, s * 0.12, false).rotation.y = Math.PI / 2
    put(g, new BoxGeometry(0.03, 0.06, 0.08), s < 0 ? RED : BLUE, 0.86, 1.02, s * 0.22, false)
    tube(g, [0.62, 1.28, s * 0.26], [0.6, 1.36, s * 0.42], 0.016, blk) // mirror stalk
    put(g, new BoxGeometry(0.06, 0.12, 0.18), white, 0.6, 1.38, s * 0.46)
    put(g, new BoxGeometry(0.065, 0.03, 0.12), AMBER, 0.6, 1.33, s * 0.46, false)
    put(g, new BoxGeometry(0.12, 0.06, 0.1), blk, 0.46, 1.24, s * 0.42) // grip
    put(g, new BoxGeometry(0.03, 0.12, 0.12), blk, 0.53, 1.24, s * 0.42) // hand guard
    put(g, new BoxGeometry(0.08, 0.08, 0.08), s < 0 ? RED : BLUE, 0.66, 1.36, s * 0.24, false) // pursuit lamp
  }
  decals(g, checks(), 0.4, 0.95, 0.36, 0.42, 0.12)
  decals(g, livery('POLICE', '#1b2a6a', '#ffffff', mk >= 4), 0.5, 1.12, 0.29, 0.5, 0.14)
  put(g, new BoxGeometry(0.03, 0.58, 0.54), screen, 0.72, 1.55, 0, false).rotation.z = -0.42
  put(g, new BoxGeometry(0.03, 0.04, 0.5), blk, 0.6, 1.3, 0, false) // screen base
  tube(g, [0.46, 1.24, -0.36], [0.46, 1.24, 0.36], 0.018, blk) // bars
  put(g, new BoxGeometry(0.1, 0.16, 0.34), blk, 0.56, 1.3, 0) // dash
  put(g, new BoxGeometry(0.02, 0.1, 0.18), neon('#7fe0ff', 1.4), 0.62, 1.34, 0, false)
  put(g, new CylinderGeometry(0.07, 0.07, 0.04, 12), chrome, 0.62, 0.66, 0.2, false).rotation.z = Math.PI / 2 // siren speaker

  // Tank, seat, panniers, top box, masts, antenna.
  put(g, new BoxGeometry(0.5, 0.28, 0.42), white, 0.16, 1.02, 0)
  put(g, new BoxGeometry(0.34, 0.03, 0.3), blk, 0.12, 1.17, 0) // tank pad
  put(g, new BoxGeometry(0.5, 0.12, 0.38), blk, -0.26, 1.02, 0) // rider seat
  put(g, new BoxGeometry(0.16, 0.1, 0.34), blk, -0.5, 1.07, 0)
  put(g, new BoxGeometry(0.6, 0.18, 0.4), white, -0.52, 0.9, 0) // tail
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.62, 0.46, 0.26), white, -0.62, 0.74, s * 0.36) // pannier
    put(g, new BoxGeometry(0.64, 0.08, 0.28), blk, -0.62, 0.99, s * 0.36) // lid seal
    tube(g, [-0.86, 1.18, s * 0.2], [-0.94, 1.66, s * 0.22], 0.02, blk) // rear mast
    put(g, new BoxGeometry(0.1, 0.16, 0.1), s < 0 ? RED : BLUE, -0.95, 1.72, s * 0.22, false)
  }
  decals(g, checks(), -0.62, 0.62, 0.495, 0.58, 0.1)
  decals(g, livery('POLICE', '#ffffff', '#1b2a6a'), -0.62, 0.8, 0.495, 0.56, 0.16)
  put(g, new BoxGeometry(0.44, 0.36, 0.5), white, -0.8, 1.18, 0) // top box
  put(g, new BoxGeometry(0.46, 0.06, 0.52), blk, -0.8, 1.38, 0)
  decals(g, checks(), -0.8, 1.06, 0.25, 0.42, 0.1)
  put(g, new BoxGeometry(0.03, 0.12, 0.32), TAIL, -1.03, 1.18, 0, false)
  put(g, new BoxGeometry(0.03, 0.06, 0.12), TAIL, -0.96, 0.82, 0, false)
  put(g, new PlaneGeometry(0.26, 0.14), plateMat(), -1.0, 0.68, 0, false).rotation.y = -Math.PI / 2
  tube(g, [-0.9, 1.2, -0.18], [-0.98, 2.3, -0.2], 0.008, plain('#2a2d36')) // radio whip
  if (mk >= 3) put(g, new BoxGeometry(0.2, 0.06, 0.34), RED, -0.62, 1.04, 0, false)
  g.userData.rider = { x: -0.3, y: 1.04, z: 0, rz: 0 }
  g.userData.lamps = [[-0.95, 1.72, -0.22], [-0.95, 1.72, 0.22], [0.66, 1.36, -0.24], [0.66, 1.36, 0.24]]
  g.userData.zzz = 2.9
  return g
}

// --- Tier 2: police sports bike --------------------------------------------------------------
export function policeSportsBike(mk = 0) {
  startFlashing()
  const g = new Group()
  const body = paint('#f4f6fb')
  const navy = paint(mk >= 4 ? '#0c1236' : '#1b2a6a')
  const blk = plain('#1a1c24', { roughness: 0.5 })
  bikeWheel(g, -0.78, 0.4, 0.38, 0.1, trimHex(mk))
  bikeWheel(g, 0.82, 0.38, 0.36, 0.08, trimHex(mk))
  tube(g, [-0.78, 0.4, 0.1], [-0.05, 0.62, 0.1], 0.05, metal('#2a2d36'))
  for (const z of [-0.1, 0.1]) tube(g, [0.82, 0.38, z], [0.52, 1.12, z], 0.035, metal('#ffd23a'))
  put(g, new BoxGeometry(0.62, 0.42, 0.34), blk, 0, 0.62, 0)
  // Fairing: layered angled panels.
  const f1 = put(g, new BoxGeometry(0.9, 0.42, 0.46), body, 0.38, 0.78, 0)
  f1.rotation.z = -0.25
  const f2 = put(g, new BoxGeometry(0.5, 0.36, 0.5), navy, 0.66, 1.0, 0)
  f2.rotation.z = -0.55
  put(g, new BoxGeometry(0.66, 0.28, 0.42), body, 0.02, 1.0, 0) // tank
  const tail = put(g, new BoxGeometry(0.78, 0.2, 0.3), body, -0.5, 1.08, 0)
  tail.rotation.z = 0.32
  put(g, new BoxGeometry(0.44, 0.08, 0.28), blk, -0.28, 1.12, 0)
  decals(g, livery('POLICE', '#1b2a6a', '#ffffff', mk >= 4), 0.36, 0.8, 0.235, 0.84, 0.26)
  const ws = put(g, new BoxGeometry(0.04, 0.3, 0.4), new MeshStandardMaterial({ color: '#7fb6ff', transparent: true, opacity: 0.5, roughness: 0.1 }), 0.84, 1.24, 0, false)
  ws.rotation.z = -0.9
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.05, 0.08, 0.14), WHITE_LAMP, 0.92, 0.98, s * 0.11, false)
    put(g, new BoxGeometry(0.05, 0.06, 0.1), s < 0 ? RED : BLUE, 0.9, 0.86, s * 0.18, false)
    put(g, new BoxGeometry(0.24, 0.05, 0.05), s < 0 ? RED : BLUE, -0.2, 0.88, s * 0.24, false) // side strip
    put(g, new BoxGeometry(0.06, 0.05, 0.3), metal(), 0.5, 1.14, s * 0.18) // clip-ons
  }
  mirrors(g, 0.7, 1.2, 0.24, navy)
  const ex = put(g, new CylinderGeometry(0.08, 0.06, 0.5, 10), metal('#c0c8d2'), -0.55, 0.62, 0.2)
  ex.rotation.z = Math.PI / 2 - 0.3
  put(g, new BoxGeometry(0.05, 0.06, 0.2), TAIL, -0.88, 1.2, 0, false)
  if (mk >= 2) put(g, new BoxGeometry(0.1, 0.12, 0.26), metal('#d9dee6'), -0.75, 0.9, 0) // radio box
  if (mk >= 3) lightBar(g, -0.8, 1.04, 0.36, 0)
  g.userData.rider = { x: -0.22, y: 1.12, z: 0, rz: -0.25 } // slumped over the tank
  g.userData.lamps = [[0.9, 0.86, -0.18], [0.9, 0.86, 0.18]]
  g.userData.zzz = 3
  return g
}

// --- Tier 3: police car ----------------------------------------------------------------------
// `blackTop`: studded black hood, roof and trunk lid (zone 2's black-and-white).
export function policeCar2(mk = 0, { blackTop = false } = {}) {
  startFlashing()
  const g = new Group()
  const white = paint('#f4f6fb')
  const black = paint('#14151b')
  const top = blackTop ? studMat('#1d1f2a') : black
  const hw = 1.02
  sbox(g, 4.6, 0.55, hw * 2, null, 0, 0.32, 0, { mat: blackTop ? white : black }) // lower body
  if (blackTop) sbox(g, 4.62, 0.14, hw * 2 + 0.02, null, 0, 0.05, 0, { mat: black, studs: false }) // sill
  sbox(g, 1.6, 0.18, hw * 2, null, 1.5, 0.86, 0, { mat: top }) // hood
  sbox(g, 1.0, 0.18, hw * 2, null, -1.8, 0.86, 0, { mat: top }) // trunk
  sbox(g, 2.1, 0.22, hw * 2 + 0.02, null, -0.15, 0.82, 0, { mat: white }) // doors (white)
  const gm = glassMat()
  sbox(g, 2.2, 0.62, hw * 2 - 0.12, null, -0.25, 1.04, 0, { mat: gm }) // cabin glass
  sbox(g, 1.9, 0.08, hw * 2 - 0.1, null, -0.3, 1.66, 0, { mat: blackTop ? top : white }) // roof
  for (const x of [0.78, -0.25, -1.3]) for (const s of [-1, 1]) sbox(g, 0.1, 0.62, 0.06, null, x, 1.04, s * (hw - 0.09), { mat: white }) // pillars
  decals(g, livery('POLICE', '#14151b', '#ffffff', mk >= 4), -0.15, 0.82, hw + 0.01, 2.1, 0.5)
  for (const s of [-1, 1]) for (const x of [0.4, -0.7]) put(g, new BoxGeometry(0.16, 0.03, 0.02), metal(), x, 0.92, s * (hw + 0.02), false) // handles
  put(g, new BoxGeometry(0.06, 0.4, 1.7), plain('#101116'), 2.32, 0.5, 0) // grille
  sbox(g, 0.2, 0.6, 1.6, null, 2.45, 0.2, 0, { mat: metal('#1a1c24') }) // push bar
  for (const s of [-1, 1]) tube(g, [2.4, 0.3, s * 0.7], [2.4, 0.8, s * 0.7], 0.04, metal('#1a1c24'))
  carFittings(g, -2.3, 2.3, 0.62, hw, mk)
  mirrors(g, 0.8, 1.0, hw, white)
  lightBar(g, -0.3, 1.7, 1.5, mk)
  tube(g, [-1.6, 1.0, 0.6], [-1.6, 1.9, 0.6], 0.012, plain('#2a2d36'))
  for (const x of [-1.45, 1.45]) for (const s of [-1, 1]) wheel(g, x, 0.42, s * (hw - 0.05), 0.42, 0.3, trimHex(mk))
  driver(g, 0.1, 0.7, 0.42)
  if (mk >= 4) underglow(g, 4.6, hw * 2)
  g.userData.zzz = 2.8
  return g
}

// --- Tier 4: police SUV ----------------------------------------------------------------------
export function policeSUV(mk = 0) {
  const g = new Group()
  const navy = paint(mk >= 4 ? '#0c1236' : '#1b2a6a')
  const white = paint('#f4f6fb')
  const hw = 1.12
  sbox(g, 4.9, 0.5, hw * 2, null, 0, 0.5, 0, { mat: plain('#14151b') })
  sbox(g, 4.9, 0.7, hw * 2, null, 0, 0.95, 0, { mat: navy })
  sbox(g, 3.3, 0.85, hw * 2 - 0.06, null, -0.65, 1.65, 0, { mat: glassMat() })
  sbox(g, 3.3, 0.12, hw * 2 - 0.02, null, -0.65, 2.48, 0, { mat: white })
  for (const x of [0.95, -0.4, -2.25]) for (const s of [-1, 1]) sbox(g, 0.12, 0.85, 0.06, null, x, 1.65, s * (hw - 0.06), { mat: white })
  decals(g, livery('POLICE', '#f4f6fb', '#1b2a6a', mk >= 4), -0.3, 1.25, hw + 0.01, 3.2, 0.6)
  // Roof rack, side steps, spare wheel, bull bar, fog lamps.
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(2.6, 0.06, 0.06), metal('#2a2d36'), -0.9, 2.62, s * 0.85)
    put(g, new BoxGeometry(2.2, 0.06, 0.32), metal('#2a2d36'), 0, 0.42, s * (hw + 0.16))
    put(g, new BoxGeometry(0.08, 0.12, 0.12), AMBER, 2.5, 0.72, s * 0.7, false)
  }
  for (let i = 0; i < 4; i++) put(g, new BoxGeometry(0.06, 0.06, 1.7), metal('#2a2d36'), -1.9 + i * 0.6, 2.64, 0)
  const spare = put(g, new CylinderGeometry(0.44, 0.44, 0.28, 20), tyre(), -2.6, 1.2, 0) // spare on the tailgate
  spare.rotation.z = Math.PI / 2
  put(g, new CylinderGeometry(0.26, 0.26, 0.3, 14), metal(trimHex(mk)), -2.62, 1.2, 0, false).rotation.z = Math.PI / 2
  sbox(g, 0.24, 0.7, 2.0, null, 2.55, 0.35, 0, { mat: metal('#1a1c24') })
  put(g, new BoxGeometry(0.06, 0.42, 1.6), plain('#101116'), 2.46, 1.0, 0)
  carFittings(g, -2.45, 2.45, 1.1, hw, mk)
  mirrors(g, 1.0, 1.55, hw, navy)
  lightBar(g, -0.2, 2.56, 1.7, mk)
  for (const x of [-1.6, 1.6]) for (const s of [-1, 1]) wheel(g, x, 0.5, s * (hw - 0.04), 0.5, 0.36, trimHex(mk))
  driver(g, 0.3, 1.1, 0.45)
  if (mk >= 4) underglow(g, 4.9, hw * 2)
  g.userData.zzz = 3.6
  return g
}

// --- Tier 5: SWAT truck -----------------------------------------------------------------------
export function swatTruck(mk = 0) {
  const g = new Group()
  const body = paint(mk >= 4 ? '#0a0c14' : '#1a1d2a')
  const hw = 1.25
  sbox(g, 5.6, 0.6, hw * 2, null, 0, 0.55, 0, { mat: plain('#101116') })
  sbox(g, 5.6, 1.5, hw * 2, null, 0, 1.1, 0, { mat: body })
  const nose = sbox(g, 1.4, 0.8, hw * 2 - 0.1, null, 2.2, 2.45, 0, { mat: body })
  nose.rotation.z = -0.35
  sbox(g, 4.0, 1.1, hw * 2, null, -0.8, 2.55, 0, { mat: body })
  const gm = glassMat()
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.7, 0.4, 0.04), gm, 1.0, 2.95, s * (hw + 0.01), false) // slit windows
    put(g, new BoxGeometry(0.7, 0.4, 0.04), gm, -0.2, 2.95, s * (hw + 0.01), false)
    for (let i = 0; i < 6; i++) put(g, new BoxGeometry(0.06, 0.06, 0.04), metal('#5a606e'), -2.4 + i * 0.95, 1.95, s * (hw + 0.02), false) // rivets
    put(g, new BoxGeometry(1.8, 0.08, 0.36), metal('#3a3f4c'), 0.6, 0.6, s * (hw + 0.2)) // step
    for (let r = 0; r < 4; r++) put(g, new BoxGeometry(0.05, 0.05, 0.05), metal(), -2.6, 1.2 + r * 0.4, s * 0.5, false) // rear ladder rungs
  }
  put(g, new BoxGeometry(0.06, 0.55, 2.0), gm, 2.66, 2.75, 0, false)
  decals(g, livery('SWAT', '#2a2d36', '#ffffff', mk >= 4), -0.5, 1.55, hw + 0.01, 3.4, 0.8)
  // Ram bar with teeth, winch, roof hatch + turret ring.
  sbox(g, 0.3, 0.9, 2.6, null, 2.95, 0.35, 0, { mat: metal('#202228') })
  for (let i = 0; i < 5; i++) put(g, new BoxGeometry(0.3, 0.2, 0.2), metal('#9aa3b2'), 3.15, 0.8, -1 + i * 0.5)
  put(g, new CylinderGeometry(0.2, 0.2, 0.5, 10), metal('#3a3f4c'), 2.85, 1.0, 0).rotation.x = Math.PI / 2
  put(g, new CylinderGeometry(0.62, 0.66, 0.25, 16), metal('#2a2d36'), -1.2, 3.22, 0)
  put(g, new CylinderGeometry(0.5, 0.5, 0.08, 16), body, -1.2, 3.4, 0)
  carFittings(g, -2.8, 2.8, 1.5, hw, mk, 'SWAT')
  lightBar(g, 0.5, 3.1, 2.0, mk)
  for (const x of [-1.9, 1.85]) for (const s of [-1, 1]) wheel(g, x, 0.62, s * (hw - 0.02), 0.62, 0.44, trimHex(mk), 6)
  driver(g, 1.4, 1.95, 0.5)
  if (mk >= 4) underglow(g, 5.6, hw * 2)
  g.userData.zzz = 4.6
  return g
}

// --- Tier 6: armoured truck (6x6) -------------------------------------------------------------
export function armoredTruck2(mk = 0) {
  const g = new Group()
  const white = paint('#eef1f7')
  const navy = paint(mk >= 4 ? '#0c1236' : '#1f2b5c')
  const hw = 1.35
  // V-hull underside, armoured body, cab, bulletproof glass.
  for (const s of [-1, 1]) {
    const v = sbox(g, 6.2, 0.7, hw, null, 0, 0.55, s * hw * 0.42, { mat: plain('#2a2d36') })
    v.rotation.x = s * 0.45
  }
  sbox(g, 6.2, 1.4, hw * 2, null, 0, 1.1, 0, { mat: white })
  sbox(g, 4.0, 1.5, hw * 2 - 0.1, null, -0.9, 2.5, 0, { mat: white })
  sbox(g, 1.6, 1.0, hw * 2 - 0.1, null, 1.9, 2.5, 0, { mat: white })
  const gm = glassMat()
  put(g, new BoxGeometry(0.12, 0.8, 2.2), gm, 2.71, 3.0, 0, false)
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(1.0, 0.6, 0.06), gm, 1.8, 3.0, s * (hw - 0.03), false)
    put(g, new BoxGeometry(0.8, 0.5, 0.06), gm, -0.2, 3.2, s * (hw - 0.03), false)
    put(g, new BoxGeometry(4.0, 0.24, 0.08), navy, -0.9, 2.0, s * (hw + 0.01)) // navy band
    for (let i = 0; i < 8; i++) put(g, new BoxGeometry(0.07, 0.07, 0.05), metal('#8a93a6'), -2.8 + i * 0.8, 1.7, s * (hw + 0.02), false)
    put(g, new BoxGeometry(0.4, 0.6, 0.3), metal('#3a3f4c'), 0.2, 3.3, s * (hw - 0.2)) // roof light pods
    put(g, new BoxGeometry(0.06, 0.3, 0.22), WHITE_LAMP, 0.42, 3.35, s * (hw - 0.2), false)
  }
  decals(g, livery('POLICE', '#1f2b5c', '#ffffff', mk >= 4), -0.6, 1.35, hw + 0.01, 3.6, 0.8)
  sbox(g, 0.35, 0.95, 2.8, null, 3.2, 0.3, 0, { mat: metal('#16171c') })
  put(g, new BoxGeometry(0.08, 0.6, 2.0), plain('#101116'), 3.11, 1.35, 0)
  put(g, new CylinderGeometry(0.22, 0.22, 0.7, 10), metal('#3a3f4c'), 3.25, 0.95, 0).rotation.x = Math.PI / 2 // winch
  carFittings(g, -3.1, 3.1, 1.65, hw, mk)
  lightBar(g, -0.6, 3.26, 2.1, mk)
  tube(g, [-2.2, 3.26, 0], [-2.2, 3.9, 0], 0.05, metal('#8a93a6'))
  put(g, new SphereGeometry(0.3, 12, 8), BLUE, -2.2, 4.0, 0, false) // siren dome
  for (const x of [-2.1, 0, 2.1]) for (const s of [-1, 1]) wheel(g, x, 0.7, s * (hw - 0.02), 0.7, 0.5, trimHex(mk), 6)
  driver(g, 1.9, 2.4, 0.55)
  if (mk >= 4) underglow(g, 6.2, hw * 2)
  g.userData.zzz = 5
  return g
}

// --- Tier 7: police tank ----------------------------------------------------------------------
export function policeTank(mk = 0) {
  const g = new Group()
  const hull = paint(mk >= 4 ? '#0c1236' : '#24315e')
  const white = paint('#eef1f7')
  const hw = 1.7
  // Tracks: a long belt each side with road wheels, sprocket and idler, side skirts.
  for (const s of [-1, 1]) {
    const z = s * (hw - 0.35)
    sbox(g, 6.4, 0.9, 0.7, null, 0, 0.1, z, { mat: plain('#1c1d22', { roughness: 0.95 }) })
    for (let i = 0; i < 16; i++) put(g, new BoxGeometry(0.16, 0.06, 0.74), metal('#3a3d46'), -3.0 + i * 0.4, 1.02, z, false) // track links on top
    for (let i = 0; i < 6; i++) wheel(g, -2.4 + i * 0.96, 0.42, z + s * 0.05, 0.38, 0.66, '#5a606e', 6)
    sbox(g, 6.0, 0.55, 0.12, null, 0.1, 0.75, s * (hw + 0.02), { mat: hull }) // skirt
    decals(g, livery('POLICE', '#eef1f7', '#24315e', mk >= 4), 0.2, 1.02, hw + 0.08, 4.0, 0.5)
    for (let i = 0; i < 3; i++) put(g, new CylinderGeometry(0.08, 0.08, 0.36, 8), metal('#3a3f4c'), 0.6 - i * 0.22, 2.55, s * 1.0).rotation.z = 0.6 // smoke launchers
  }
  sbox(g, 6.6, 0.9, hw * 2 - 0.5, null, 0, 1.0, 0, { mat: hull })
  const glacis = sbox(g, 1.4, 0.7, hw * 2 - 0.5, null, 3.1, 1.05, 0, { mat: hull })
  glacis.rotation.z = 0.5
  sbox(g, 6.0, 0.12, hw * 2 + 0.2, null, 0, 1.9, 0, { mat: white }) // fender line
  // Turret, mantlet, barrel with muzzle brake, commander hatch.
  const turret = new Group()
  turret.position.set(-0.4, 1.9, 0)
  sbox(turret, 2.8, 0.9, 2.3, null, 0, 0, 0, { mat: hull })
  const cheek = sbox(turret, 1.0, 0.8, 2.2, null, 1.5, 0.02, 0, { mat: hull })
  cheek.rotation.z = -0.35
  put(turret, new BoxGeometry(0.5, 0.55, 0.7), metal('#2a2d36'), 2.0, 0.45, 0)
  const barrel = put(turret, new CylinderGeometry(0.14, 0.17, 4.2, 14), metal('#3a3f4c'), 4.2, 0.48, 0)
  barrel.rotation.z = Math.PI / 2
  put(turret, new CylinderGeometry(0.24, 0.24, 0.5, 12), metal('#2a2d36'), 6.3, 0.48, 0).rotation.z = Math.PI / 2
  put(turret, new CylinderGeometry(0.4, 0.42, 0.2, 14), metal('#3a3f4c'), -0.5, 1.0, 0.5)
  for (const s of [-1, 1]) put(turret, new BoxGeometry(2.0, 0.24, 0.06), white, -0.1, 0.45, s * 1.16)
  lightBar(turret, 0.4, 0.9, 1.4, mk, -0.3)
  put(turret, new BoxGeometry(0.6, 0.5, 0.6), metal('#3a3f4c'), -1.1, 1.0, -0.6) // ammo box / radio
  tube(turret, [-1.3, 0.9, -0.9], [-1.3, 2.6, -0.9], 0.02, plain('#2a2d36'))
  // The commander, asleep half out of the hatch.
  sbox(turret, 0.4, 0.5, 0.6, '#4aa6ec', -0.5, 1.05, 0.5, { studs: false })
  const head = sbox(turret, 0.38, 0.38, 0.38, '#f0c497', -0.45, 1.55, 0.5, { studs: false })
  head.rotation.z = -0.5
  const helm = sbox(turret, 0.46, 0.2, 0.46, '#1b2a6a', -0.38, 1.88, 0.5, { studs: false })
  helm.rotation.z = -0.5
  g.add(turret)
  carFittings(g, -3.3, 3.3, 1.2, hw - 0.3, mk)
  if (mk >= 4) underglow(g, 6.6, hw * 2)
  g.userData.zzz = 4.8
  return g
}

// --- Tier 8: hover tank -----------------------------------------------------------------------
export function hoverTank(mk = 0) {
  const g = new Group()
  const hull = paint(mk >= 4 ? '#f4f6fb' : '#141a33')
  const trim = mk >= 4 ? neon('#ffd23a', 2.6) : neon('#3ff0ff', 3)
  const hw = 1.8
  const body = new Group()
  body.position.y = 1.2
  sbox(body, 6.0, 0.9, hw * 2, null, 0, 0, 0, { mat: hull })
  const nose = sbox(body, 1.6, 0.7, hw * 2 - 0.4, null, 3.3, 0.1, 0, { mat: hull })
  nose.rotation.z = -0.4
  const back = sbox(body, 1.2, 0.8, hw * 2 - 0.2, null, -3.3, 0.05, 0, { mat: hull })
  back.rotation.z = 0.35
  sbox(body, 3.4, 0.7, 2.4, null, -0.4, 0.9, 0, { mat: hull }) // turret block
  const canopy = put(body, new SphereGeometry(0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glassMat(), 1.2, 0.9, 0)
  canopy.scale.set(1.5, 0.8, 1)
  for (const s of [-1, 1]) {
    // Neon trim lines, twin plasma cannons, hover pods with glow pools.
    put(body, new BoxGeometry(5.6, 0.07, 0.06), trim, 0, 0.3, s * (hw + 0.02), false)
    put(body, new BoxGeometry(3.0, 0.07, 0.06), trim, -0.4, 1.0, s * 1.22, false)
    const gun = put(body, new CylinderGeometry(0.12, 0.16, 3.0, 12), metal('#8a93a6'), 2.2, 1.0, s * 0.6)
    gun.rotation.z = Math.PI / 2
    put(body, new CylinderGeometry(0.14, 0.14, 0.2, 12), trim, 3.7, 1.0, s * 0.6, false).rotation.z = Math.PI / 2
    for (const x of [-2.2, 2.0]) {
      put(body, new CylinderGeometry(0.62, 0.72, 0.4, 18), metal('#3a3f4c'), x, -0.55, s * (hw - 0.3))
      put(body, new CircleGeometry(0.55, 18), neon('#3ff0ff', 4), x, -0.76, s * (hw - 0.3), false).rotation.x = Math.PI / 2
    }
  }
  decals(body, livery('POLICE', '#3ff0ff', '#0a1030', mk >= 4), -0.6, 0.05, hw + 0.01, 4.0, 0.6)
  lightBar(body, -0.8, 1.25, 1.8, Math.max(mk, 3))
  // The pilot asleep under the canopy.
  sbox(body, 0.3, 0.3, 0.5, '#4aa6ec', 1.1, 0.75, 0, { studs: false, shadows: false })
  const head = sbox(body, 0.32, 0.32, 0.32, '#f0c497', 1.15, 1.02, 0, { studs: false, shadows: false })
  head.rotation.z = -0.45
  g.add(bake(body, true))
  // Glow pools under the pods (not baked into the bobbing hull).
  startFlashing()
  for (const s of [-1, 1]) for (const x of [-2.2, 2.0]) {
    const pool = put(g, new CircleGeometry(1.2, 20), GLOW, x, 0.06, s * (hw - 0.3), false)
    pool.rotation.x = -Math.PI / 2
  }
  g.userData.zzz = 4.6
  g.userData.hover = true
  g.userData.sound = 'hover'
  g.userData.fly = 1.2
  return g
}

// Tier list in strength order (GUARD_TIERS names these).
export const POLICE = { policeBike, policeSportsBike, policeCar: policeCar2, policeSUV, swatTruck, armoredTruck: armoredTruck2, policeTank, hoverTank }

// A finished guard vehicle baked to a few meshes; userData.zzz = height of its
// snores, userData.hover = it floats (the caller bobs it).
export function guardVehicle(kind, mk) {
  return finishGuard(POLICE[kind](mk))
}

// Bakes a guard vehicle (built at the origin, front +X) and works out what the
// chase needs: its size, where its pursuit lamps are (the top of the light bar
// unless the builder named them), and an officer whose head can lift when he
// wakes (bikes; car drivers are part of the bake). Flagged dynamic: it drives.
const box = new Box3()
export function finishGuard(g) {
  const ud = { ...g.userData }
  // Spinning parts (rotors, fans: { obj, axis, rate }, direct children) are baked on their own.
  const spin = ud.spinners ?? []
  for (const sp of spin) sp.obj.removeFromParent()
  const out = bake(g, true)
  box.setFromObject(out)
  ud.spinners = spin.map((sp) => {
    const b = bake(sp.obj, true)
    out.add(b)
    return { ...sp, obj: b }
  })
  ud.length = box.max.x - box.min.x
  ud.width = box.max.z - box.min.z
  ud.height = box.max.y
  const cx = (box.min.x + box.max.x) / 2
  ud.lamps ??= [[cx, box.max.y + 0.05, -ud.width * 0.22], [cx, box.max.y + 0.05, ud.width * 0.22]]
  // Headlamps (lit in the dark zones while it drives): low on the nose unless named.
  const hy = box.min.y + Math.min(1.2, (box.max.y - box.min.y) * 0.3)
  ud.headlights ??= [[box.max.x, hy, -ud.width * 0.3], [box.max.x, hy, ud.width * 0.3]]
  ud.sound ??= ud.length > 5.5 ? 'tank' : ud.length > 3 ? 'car' : 'bike'
  if (ud.rider) {
    const cop = bakedOfficer()
    cop.position.set(ud.rider.x, ud.rider.y, ud.rider.z)
    cop.rotation.z = ud.rider.rz
    out.add(cop)
    ud.officer = cop
  }
  ud.dynamic = true
  out.userData = ud
  return out
}

// Shared parts for the zone fleet (fleet.js).
export { RED, BLUE, WHITE_LAMP, TAIL, AMBER, GLOW, startFlashing, tyre, metal, paint, glassMat, livery, decals, wheel, lightBar, carFittings, mirrors, driver, underglow, trimHex }
