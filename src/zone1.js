import { LANE, LAYOUT, PALETTE } from './config.js'
import { mulberry32 } from './textures.js'
import { bicycle } from './kit.js'
import { BROWN_CLIFF, terraceWall } from './lobby.js'
import { motes } from './fx.js'
import { guardVehicle } from './police.js'
import { clump, floor, patch, puddle, sleepingGuard, SOUTH, stealBay } from './lanekit.js'

// Zone 1 of the north lane: the grass from the SAFE ZONE line to the step up
// onto zone 2, between brown cliffs. A big lily-pad puddle on the left, a guard
// asleep on his police motorbike by three bicycles on the right, stepped grass
// clumps and specks of light in the air. Steal a BMX and he wakes up and chases you on the bike (heist.js).
const L = LAYOUT
const Z = LANE.zone1
const hw = L.valley.halfWidth

function motoPost(root, x0, z0) {
  const guard = sleepingGuard(root, guardVehicle('policeBike', 0), x0, 0, z0 - 1.2, SOUTH, { tier: 0, zzzAt: [x0 + 0.1, 3.2, z0 - 1.1], bay: [2.6, 1.4] })
  const bmx = () => bicycle('#e3242b', '#1c1c22', { basket: false, saddle: '#24242c' })
  stealBay(root, bmx, x0 - 2.8, 0, z0 + 0.6, SOUTH + 0.5, { name: 'BMX', guard, value: 120 })
  stealBay(root, bmx, x0 + 0.4, 0, z0 + 1.8, SOUTH, { name: 'BMX', guard, value: 120 })
  stealBay(root, bmx, x0 + 3.2, 0, z0 + 0.3, 0.15, { name: 'BMX', guard, value: 120 })
}

export function buildZone1(root) {
  const south = L.safeZoneZ
  const rand = mulberry32(99)
  floor(root, south, Z.endZ, PALETTE.grass)
  for (let i = 0; i < 8; i++) {
    const w = 5 + rand() * 9
    const d = 4 + rand() * 8
    patch(root, (rand() - 0.5) * (hw * 2 - w), south - 4 - rand() * (south - Z.endZ - 8), w, d, '#6cde44')
  }
  puddle(root, -12.5, -24, 9.5, 4, 3)
  const [px, pz] = Z.post
  for (let i = 0; i < 18; i++) {
    const edge = rand() < 0.4
    const x = edge ? (rand() < 0.5 ? -1 : 1) * (hw - 1.2 - rand() * 3) : (rand() - 0.5) * (hw * 2 - 4)
    const z = south - 2.5 - rand() * (south - Z.endZ - 4)
    if (Math.hypot(x - px, z - pz) < 6 || (Math.abs(x + 12.5) < 6 && Math.abs(z + 24) < 3)) continue
    clump(root, x, 0, z, rand() * Math.PI, edge ? 1.1 + rand() * 0.5 : 0.75 + rand() * 0.45, rand() < 0.3)
  }
  for (const s of [-1, 1]) terraceWall(root, { axis: 'z', at: s * hw, from: Z.endZ, to: L.northZ, out: s, theme: BROWN_CLIFF, height: L.valley.cliffHeight, seed: s < 0 ? 21 : 23 })
  motoPost(root, ...Z.post)
  motes(root, { x0: -hw + 2, x1: hw - 2, y0: 0.4, y1: 7, z0: Z.endZ, z1: south - 1, count: 50 })
}
