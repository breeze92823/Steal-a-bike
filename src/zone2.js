import { LANE, LAYOUT, PALETTE } from './config.js'
import { mulberry32 } from './textures.js'
import { BROWN_CLIFF, terraceWall } from './lobby.js'
import { motes, zzz } from './fx.js'
import { addSnore } from './audio.js'
import { policeCar, scooter } from './vehicles.js'
import { clump, floor, parked, patch, place, postSign, puddle, SOUTH } from './lanekit.js'

// Zone 2: a raised grass plateau (you step up onto it from zone 1; its darker
// edge is the step). A guard asleep in his patrol car with three mint scooters
// beside it and a "600 Recommended" sign, a lily-pad puddle on the right, and
// yellow and green flecks drifting in the air.
const L = LAYOUT
const Z = LANE.zone2
const hw = L.valley.halfWidth

function carPost(root, x0, z0, y) {
  place(root, policeCar(), x0 + 1, y, z0 - 0.5, SOUTH + 0.45)
  zzz(root, x0 + 1.2, y + 3.3, z0 - 0.4, 0.6)
  addSnore(x0, 1, z0)
  parked(root, scooter('#86e3d6'), x0 - 3.2, y, z0 + 1.6, Math.PI + 0.35, 1.6, 0.95)
  parked(root, scooter('#9cebe0'), x0 - 1.2, y, z0 + 2.4, SOUTH - 0.25, 1.6, 0.95)
  parked(root, scooter('#86e3d6'), x0 + 3.4, y, z0 + 1.8, SOUTH + 0.2, 1.6, 0.95)
  place(root, postSign(Z.recommended), x0 + 5.6, y, z0 + 0.4, -0.5)
}

export function buildZone2(root) {
  const south = LANE.zone1.endZ
  const y = Z.y
  const rand = mulberry32(202)
  floor(root, south, Z.endZ, PALETTE.grass, y, { lip: '#3c9f2a' })
  for (let i = 0; i < 6; i++) {
    const w = 6 + rand() * 9
    const d = 4 + rand() * 6
    patch(root, (rand() - 0.5) * (hw * 2 - w), south - 4 - rand() * (south - Z.endZ - 8), w, d, '#6cde44', y)
  }
  puddle(root, 12, -62, 8, 3, 5, { y })
  const [px, pz] = Z.post
  for (let i = 0; i < 16; i++) {
    const edge = rand() < 0.45
    const x = edge ? (rand() < 0.5 ? -1 : 1) * (hw - 1.2 - rand() * 3) : (rand() - 0.5) * (hw * 2 - 4)
    const z = south - 2 - rand() * (south - Z.endZ - 4)
    if (Math.hypot(x - px, z - pz) < 7 || (Math.abs(x - 12) < 5 && Math.abs(z + 62) < 2.5)) continue
    clump(root, x, y, z, rand() * Math.PI, edge ? 1.1 + rand() * 0.6 : 0.75 + rand() * 0.45, rand() < 0.3)
  }
  for (const s of [-1, 1]) terraceWall(root, { axis: 'z', at: s * hw, from: Z.endZ, to: south, out: s, theme: BROWN_CLIFF, height: L.valley.cliffHeight, seed: s < 0 ? 41 : 43 })
  carPost(root, px, pz, y)
  motes(root, { x0: -hw + 2, x1: hw - 2, y0: y + 0.6, y1: y + 8, z0: Z.endZ, z1: south, count: 70, colors: ['#ffe14a', '#ffd21a', '#8be03a'], size: 0.24, bright: 1.4, seed: 22 })
}
