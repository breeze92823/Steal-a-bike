import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, TorusGeometry } from 'three'
import { neon, put } from './propkit.js'
import { canvasTexture, motorbike, plain, sbox, tube } from './kit.js'
import { bake } from './bake.js'

// The guards' rides in the north lane and the people asleep on them: police
// car, SWAT van, police motorbike, scooters, the sleeping officer, and the
// dashed parking bays everything stands in. Same convention as kit.js bikes:
// length along X, front at +X, standing on y = 0.

const tireMat = () => plain('#17181d', { roughness: 0.9 })
const glass = () => new MeshStandardMaterial({ color: '#1d2740', roughness: 0.15, metalness: 0.3 })

function wheels(g, xs, z, r, w, rim = '#c9d0da') {
  const rimM = plain(rim, { roughness: 0.35, metalness: 0.5 })
  for (const x of xs) {
    for (const s of [-1, 1]) {
      const t = put(g, new CylinderGeometry(r, r, w, 18), tireMat(), x, r, s * z)
      t.rotation.x = Math.PI / 2
      const h = put(g, new CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12), rimM, x, r, s * z, false)
      h.rotation.x = Math.PI / 2
    }
  }
}

// Red + blue light bar on a roof at height y.
function lightBar(g, x, y, width) {
  put(g, new BoxGeometry(0.4, 0.12, width), plain('#202430'), x, y + 0.06, 0)
  put(g, new BoxGeometry(0.34, 0.2, width * 0.45), neon('#ff2a3a', 3), x, y + 0.2, -width * 0.25, false)
  put(g, new BoxGeometry(0.34, 0.2, width * 0.45), neon('#2a6dff', 4), x, y + 0.2, width * 0.25, false)
}

// "POLICE" on both doors (a plane each side, z = half the body width).
let policeTex = null
function doorText(g, text, x, y, z, w, h) {
  policeTex ??= canvasTexture(256, 64, (ctx, cw, ch) => {
    ctx.fillStyle = '#16204a'
    ctx.font = '900 46px "Arial Black", Fredoka, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, cw / 2, ch / 2 + 2)
  })
  const mat = new MeshBasicMaterial({ map: policeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })
  mat.color.setScalar(0.9)
  for (const s of [-1, 1]) {
    const m = put(g, new PlaneGeometry(w, h), mat, x, y, s * z, false)
    m.rotation.y = s < 0 ? Math.PI : 0
  }
}

// White patrol SUV with a black skirt and bull bar.
export function policeCar(body = '#f4f6fb') {
  const g = new Group()
  const trim = '#1b1d26'
  sbox(g, 4.5, 0.5, 2.1, trim, 0, 0.32, 0, { studs: false })
  sbox(g, 4.5, 0.62, 2.12, body, 0, 0.8, 0, { studs: false })
  sbox(g, 2.7, 0.92, 2.0, body, -0.45, 1.42, 0, { studs: false })
  const gm = glass()
  const ws = put(g, new BoxGeometry(0.08, 0.78, 1.84), gm, 0.94, 1.86, 0, false)
  ws.rotation.z = 0.32
  put(g, new BoxGeometry(2.2, 0.56, 2.04), gm, -0.55, 1.88, 0, false) // side windows
  put(g, new BoxGeometry(0.06, 0.56, 1.8), gm, -1.81, 1.88, 0, false)
  sbox(g, 2.1, 0.1, 1.96, body, -0.45, 2.34, 0, { studs: false })
  put(g, new BoxGeometry(0.16, 0.5, 1.9), plain(trim), 2.3, 0.62, 0) // bull bar
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.05, 0.16, 0.36), neon('#ffffff', 2.4), 2.26, 0.92, s * 0.7, false)
  doorText(g, 'POLICE', 0, 0.85, 1.07, 1.6, 0.36)
  lightBar(g, -0.4, 2.44, 1.5)
  wheels(g, [-1.45, 1.45], 0.92, 0.46, 0.34)
  return g
}

// The big navy SWAT van with a white band and a push bar.
export function swatVan() {
  const g = new Group()
  const navy = '#1f2654'
  sbox(g, 5.2, 0.5, 2.4, '#14151b', 0, 0.45, 0, { studs: false })
  sbox(g, 5.2, 1.0, 2.42, navy, 0, 0.9, 0, { studs: false })
  sbox(g, 4.0, 1.25, 2.36, navy, -0.6, 1.9, 0, { studs: false })
  put(g, new BoxGeometry(5.22, 0.22, 2.44), plain('#f2f4fa'), 0, 1.55, 0)
  const gm = glass()
  const ws = put(g, new BoxGeometry(0.08, 0.95, 2.1), gm, 1.45, 2.45, 0, false)
  ws.rotation.z = 0.25
  put(g, new BoxGeometry(1.2, 0.6, 2.4), gm, 0.7, 2.55, 0, false)
  put(g, new BoxGeometry(0.2, 0.9, 2.5), plain('#101116'), 2.65, 0.85, 0) // push bar
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.05, 0.2, 0.4), neon('#ffffff', 2.4), 2.61, 1.5, s * 0.8, false)
  lightBar(g, -0.4, 3.15, 1.9)
  wheels(g, [-1.7, 1.7], 1.06, 0.6, 0.42, '#3a3f4c')
  return g
}

// Police motorbike: white tourer with a big fairing, black panniers, red/blue lights.
export function policeMoto() {
  const g = motorbike('#f4f6fb', '#1b1d26', '#cfd6e0')
  const white = new MeshStandardMaterial({ color: '#f4f6fb', roughness: 0.3, metalness: 0.2 })
  put(g, new BoxGeometry(0.4, 0.62, 0.72), white, 0.66, 1.0, 0) // fairing
  const ws = put(g, new BoxGeometry(0.06, 0.42, 0.62), new MeshStandardMaterial({ color: '#9fc8ff', transparent: true, opacity: 0.5, roughness: 0.1 }), 0.82, 1.45, 0, false)
  ws.rotation.z = -0.35
  put(g, new BoxGeometry(0.06, 0.18, 0.3), neon('#ffffff', 2.4), 0.87, 1.02, 0, false)
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.62, 0.5, 0.26), plain('#1b1d26', { roughness: 0.5 }), -0.55, 0.78, s * 0.36) // panniers
    put(g, new BoxGeometry(0.12, 0.12, 0.12), neon(s < 0 ? '#ff2a3a' : '#2a6dff', 3.5), 0.72, 1.36, s * 0.4, false)
    tube(g, [0.62, 1.32, s * 0.3], [0.62, 1.5, s * 0.46], 0.02, plain('#1b1d26'))
  }
  return g
}

// Vespa-style scooter; `box` adds a top box on a rack behind the seat (courier), `crate` a wooden crate.
export function scooter(body = '#86e3d6', { box = null, crate = false } = {}) {
  const g = new Group()
  const bm = new MeshStandardMaterial({ color: body, roughness: 0.3, metalness: 0.1 })
  for (const x of [-0.52, 0.52]) {
    put(g, new TorusGeometry(0.19, 0.08, 8, 18), tireMat(), x, 0.27, 0)
    const h = put(g, new CylinderGeometry(0.12, 0.12, 0.1, 10), plain('#d9dee6', { metalness: 0.5, roughness: 0.3 }), x, 0.27, 0, false)
    h.rotation.x = Math.PI / 2
  }
  put(g, new BoxGeometry(0.62, 0.1, 0.38), plain('#3a3f4c'), 0.05, 0.36, 0)
  put(g, new BoxGeometry(0.66, 0.46, 0.5), bm, -0.36, 0.6, 0)
  put(g, new BoxGeometry(0.5, 0.12, 0.34), plain('#f4f2ea', { roughness: 0.6 }), -0.34, 0.88, 0) // seat
  const shield = put(g, new BoxGeometry(0.14, 0.78, 0.44), bm, 0.42, 0.74, 0)
  shield.rotation.z = -0.18
  put(g, new BoxGeometry(0.36, 0.12, 0.26), bm, 0.52, 0.5, 0) // front fender
  tube(g, [0.5, 1.05, 0], [0.56, 1.22, 0], 0.035, plain('#c9d0da', { metalness: 0.5 }))
  put(g, new BoxGeometry(0.16, 0.12, 0.56), bm, 0.56, 1.25, 0) // handlebar
  put(g, new BoxGeometry(0.05, 0.1, 0.12), neon('#ffffff', 2.2), 0.65, 1.25, 0, false)
  put(g, new BoxGeometry(0.04, 0.06, 0.16), neon('#ff1a2a', 1.8), -0.7, 0.66, 0, false) // tail lamp
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.12, 0.05, 0.08), plain('#c9d0da', { metalness: 0.5 }), 0.62, 1.32, s * 0.2) // mirrors
  if (box || crate) put(g, new BoxGeometry(0.34, 0.04, 0.34), plain('#2a2d36'), -0.62, 0.92, 0) // rack
  if (box) {
    const bx = plain(box, { roughness: 0.5 })
    put(g, new BoxGeometry(0.44, 0.36, 0.44), bx, -0.64, 1.12, 0)
    put(g, new BoxGeometry(0.46, 0.06, 0.46), plain('#f4f2ea', { roughness: 0.5 }), -0.64, 1.31, 0) // lid
    put(g, new BoxGeometry(0.02, 0.1, 0.2), neon('#ff1a2a', 1.6), -0.87, 1.12, 0, false)
  }
  if (crate) {
    const wood = plain('#8a5a2c', { roughness: 0.85 })
    put(g, new BoxGeometry(0.42, 0.28, 0.42), wood, -0.62, 1.08, 0)
    for (const y of [0.98, 1.16]) put(g, new BoxGeometry(0.44, 0.03, 0.44), plain('#6a4220', { roughness: 0.85 }), -0.62, y, 0)
  }
  return g
}

// Sleeping officer, seated facing +X: light-blue shirt, navy trousers and cap,
// grey stubble, head nodded forward. Origin at the seat.
export function officer() {
  const g = new Group()
  const shirt = '#4aa6ec'
  const pants = '#22305e'
  const skin = '#f0c497'
  // Thighs forward, shins down.
  for (const s of [-1, 1]) {
    sbox(g, 0.62, 0.3, 0.26, pants, 0.18, 0, s * 0.15, { studs: false })
    sbox(g, 0.26, 0.6, 0.26, pants, 0.44, -0.55, s * 0.18, { studs: false })
    sbox(g, 0.32, 0.12, 0.26, '#15151b', 0.48, -0.62, s * 0.18, { studs: false })
  }
  const torso = sbox(g, 0.4, 0.72, 0.64, shirt, -0.04, 0.26, 0, { studs: false })
  torso.rotation.z = -0.12
  put(g, new BoxGeometry(0.06, 0.08, 0.1), plain('#ffd24a', { metalness: 0.5, roughness: 0.3 }), 0.17, 0.82, -0.16, false) // badge
  for (const s of [-1, 1]) {
    const arm = sbox(g, 0.62, 0.24, 0.22, shirt, 0.22, 0.66, s * 0.44, { studs: false })
    arm.rotation.z = -0.5
    sbox(g, 0.18, 0.18, 0.18, skin, 0.5, 0.42, s * 0.44, { studs: false })
  }
  const head = new Group()
  head.position.set(0.02, 1.0, 0)
  head.rotation.z = -0.38 // nodded off
  sbox(head, 0.48, 0.48, 0.48, skin, 0, 0, 0, { studs: false })
  sbox(head, 0.06, 0.2, 0.42, '#9aa0aa', 0.23, 0.02, 0, { studs: false }) // stubble
  put(head, new BoxGeometry(0.04, 0.05, 0.1), plain('#1a1a20'), 0.25, 0.3, -0.1, false)
  put(head, new BoxGeometry(0.04, 0.05, 0.1), plain('#1a1a20'), 0.25, 0.3, 0.1, false)
  sbox(head, 0.54, 0.2, 0.54, '#1b2a6a', 0, 0.46, 0, { studs: false }) // cap
  sbox(head, 0.22, 0.05, 0.5, '#111a44', 0.33, 0.44, 0, { studs: false }) // brim
  put(head, new BoxGeometry(0.03, 0.1, 0.1), plain('#f2f2f2'), 0.275, 0.56, 0, false)
  g.add(head)
  g.userData.head = head
  return g
}

// The officer baked to two meshes groups: body, and the head (userData.head)
// on its neck pivot so it can lift when he wakes (rotation.z 0 = awake).
export function bakedOfficer() {
  const o = officer()
  const head = o.userData.head
  o.remove(head)
  const body = bake(o, true)
  const h = bake(head, true)
  body.add(h)
  body.userData.head = h
  return body
}

// Dashed white parking bay, w along X by d along Z, flat on the ground.
const bayCache = new Map()
export function parkingBay(w = 1.8, d = 1.1) {
  const key = `${w}|${d}`
  let mat = bayCache.get(key)
  if (!mat) {
    const px = 64
    const tex = canvasTexture(Math.round(w * px), Math.round(d * px), (ctx, cw, ch) => {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 6
      ctx.setLineDash([16, 10])
      ctx.strokeRect(4, 4, cw - 8, ch - 8)
    })
    mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    mat.color.setScalar(0.92)
    bayCache.set(key, mat)
  }
  const m = new Mesh(new PlaneGeometry(w, d), mat)
  m.position.y = 0.04
  m.rotation.x = -Math.PI / 2
  return m
}

// The snow zone's armoured police truck: white, six wheels, navy window band,
// POLICE on the sides, a light bar and a blue siren dome on the roof.
export function armoredTruck() {
  const g = new Group()
  const white = '#f2f4fa'
  sbox(g, 5.6, 0.6, 2.5, '#1b1d26', 0, 0.7, 0, { studs: false })
  sbox(g, 5.6, 1.3, 2.6, white, 0, 1.2, 0, { studs: false })
  sbox(g, 3.6, 1.3, 2.5, white, -0.8, 2.5, 0, { studs: false })
  put(g, new BoxGeometry(3.4, 0.62, 2.54), plain('#1f2b5c'), -0.75, 3.05, 0) // navy band round the windows
  const gm = glass()
  const ws = put(g, new BoxGeometry(0.1, 0.9, 2.2), gm, 1.05, 3.0, 0, false)
  ws.rotation.z = 0.28
  put(g, new BoxGeometry(0.3, 0.6, 2.7), plain('#15161c'), 2.85, 0.95, 0) // bumper
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.05, 0.22, 0.42), neon('#ffffff', 2.4), 2.82, 1.6, s * 0.85, false)
  put(g, new BoxGeometry(0.06, 0.5, 1.8), plain('#1b1d26'), 2.81, 1.35, 0) // grille
  doorText(g, 'POLICE', -0.2, 1.7, 1.31, 1.9, 0.42)
  lightBar(g, -0.4, 3.8, 2.0)
  tube(g, [-1.6, 3.8, 0], [-1.6, 4.3, 0], 0.05, plain('#8a93a6'))
  put(g, new CylinderGeometry(0.28, 0.32, 0.36, 12), neon('#3a8cff', 3), -1.6, 4.45, 0, false)
  wheels(g, [-1.9, 0, 1.9], 1.18, 0.62, 0.46, '#d9dee6')
  return g
}
