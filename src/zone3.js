import { LANE, LAYOUT } from './config.js'
import { mulberry32 } from './textures.js'
import { motorbike } from './kit.js'
import { BROWN_CLIFF, terraceWall } from './lobby.js'
import { zzz } from './fx.js'
import { addSnore } from './audio.js'
import { swatVan } from './vehicles.js'
import { cactus, floor, parked, patch, place, postSign, SOUTH } from './lanekit.js'

// Zone 3: the sand, back down off zone 2's plateau. The cliffs here have
// yellow tops instead of grass, lego cacti stand on sand blocks along both
// walls, and the guard post is the navy SWAT van with three motorbikes and a
// "4K Recommended" sign.
const L = LAYOUT
const Z = LANE.zone3
const hw = L.valley.halfWidth
const SAND_CLIFF = { ...BROWN_CLIFF, top: '#cdc92e', band: null }

function swatPost(root, x0, z0, y) {
  place(root, swatVan(), x0 - 1, y, z0 - 2, SOUTH - 0.2)
  zzz(root, x0 - 0.8, y + 4.2, z0 - 1.8, 1.1)
  addSnore(x0, 1, z0)
  parked(root, motorbike('#ff8a1a', '#24242c', '#d9dee6'), x0 - 2.6, y, z0 + 2.6, SOUTH - 0.4, 2.0, 1.1)
  parked(root, motorbike('#c03ad8', '#2a1030', '#e0c6f0'), x0 + 1.4, y, z0 + 3.4, SOUTH + 0.15, 2.0, 1.1)
  parked(root, motorbike('#ff9a2a', '#1f4fd8', '#cfd6e0'), x0 + 3.2, y, z0 + 1.6, Math.PI + 0.35, 2.0, 1.1)
  place(root, postSign(Z.recommended), x0 + 0.8, y, z0 + 0.6, -0.35)
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
