import { Group, PlaneGeometry, ShaderMaterial } from 'three'
import { LANE, LAYOUT, PALETTE } from './config.js'
import { bake } from './bake.js'
import { put, solidBox } from './propkit.js'
import { mulberry32 } from './textures.js'
import { bicycle, liveLabel, sbox, studMat } from './kit.js'
import { BROWN_CLIFF, terraceWall } from './lobby.js'
import { motes, onFrame, sparkles, zzz } from './fx.js'
import { addSnore } from './audio.js'
import { eventStatus, mmss } from './timers.js'
import { officer, policeMoto } from './vehicles.js'
import { clump, floor, parked, patch, puddle, SOUTH } from './lanekit.js'

// Zone 1 of the north lane: the grass from the SAFE ZONE line to the step up
// onto zone 2, between brown cliffs. A big lily-pad puddle on the left, a guard
// asleep on his police motorbike by three bicycles on the right, stepped grass
// clumps, specks of light in the air, and the Halloween portal while the event
// is open.
const L = LAYOUT
const Z = LANE.zone1
const hw = L.valley.halfWidth

function motoPost(root, x0, z0) {
  const moto = policeMoto()
  const cop = officer()
  cop.position.set(-0.15, 1.1, 0)
  moto.add(cop)
  parked(root, moto, x0, 0, z0 - 1.2, SOUTH, 2.4, 1.3)
  zzz(root, x0 + 0.1, 3.1, z0 - 1.1, 0)
  addSnore(x0, 1, z0)
  parked(root, bicycle('#e3242b', '#1c1c22', { basket: false, saddle: '#24242c' }), x0 - 2.8, 0, z0 + 0.6, SOUTH + 0.5)
  parked(root, bicycle('#e3242b', '#1c1c22', { basket: false, saddle: '#24242c' }), x0 + 0.4, 0, z0 + 1.8, SOUTH)
  parked(root, bicycle('#bfe8ff', '#1c1c22', { basket: false, rack: true, saddle: '#24242c' }), x0 + 3.2, 0, z0 + 0.3, 0.15)
}

// --- Halloween portal -----------------------------------------------------------------------
const portalVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const portalFragment = /* glsl */ `
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.2);
    float r = length(p);
    float a = atan(p.y, p.x);
    float swirl = sin(a * 3.0 + r * 16.0 - time * 3.0) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.42, 0.08, 0.95), vec3(0.95, 0.55, 1.0), swirl * swirl);
    col *= 1.5 - r * 1.2;
    gl_FragColor = vec4(col * 1.9, 1.0);
  }`

// The Halloween portal gate (faces south) with its live OPEN sign. It is only
// there while the event is open; the HUD counts down to the next one.
function portal(root, x, z) {
  const g = new Group()
  const dark = studMat('#1d1630')
  const trim = studMat('#6a2ad8')
  sbox(g, 8, 0.5, 4, null, 0, 0, 0, { mat: trim })
  sbox(g, 7, 0.4, 3.2, null, 0, 0.5, 0, { mat: dark })
  for (const s of [-1, 1]) {
    sbox(g, 1.3, 6.6, 1.6, null, s * 3, 0.9, 0, { mat: dark })
    sbox(g, 0.3, 6.6, 0.3, null, s * 2.3, 0.9, 0.7, { mat: trim })
  }
  sbox(g, 7.6, 1.2, 1.8, null, 0, 7.5, 0, { mat: dark })
  sbox(g, 7.0, 0.3, 0.3, null, 0, 7.3, 0.9, { mat: trim })
  const mat = new ShaderMaterial({ uniforms: { time: { value: 0 } }, vertexShader: portalVertex, fragmentShader: portalFragment })
  put(g, new PlaneGeometry(4.6, 6.4), mat, 0, 4.1, 0, false)
  const gate = bake(g, true)
  gate.position.set(x, 0, z)
  gate.userData.dynamic = true
  root.add(gate)
  const fx = sparkles(root, x, 1, z + 0.6, { count: 30, radius: 2.4, height: 6.5, color: '#c27bff', size: 0.4, speed: 0.9 })
  const wall = solidBox(4, 4.3, 0.9, x, 4.3, z)
  const sign = liveLabel('HALLOWEEN\nOPEN\n03:42', 4.2, { colors: ['#ff9a1a', '#ff9a1a', '#ffffff'], outline: '#3a1600' })
  sign.sprite.position.set(x, 11, z)
  root.add(sign.sprite)
  let open = null
  onFrame((dt, t) => {
    mat.uniforms.time.value = t
    const e = eventStatus()
    if (e.open !== open) {
      open = e.open
      gate.visible = fx.visible = sign.sprite.visible = open
      wall.setEnabled(open)
    }
    if (open) sign.set(`HALLOWEEN\nOPEN\n${mmss(e.left)}`)
  })
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
    if (Math.hypot(x - px, z - pz) < 6 || (Math.abs(x - Z.portal[0]) < 5 && Math.abs(z - Z.portal[1]) < 3) || (Math.abs(x + 12.5) < 6 && Math.abs(z + 24) < 3)) continue
    clump(root, x, 0, z, rand() * Math.PI, edge ? 1.1 + rand() * 0.5 : 0.75 + rand() * 0.45, rand() < 0.3)
  }
  for (const s of [-1, 1]) terraceWall(root, { axis: 'z', at: s * hw, from: Z.endZ, to: L.northZ, out: s, theme: BROWN_CLIFF, height: L.valley.cliffHeight, seed: s < 0 ? 21 : 23 })
  motoPost(root, ...Z.post)
  portal(root, ...Z.portal)
  motes(root, { x0: -hw + 2, x1: hw - 2, y0: 0.4, y1: 7, z0: Z.endZ, z1: south - 1, count: 50 })
}
