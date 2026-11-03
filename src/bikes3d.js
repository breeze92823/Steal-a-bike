import { BoxGeometry, CylinderGeometry, Group, MeshStandardMaterial, TorusGeometry } from 'three'
import { neon, put } from './propkit.js'
import { bicycle, motorbike, plain, tube } from './kit.js'
import { scooter } from './vehicles.js'
import { bikeLook } from './bikeart.js'

// 3D bikes for the bays, by Bike Index name: the catalog says the kind and the
// colours (bikeart.bikeLook), this builds it. Kinds: bicycle, cargo, scooter,
// sport (kit motorbike), dirt (motocross: knobby spoked wheels, high fender,
// long forks) and cruiser (cafe racer: round lamp, long tank, flat seat).
// Kit convention: length along X, front at +X, wheels on y = 0.

const knobTyre = () => plain('#17181d', { roughness: 0.95 })
const chrome = () => plain('#dfe5ee', { roughness: 0.25, metalness: 0.7 })

// A spoked wheel: tyre (knobs on a dirt wheel), rim, spokes, hub, disc.
function spokeWheel(g, x, r, w, rimHex, knobs = false) {
  const y = r
  put(g, new TorusGeometry(r - w * 0.5, w * 0.5, 8, 26), knobTyre(), x, y, 0)
  if (knobs) {
    const k = plain('#101116', { roughness: 0.95 })
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      const b = put(g, new BoxGeometry(0.07, 0.05, w * 1.3), k, x + Math.cos(a) * r, y + Math.sin(a) * r, 0, false)
      b.rotation.z = a
    }
  }
  put(g, new TorusGeometry(r - w * 1.05, 0.025, 6, 26), plain(rimHex, { roughness: 0.3, metalness: 0.6 }), x, y, 0, false)
  const sp = plain('#d0d6de', { roughness: 0.3, metalness: 0.6 })
  for (let i = 0; i < 6; i++) put(g, new BoxGeometry((r - w) * 2, 0.012, 0.012), sp, x, y, 0, false).rotation.z = (i / 6) * Math.PI
  put(g, new CylinderGeometry(0.06, 0.06, w * 2.2, 10), plain('#8a93a6', { metalness: 0.5 }), x, y, 0, false).rotation.x = Math.PI / 2
  put(g, new CylinderGeometry(r * 0.32, r * 0.32, 0.015, 14), plain('#9aa3b2', { metalness: 0.6 }), x, y, w * 0.9, false).rotation.x = Math.PI / 2
}

export function dirtBike(body = '#ffd21a', accent = '#24242c', rim = '#c8ccd4') {
  const g = new Group()
  const bm = new MeshStandardMaterial({ color: body, roughness: 0.35, metalness: 0.15 })
  const am = plain(accent, { roughness: 0.5 })
  const XR = -0.7
  const XF = 0.78
  const R = 0.44
  spokeWheel(g, XR, R, 0.1, rim, true)
  spokeWheel(g, XF, R, 0.085, rim, true)
  // Swingarm, frame, engine with fins, the high exhaust.
  tube(g, [XR, R, 0.08], [-0.1, 0.6, 0.08], 0.035, plain('#3a3f4c', { metalness: 0.4 }))
  tube(g, [XR, R, -0.08], [-0.1, 0.6, -0.08], 0.035, plain('#3a3f4c', { metalness: 0.4 }))
  tube(g, [-0.1, 0.6, 0], [0.42, 1.08, 0], 0.04, am)
  put(g, new BoxGeometry(0.4, 0.34, 0.24), plain('#5a606e', { metalness: 0.4, roughness: 0.4 }), 0.05, 0.62, 0)
  for (let i = 0; i < 3; i++) put(g, new BoxGeometry(0.3, 0.025, 0.28), chrome(), 0.12, 0.72 + i * 0.06, 0, false)
  tube(g, [0.2, 0.6, 0.14], [-0.2, 0.86, 0.18], 0.035, chrome())
  const muff = put(g, new CylinderGeometry(0.06, 0.05, 0.5, 10), plain('#3a3f4c', { metalness: 0.5 }), -0.48, 0.98, 0.18)
  muff.rotation.z = Math.PI / 2 + 0.3
  // Long forks (gold lowers), the high front fender and number plate.
  for (const z of [-0.08, 0.08]) {
    tube(g, [XF, R, z], [0.62, 0.86, z], 0.032, plain('#ffd23a', { metalness: 0.6, roughness: 0.3 }))
    tube(g, [0.62, 0.86, z], [0.5, 1.2, z], 0.028, chrome())
  }
  const fend = put(g, new BoxGeometry(0.5, 0.04, 0.16), bm, XF + 0.06, 1.0, 0)
  fend.rotation.z = -0.25
  put(g, new BoxGeometry(0.05, 0.22, 0.26), bm, 0.6, 1.16, 0) // number plate
  // Tank, shrouds, the long flat seat sweeping into the tail.
  put(g, new BoxGeometry(0.46, 0.22, 0.32), bm, 0.26, 1.02, 0)
  for (const s of [-1, 1]) {
    const sh = put(g, new BoxGeometry(0.36, 0.26, 0.04), bm, 0.3, 0.92, s * 0.18)
    sh.rotation.z = -0.3
  }
  put(g, new BoxGeometry(0.8, 0.08, 0.24), am, -0.18, 1.1, 0)
  const tail = put(g, new BoxGeometry(0.5, 0.06, 0.18), bm, -0.62, 1.1, 0)
  tail.rotation.z = 0.25
  tube(g, [0.5, 1.24, -0.36], [0.5, 1.24, 0.36], 0.018, am) // wide bars
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.1, 0.05, 0.1), plain('#1a1c24'), 0.5, 1.24, s * 0.34)
  put(g, new BoxGeometry(0.03, 0.08, 0.12), neon('#ff1a2a', 1.6), -0.86, 1.12, 0, false)
  g.userData.kind = 'dirt'
  return g
}

export function cruiserBike(body = '#3fd8ff', accent = '#24242c', rim = '#c8ccd4') {
  const g = new Group()
  const bm = new MeshStandardMaterial({ color: body, roughness: 0.25, metalness: 0.3 })
  const am = plain(accent, { roughness: 0.5 })
  const XR = -0.72
  const XF = 0.8
  const R = 0.4
  spokeWheel(g, XR, R, 0.11, rim)
  spokeWheel(g, XF, R, 0.09, rim)
  tube(g, [XR, R, 0.1], [-0.1, 0.58, 0.1], 0.035, am)
  tube(g, [XR, R, -0.1], [-0.1, 0.58, -0.1], 0.035, am)
  // Twin-cylinder engine with fins, two upswept pipes.
  put(g, new BoxGeometry(0.42, 0.32, 0.3), plain('#4a505e', { metalness: 0.5, roughness: 0.35 }), 0.02, 0.6, 0)
  for (const s of [-1, 1]) {
    const cyl = put(g, new CylinderGeometry(0.09, 0.09, 0.3, 12), chrome(), 0.2, 0.82, s * 0.1)
    cyl.rotation.z = -0.3
    for (let i = 0; i < 3; i++) put(g, new CylinderGeometry(0.12, 0.12, 0.02, 12), chrome(), 0.17 + i * 0.03, 0.74 + i * 0.07, s * 0.1, false).rotation.z = -0.3
    tube(g, [0.24, 0.62, s * 0.16], [-0.6, 0.62, s * 0.24], 0.035, chrome())
    tube(g, [-0.6, 0.62, s * 0.24], [-0.95, 0.74, s * 0.24], 0.045, chrome())
  }
  for (const z of [-0.09, 0.09]) tube(g, [XF, R, z], [0.56, 1.06, z], 0.03, chrome())
  // Long tank with a stripe, flat seat with a hump, round headlamp, clip-ons.
  put(g, new BoxGeometry(0.62, 0.26, 0.34), bm, 0.18, 1.0, 0)
  put(g, new BoxGeometry(0.64, 0.05, 0.08), plain('#ffd23a', { roughness: 0.4 }), 0.18, 1.14, 0, false)
  put(g, new BoxGeometry(0.5, 0.1, 0.28), am, -0.32, 1.0, 0)
  put(g, new BoxGeometry(0.16, 0.16, 0.26), bm, -0.62, 1.04, 0)
  const fend = put(g, new BoxGeometry(0.36, 0.04, 0.14), bm, XF, 0.86, 0)
  fend.rotation.z = -0.2
  const lamp = put(g, new CylinderGeometry(0.12, 0.12, 0.12, 14), chrome(), 0.66, 1.08, 0)
  lamp.rotation.z = Math.PI / 2
  put(g, new CylinderGeometry(0.1, 0.1, 0.01, 14), neon('#ffffff', 2.2), 0.73, 1.08, 0, false).rotation.z = Math.PI / 2
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.06, 0.06, 0.24), am, 0.5, 1.14, s * 0.18)
  put(g, new BoxGeometry(0.03, 0.06, 0.12), neon('#ff1a2a', 1.6), -0.71, 1.04, 0, false)
  g.userData.kind = 'cruiser'
  return g
}

// The bay model for a catalog bike name.
export function bikeModel(name) {
  const b = bikeLook(name)
  switch (b.kind) {
    case 'bicycle':
      return bicycle(b.body, '#1c1c22', { basket: false, saddle: '#24242c' })
    case 'cargo':
      return scooter(b.body, { box: '#ff9a1a' })
    case 'scooter':
      return scooter(b.body)
    case 'dirt':
      return dirtBike(b.body, b.accent, b.rim)
    case 'cruiser':
      return cruiserBike(b.body, b.accent, b.rim)
    default:
      return motorbike(b.body, b.accent, b.rim)
  }
}
