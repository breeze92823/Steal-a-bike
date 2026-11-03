// The equipped trail drawn in the world: a ribbon of coloured bands laid behind a player as they
// move (yours from main.js, every other player's from remotePlayers.js via the roster `trail` id).
// One small dynamic strip per player, rewritten each frame; it fades and narrows with age.
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh, MeshBasicMaterial } from 'three'
import { TRAILS, TRAIL_FX } from './config.js'

const COLORS = new Map() // trail id -> { cols: Color[], spec }
function palette(id) {
  let p = COLORS.get(id)
  if (p === undefined) {
    const spec = TRAILS.find((t) => t.id === id)
    p = spec ? { spec, cols: (spec.angel ? ['#ffffff', '#fff3c4', '#ffd45a'] : spec.ribbon).map((c) => new Color(c)) } : null
    COLORS.set(id, p)
  }
  return p
}

export function createTrail(scene) {
  const N = TRAIL_FX.samples
  const K = 5 // columns across the ribbon (3-colour trails interpolate)
  const px = new Float32Array(N)
  const py = new Float32Array(N)
  const pz = new Float32Array(N)
  const age = new Float32Array(N)
  let count = 0 // newest sample is index 0
  let t = 0
  let ax = 0 // where the last sample was dropped
  let az = 0

  const pos = new BufferAttribute(new Float32Array(N * K * 3), 3).setUsage(DynamicDrawUsage)
  const col = new BufferAttribute(new Float32Array(N * K * 4), 4).setUsage(DynamicDrawUsage)
  const index = []
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < K - 1; j++) {
      const a = i * K + j
      const b = a + 1
      const c = a + K
      const d = c + 1
      index.push(a, c, b, b, c, d)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', pos)
  geo.setAttribute('color', col)
  geo.setIndex(index)
  geo.setDrawRange(0, 0)
  const mat = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: 2, toneMapped: false, fog: false })
  const mesh = new Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = 2
  mesh.visible = false
  scene.add(mesh)

  const tmp = new Color()

  function clear() {
    count = 0
    geo.setDrawRange(0, 0)
    mesh.visible = false
  }

  // id: the equipped trail ('' = none); x/y/z: the player's feet; show: false drops it (far away).
  function update(dt, id, x, y, z, show = true) {
    const p = id && show ? palette(id) : null
    if (!p) return count && clear()
    t += dt
    for (let i = 0; i < count; i++) age[i] += dt
    while (count && age[count - 1] > TRAIL_FX.life) count--

    // A new sample once they have moved a little (a teleport or respawn starts a fresh ribbon).
    const moved = count ? Math.hypot(x - ax, z - az) : Infinity
    if (moved > TRAIL_FX.jump) count = 0
    if (!count || moved > TRAIL_FX.step) {
      ax = x
      az = z
      const n = Math.min(count, N - 1)
      px.copyWithin(1, 0, n)
      py.copyWithin(1, 0, n)
      pz.copyWithin(1, 0, n)
      age.copyWithin(1, 0, n)
      px[0] = x
      py[0] = y + TRAIL_FX.lift
      pz[0] = z
      age[0] = 0
      count = n + 1
    } else {
      px[0] = x // the head follows the player between samples
      py[0] = y + TRAIL_FX.lift
      pz[0] = z
    }
    if (count < 2) {
      geo.setDrawRange(0, 0)
      mesh.visible = false
      return
    }

    const { spec, cols } = p
    const P = pos.array
    const C = col.array
    const twinkle = spec.stars || spec.angel
    for (let i = 0; i < count; i++) {
      // Sideways = perpendicular to the path here.
      const a = Math.max(0, i - 1)
      const b = Math.min(count - 1, i + 1)
      let dx = px[a] - px[b]
      let dz = pz[a] - pz[b]
      const len = Math.hypot(dx, dz) || 1
      dx /= len
      dz /= len
      const life = age[i] / TRAIL_FX.life
      const w = TRAIL_FX.width * (1 - life * 0.7) * (i === 0 ? 0.3 : 1)
      const alpha = TRAIL_FX.alpha * (1 - life) * (1 - life * 0.3)
      for (let j = 0; j < K; j++) {
        const u = j / (K - 1)
        const o = (i * K + j) * 3
        const side = (u - 0.5) * w
        P[o] = px[i] - dz * side
        P[o + 1] = py[i]
        P[o + 2] = pz[i] + dx * side
        // Colour: rainbow has one band per colour; the rest blend light -> mid -> dark across.
        const f = u * (cols.length - 1)
        const c0 = cols[Math.floor(f)]
        const c1 = cols[Math.min(cols.length - 1, Math.floor(f) + 1)]
        tmp.copy(c0).lerp(c1, spec.rainbow ? 0 : f - Math.floor(f))
        const edge = 1 - Math.abs(u - 0.5) * 0.9 // softer toward the edges
        const sp = twinkle ? 0.75 + 0.5 * Math.sin(t * 9 + i * 1.7 + j * 2.3) : 1
        const k = (i * K + j) * 4
        C[k] = Math.min(1, tmp.r * sp * 1.15)
        C[k + 1] = Math.min(1, tmp.g * sp * 1.15)
        C[k + 2] = Math.min(1, tmp.b * sp * 1.15)
        C[k + 3] = alpha * edge
      }
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    geo.setDrawRange(0, (count - 1) * (K - 1) * 6)
    mesh.visible = true
  }

  function dispose() {
    scene.remove(mesh)
    geo.dispose()
    mat.dispose()
  }

  return { update, clear, dispose }
}
