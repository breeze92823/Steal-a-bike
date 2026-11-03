import { LANE, LAYOUT } from './config.js'
import { mulberry32 } from './textures.js'
import { BROWN_CLIFF, terraceWall } from './lobby.js'
import { solidBox } from './propkit.js'
import { fleetVehicle } from './fleet.js'
import { bayBike } from './zones.js'
import { cactus, floor, patch, place, postSign, sleepingGuard, SOUTH } from './lanekit.js'

// Zone 3: the sand, back down off zone 2's plateau. The cliffs here have
// yellow tops instead of grass, lego cacti stand on sand blocks along both
// walls, and the guard post is the navy S.W.A.T. truck with three of the
// Desert's Index bikes (tagged) and a "4K Recommended" sign.
const L = LAYOUT
const Z = LANE.zone3
const hw = L.valley.halfWidth
const SAND_CLIFF = { ...BROWN_CLIFF, top: '#cdc92e', band: null }

function swatPost(root, x0, z0, y) {
  const yaw = SOUTH - 0.2
  const collider = solidBox(2.9, 1.4, 1.1, x0 - 1, y + 1.4, z0 - 2, yaw)
  const guard = sleepingGuard(root, fleetVehicle('swatArmor'), x0 - 1, y, z0 - 2, yaw, { tier: 2, zzzAt: [x0 - 0.8, y + 4.8, z0 - 1.8], phase: 1.1, collider })
  const rand = mulberry32(331)
  bayBike(root, 'Dune Racer', x0 - 2.8, y, z0 + 3.4, SOUTH - 0.4, rand, guard)
  bayBike(root, 'Sand Viper', x0 + 1.0, y, z0 + 4.2, SOUTH + 0.15, rand, guard)
  bayBike(root, 'Desert Fox', x0 + 3.4, y, z0 + 2.0, Math.PI + 0.35, rand, guard)
  place(root, postSign(Z.recommended), x0 + 1.6, y, z0 + 1.2, -0.35)
}

export function buildZone3(root) {
  const south = LANE.zone2.endZ
  const y = Z.y
  const rand = mulberry32(303)
  floor(root, south, Z.endZ, '#c2b52c', y)
  for (let i = 0; i < 9; i++) {
    const w = 4 + rand() * 9
    const d = 3 + rand() * 6
    patch(root, (rand() - 0.5) * (hw * 2 - w), south - 3 - rand() * (south - Z.endZ - 6), w, d, '#cec23a', y)
  }
  // Cacti along both walls (and one by the post).
  for (const [x, z, h] of [[-22, -92, 2.2], [-19.5, -97, 1.6], [-22.5, -103, 2.6], [-20, -110, 1.9], [-22, -118, 2.3], [-19, -124, 1.7],
    [21, -93, 2.0], [23, -99, 2.6], [22, -120, 1.8], [19, -125, 2.2], [18.5, -108, 2.4]]) cactus(root, x, y, z, h, (x * 7 + z) | 0)
  for (const s of [-1, 1]) terraceWall(root, { axis: 'z', at: s * hw, from: Z.endZ, to: south, out: s, theme: SAND_CLIFF, height: L.valley.cliffHeight, seed: s < 0 ? 51 : 53, trees: false })
  swatPost(root, ...Z.post, y)
}
