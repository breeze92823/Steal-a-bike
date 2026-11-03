import { BoxGeometry, CatmullRomCurve3, RepeatWrapping, TubeGeometry, Vector3 } from 'three'
import { LANE, LAYOUT, PALETTE } from './config.js'
import { bake } from './bake.js'
import { neon, put, solidBox } from './propkit.js'
import { mulberry32, paintWaterfall, toTexture } from './textures.js'
import { plain, sbox, studMat, voxelTree } from './kit.js'
import { BROWN_CLIFF, terraceWall } from './lobby.js'
import { motes, onFrame, sparkles } from './fx.js'
import { addWaterfall } from './audio.js'
import { fleetVehicle } from './fleet.js'
import { bayBike } from './zones.js'
import { floor, ICE, place, postSign, puddle, sleepingGuard, snowChunk, snowyPine, SOUTH } from './lanekit.js'

// Zone 4: a snow basin walled in by ice. Tall light-blue ice cliffs with snow
// caps and snowy pines run up both sides; across the north end an ice wall
// with a gap in the middle (the way on to zone 5), a waterfall pouring down
// each side of the gap onto snow ledges, and a chunky white arch over it.
// Icy puddles and snow lumps on the floor, snowflakes in the air, and the
// guard asleep in an armoured police truck with three bikes and a
// "20K Recommended" sign. Zone 5 starts past the gate (zones.js).
const L = LAYOUT
const Z = LANE.zone4
const G = LANE.gate
const hw = L.valley.halfWidth
const ICE_CLIFF = { main: '#8ccbf0', alt: '#9cd5f6', panel: '#a4dbf8', top: '#f2faff', band: null, ledge: null, leaves: ['#3db3c4', '#f2fbff', '#e6f6ff'], windows: false }

// One half of the gate wall (side -1 west, +1 east): steps up outward from the gap.
function gateWall(root, side, fall, y) {
  const ice = studMat(ICE_CLIFF.main, { alt: ICE_CLIFF.alt, checker: 3 })
  const snow = studMat('#f2faff')
  const inner = G.halfWidth
  const outer = hw + 14
  const face = Z.endZ
  const zc = face - G.depth / 2
  const H = G.height
  const rand = mulberry32(side > 0 ? 61 : 67)
  for (const [a, b, h] of [[inner, inner + 5, H], [inner + 5, inner + 10, H + 3], [inner + 10, outer, H + 6]]) {
    const x = side * (a + b) / 2
    sbox(root, b - a, h, G.depth, null, x, y, zc, { mat: ice })
    sbox(root, b - a + 0.6, 1.2, G.depth + 0.6, null, x, y + h, zc, { mat: snow })
    for (let p = a + 0.4; p < b - 0.6; p += 0.9 + rand() * 1.4) {
      const dh = 0.5 + rand() * 1.6
      sbox(root, 0.8 + rand() * 0.8, dh, 0.5, null, side * p, y + h - dh + 0.2, face + 0.2, { mat: snow })
    }
    for (let p = a + 2.5; p < b - 1.5; p += 4.5 + rand() * 3) {
      const pine = snowyPine(0.9 + rand() * 0.4, Math.floor(rand() * 999))
      pine.position.set(side * p, y + h + 1.2, zc + (rand() - 0.5) * 6)
      root.add(bake(pine, true))
    }
  }
  const tree = voxelTree(PALETTE.leavesGreen, 1.05, side > 0 ? 71 : 73)
  tree.position.set(side * (inner + 2.5), y + H + 1.2, face - 4)
  root.add(bake(tree, true))
  // The waterfall at the gap's edge, the snow ledge it lands on, foam and mist.
  const fx = side * (inner + 2.5)
  put(root, new BoxGeometry(5, H + 0.8, 2.4), neon('#e6fbff', 1.25, { map: fall }), fx, y + (H + 0.8) / 2, face + 0.9, false)
  sbox(root, 6.5, 0.8, 3.4, null, fx, y, face + 2.2, { mat: snow })
  const foam = plain('#ffffff', { roughness: 0.6, emissive: '#dff6ff', emissiveIntensity: 0.4 })
  for (let i = 0; i < 5; i++) put(root, new BoxGeometry(0.8 + rand() * 0.9, 0.4 + rand() * 0.4, 0.8 + rand() * 0.6), foam, fx + (rand() - 0.5) * 4.4, y + 0.95, face + 2.6 + rand() * 0.8, false)
  addWaterfall(fx, y + 4, face + 1)
  sparkles(root, fx, y + 0.8, face + 2.8, { count: 22, radius: 2.2, height: 2.8, color: '#ffffff', size: 0.7, speed: 0.7, soft: true, bright: 1.4, seed: side > 0 ? 5 : 6 })
  solidBox((outer - inner) / 2, H / 2 + 3, G.depth / 2, side * (inner + outer) / 2, y + H / 2 + 3, zc)
  solidBox(3.25, 0.4, 1.7, fx, y + 0.4, face + 2.2)
}

// The chunky white arch over the gap: a flattened half-ellipse, square in section.
function arch(root, y) {
  const r = G.halfWidth + 2.5
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI
    pts.push(new Vector3(Math.cos(t) * r, Math.sin(t) * G.archRise, 0))
  }
  const geo = new TubeGeometry(new CatmullRomCurve3(pts), 64, 1.5, 4)
  put(root, geo, plain('#f4f8ff', { roughness: 0.55, emissive: '#e8f2ff', emissiveIntensity: 0.2 }), 0, y + G.height + 0.6, Z.endZ + 0.9)
}

function truckPost(root, x0, z0, y) {
  const yaw = SOUTH + 0.1
  const collider = solidBox(3.0, 1.5, 1.15, x0, y + 1.5, z0 - 1.5, yaw)
  const guard = sleepingGuard(root, fleetVehicle('riotTruck'), x0, y, z0 - 1.5, yaw, { tier: 3, zzzAt: [x0 + 0.3, y + 5.2, z0 - 1.2], phase: 1.7, collider })
  const rand = mulberry32(441)
  bayBike(root, 'Frost Bite', x0 - 3.4, y, z0 + 3.0, SOUTH - 0.5, rand, guard)
  bayBike(root, 'Glacier GT', x0 - 0.6, y, z0 + 4.2, SOUTH + 0.1, rand, guard)
  bayBike(root, 'Snow Vispo', x0 + 2.8, y, z0 + 3.4, SOUTH + 0.3, rand, guard, { bayW: 1.6, bayD: 0.95 })
  place(root, postSign(Z.recommended), x0 + 4.8, y, z0 + 0.8, -0.4)
}

export function buildZone4(root) {
  const south = LANE.zone3.endZ
  const y = Z.y
  const gateEnd = Z.endZ - G.depth
  const rand = mulberry32(404)
  floor(root, south, gateEnd, '#c9e4f6', y, { lip: '#b4d6ee' })
  // Icy puddles and lumps of snow.
  for (const [x, z, w, d, s] of [[14, -163, 7, 2.6, 41], [-12, -140, 5, 2.2, 43], [6, -150, 4, 2, 47]]) puddle(root, x, z, w, d, s, { y, look: ICE })
  for (let i = 0; i < 14; i++) {
    const x = (rand() - 0.5) * (hw * 2 - 4)
    const z = south - 3 - rand() * (south - Z.endZ - 6)
    if (Math.hypot(x - Z.post[0], z - Z.post[1]) < 7) continue
    snowChunk(root, x, y, z, 0.7 + rand() * 1.1, i + 5)
  }
  // Ice cliffs up both sides, the gate wall, waterfalls and the arch.
  for (const s of [-1, 1]) terraceWall(root, { axis: 'z', at: s * hw, from: gateEnd, to: south, out: s, theme: ICE_CLIFF, height: L.valley.cliffHeight, seed: s < 0 ? 61 : 63 })
  const fall = toTexture(paintWaterfall(), { srgb: true })
  fall.wrapS = fall.wrapT = RepeatWrapping
  fall.repeat.set(1, 2)
  onFrame((dt) => (fall.offset.y += dt * 0.8))
  gateWall(root, -1, fall, y)
  gateWall(root, 1, fall, y)
  arch(root, y)
  truckPost(root, ...Z.post, y)
  motes(root, { x0: -hw + 2, x1: hw - 2, y0: y + 0.5, y1: y + 9, z0: Z.endZ, z1: south, count: 70, colors: ['#ffffff', '#e6f8ff'], size: 0.2, seed: 44 })

}
