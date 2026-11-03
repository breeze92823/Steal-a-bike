import { AdditiveBlending, CanvasTexture, Color, ConeGeometry, DoubleSide, Mesh, Object3D, PointLight, ShaderMaterial, SpotLight, SRGBColorSpace, Sprite, SpriteMaterial, Vector3 } from 'three'
import { HEIST, ITEMS, LANE, LAYOUT, RIDE } from './config.js'
import { zzz } from './fx.js'
import { player, rideTop, ZONE_RECS } from './player.js'
import { inputState, onKey } from './input.js'
import { syncYawToPlayer } from './camera.js'
import { exclamation } from './kit.js'
import { pursuitFlash, setAlarm } from './police.js'
import { chase as sound, heistSfx as sfx } from './audio.js'
import { paintSoftDot } from './textures.js'

// Stealing bikes from the guard posts, and the chase that follows.
//  - Near a bay bike a STEAL prompt shows over it (E, or tap it). The bike
//    leaves its bay and you ride it, turned toward the plaza; the HUD switches
//    to the chase view (DRIVE!, speedometer, red edges).
//  - Its guard wakes: the Zs stop, his head comes up, a red "!" pops over him,
//    then his vehicle gives chase with its siren wailing and its lamps
//    double-flashing red and blue (two coloured lights wash the ground).
//  - Reach the SAFE ZONE line and the bike is yours (the bay refills later):
//    you get off and walk it home by the handlebars (`onEscape`, base.js).
//    If he reaches you first you are knocked off: you fly, land, lie there a
//    moment and get up; the bike lies on its side, then pops back to its bay.
//  - Either way the guard drives back to his post, parks and falls asleep.
//  - Helicopters, flying cars and saucers climb to `userData.fly` to chase and
//    settle again to park; their rotors and fans spin up when they wake. In
//    the dark worlds (lane zone `dark`) the chasing guard drives with
//    headlights: two light beams and a spotlight washing the ground ahead.
// Zones register their guards and bikes while they build (addGuard / addBike).

const guards = []
const bikes = []

// `obj` is the guard vehicle already placed in its zone root (finishGuard's output).
export function addGuard(root, obj, { tier = 0, zzz = null, snore = null, collider = null } = {}) {
  obj.userData.dynamic = true
  const ud = obj.userData
  const g = {
    root,
    obj,
    tier,
    zzz,
    snore,
    collider,
    home: obj.position.clone(),
    homeYaw: obj.rotation.y,
    yaw: obj.rotation.y, // where the body points
    course: obj.rotation.y, // where it is actually going (differs while it slides)
    speed: 0,
    steer: 0, // front wheel angle (rad), or a flier's turn rate
    throttle: 0, // 0..1 on the gas (the engine sound's load)
    braking: false,
    skid: 0, // m/s it is sliding sideways (tyre squeal and smoke)
    pitch: 0,
    state: 'sleep', // sleep | alert | chase | stop | return
    t: 0,
    kind: ud.sound === 'bike' ? 'bike' : ud.length > 5.5 ? 'tank' : 'car',
    spin: 0, // rotors / fans, 0 (stopped) .. 1 (full speed)
    beams: null,
    halos: null,
    // Chase items (items.js): s left knocked out / spinning, slowed (and to what share), blinded.
    stun: 0,
    spinOut: false,
    slowT: 0,
    slowF: 1,
    blindT: 0,
    blindX: 0,
    blindZ: 0,
    dizzy: null, // Zs over the vehicle while he is knocked out
  }
  guards.push(g)
  return g
}

// `mesh` is the baked bike standing in its bay; `make()` builds a fresh one to ride.
export function addBike(root, mesh, { make, name, guard = null, value = 100, extras = [] }) {
  mesh.userData.dynamic = true
  const b = { root, mesh, make, name, guard, value, extras, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, taken: false, back: 0 }
  bikes.push(b)
  return b
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d))

let glowTex = null
function glow() {
  if (!glowTex) {
    glowTex = new CanvasTexture(paintSoftDot(128))
    glowTex.colorSpace = SRGBColorSpace
  }
  return glowTex
}

// A guard's top chasing speed: a share of what his zone's Recommended speed
// gives you (HEIST.chaseShare), so you just outrun him once you have trained to
// it; short of it he is faster than you, by more the further short you are
// (HEIST.underTrained: at half the Recommended speed he gains 45% of your speed).
function guardTop(tier) {
  const rec = ZONE_RECS[Math.min(tier, ZONE_RECS.length - 1)]
  const short = Math.min(1, Math.max(0, 1 - player.counter / rec))
  return rideTop(rec) * HEIST.chaseShare + rideTop(player.counter) * HEIST.underTrained * short
}

// rig: the group under the avatar the stolen bike is shown in (main.js pivots
// it about the back axle with `pitch` for wheelies, and rolls the body over
// with `roll` / `lift` when you are knocked down). onEscape(bike, model) gets
// the bike you got away with and the model you rode it on.
export function createHeist({ scene, camera, hud, lane, rig, onEscape }) {
  const RED = new Color('#ff1a2a')
  const BLUE = new Color('#2a6dff')
  // Two coloured lights that ride on the chasing vehicle (always in the scene,
  // dark when idle, so the light count never changes and nothing recompiles).
  const redLight = new PointLight(RED, 0, 20, 1.6)
  const blueLight = new PointLight(BLUE, 0, 20, 1.6)
  scene.add(redLight, blueLight)
  // Headlights for the dark worlds: one spotlight (always present, dark when
  // idle) and soft beam cones on the chasing vehicle's lamps.
  const headSpot = new SpotLight('#fff2d8', 0, HEIST.headlights.distance, HEIST.headlights.angle, 0.55, 1.3)
  const headAim = new Object3D()
  headSpot.target = headAim
  scene.add(headSpot, headAim)
  const beamMat = new ShaderMaterial({
    uniforms: { level: { value: 0 } },
    vertexShader: 'varying float vT; void main(){ vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // Brightest at the lamp, fading out along the beam (no pow: NaN-safe for the bloom pass).
    fragmentShader: 'uniform float level; varying float vT; void main(){ float t = clamp(vT, 0.0, 1.0); gl_FragColor = vec4(1.0, 0.95, 0.82, t * t * 0.3 * clamp(level, 0.0, 1.0)); }',
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
  })
  const beamGeo = new ConeGeometry(2.2, 12, 18, 1, true).rotateZ(Math.PI / 2).translate(6, 0, 0) // apex at the lamp, opening along +X
  let headLevel = 0
  const alert = exclamation(1.25)
  alert.visible = false
  scene.add(alert)

  // A small pool of soft sprites: dust behind wheels, the poof when a bike returns.
  const puffs = []
  for (let i = 0; i < 28; i++) {
    const s = new Sprite(new SpriteMaterial({ map: glow(), transparent: true, depthWrite: false, opacity: 0 }))
    s.visible = false
    s.userData = { age: 1, life: 1, vx: 0, vy: 0, vz: 0, size: 1 }
    scene.add(s)
    puffs.push(s)
  }
  let puffK = 0
  function puff(x, y, z, { color = '#d8cfb0', size = 0.7, spread = 0.6, up = 0.8, life = 0.7, opacity = 0.55 } = {}) {
    const s = puffs[puffK++ % puffs.length]
    s.visible = true
    s.position.set(x + (Math.random() - 0.5) * spread, y, z + (Math.random() - 0.5) * spread)
    s.material.color.set(color)
    s.material.opacity = opacity
    Object.assign(s.userData, { age: 0, life, vx: (Math.random() - 0.5) * 1.2, vy: up * (0.6 + Math.random() * 0.6), vz: (Math.random() - 0.5) * 1.2, size, opacity })
  }
  function poof(x, y, z) {
    for (let i = 0; i < 12; i++) puff(x, y + 0.4, z, { color: i % 2 ? '#ffffff' : '#bff4ff', size: 0.9, spread: 1.4, up: 2.2, life: 0.8, opacity: 0.8 })
  }

  let carried = null // the bike you are riding away with
  let rideModel = null
  let rideKind = 'pedal'
  let chaser = null
  let dropped = null // { model, bike, t }
  let knock = null // { t, phase, side }
  let pitch = 0
  let roll = 0
  let wheelieWas = false
  let promptFor = null
  const last = new Vector3()
  const v = new Vector3()

  // --- Stealing --------------------------------------------------------------------------------
  function trySteal() {
    if (promptFor && !carried && !knock) steal(promptFor)
  }
  onKey('KeyE', trySteal)
  hud.onSteal(trySteal)

  function steal(b) {
    b.taken = true
    b.mesh.visible = false
    for (const e of b.extras) e.visible = false
    carried = b
    rideModel = b.make()
    rideKind = rideModel.userData.wheels ? 'pedal' : 'motor'
    player.rideKind = rideKind
    rideModel.rotation.y = -Math.PI / 2 // the kit's +X front to the avatar's forward (+Z)
    rideModel.scale.setScalar(RIDE.bikeScale)
    rig.add(rideModel)
    player.riding = true
    player.facing = 0 // facing south, toward the plaza
    player.velocity.x = player.velocity.z = 0
    last.set(player.position.x, player.position.y, player.position.z)
    syncYawToPlayer()
    hud.prompt(null)
    promptFor = null
    hud.startChase(b.name)
    sfx('steal')
    sound.music = true
    sound.ride = rideKind
    if (b.guard) wake(b.guard)
  }

  // --- Guards ------------------------------------------------------------------------------------
  function wake(g) {
    if (g.state === 'chase' || g.state === 'alert') return
    if (g.state === 'sleep') {
      g.zzz?.set(false)
      if (g.snore) g.snore.off = true
    }
    g.state = 'alert'
    g.t = 0
    alert.visible = true
    alert.userData.g = g
    alert.userData.t = 0
    const p = g.obj.position
    sfx('alert', p)
    sfx('radio', p)
    chaser = g
    attachHalos(g)
    setAlarm(true)
  }

  function attachHalos(g) {
    if (g.halos) return
    g.halos = []
    for (const [x, y, z] of g.obj.userData.lamps) {
      const s = new Sprite(new SpriteMaterial({ map: glow(), color: z < 0 ? RED : BLUE, transparent: true, depthWrite: false, opacity: 0 }))
      s.position.set(x, y, z)
      s.scale.setScalar(g.kind === 'bike' ? 1.0 : 2.0)
      s.userData.red = z < 0
      g.obj.add(s)
      g.halos.push(s)
    }
  }
  function dropHalos(g) {
    for (const s of g.halos ?? []) {
      s.removeFromParent()
      s.material.dispose()
    }
    g.halos = null
    for (const m of g.beams ?? []) m.removeFromParent()
    g.beams = null
  }
  // Beam cones and lamp glare on its headlights (dark worlds).
  function attachBeams(g) {
    if (g.beams) return
    g.beams = []
    for (const [x, y, z] of g.obj.userData.headlights) {
      const m = new Mesh(beamGeo, beamMat)
      m.position.set(x, y, z)
      m.rotation.z = -0.08 // tipped a little toward the ground
      m.renderOrder = 3
      g.obj.add(m)
      const glare = new Sprite(new SpriteMaterial({ map: glow(), color: '#fff6e0', transparent: true, depthWrite: false, opacity: 0.9 }))
      glare.position.set(x + 0.05, y, z)
      glare.scale.setScalar(0.9)
      g.obj.add(glare)
      g.beams.push(m, glare)
    }
  }

  function startPursuit(g) {
    g.state = 'chase'
    g.t = 0
    scene.attach(g.obj) // out of its zone group: it may drive out of that zone
    g.collider?.setEnabled(false)
    g.obj.rotation.set(0, g.yaw, 0, 'YXZ') // attach() can hand back an equivalent (pi, ., pi) Euler
    g.course = g.yaw
    sound.siren = true
    sound.engine = g.obj.userData.sound
    sfx('chirp', g.obj.position)
  }

  function park(g) {
    g.obj.position.copy(g.home)
    g.obj.rotation.set(0, g.homeYaw, 0)
    g.yaw = g.course = g.homeYaw
    g.speed = g.steer = g.skid = g.pitch = g.throttle = 0
    g.braking = false
    g.root.attach(g.obj)
    g.collider?.setEnabled(true)
    g.zzz?.set(true)
    if (g.snore) g.snore.off = false
    const head = g.obj.userData.officer?.userData.head
    if (head) head.rotation.z = -0.38
    dropHalos(g)
    clearEffects(g)
    g.state = 'sleep'
    if (chaser === g) {
      chaser = null
      setAlarm(false)
      sound.engine = null
      redLight.intensity = blueLight.intensity = 0
      headSpot.intensity = 0
      headLevel = 0
    }
    g.spin = 0
  }

  // Drives toward (tx, tz) at up to vmax like a real vehicle; `arrive` brings it
  // to a stop on the spot. Returns the distance left.
  //  - Ground vehicles are a bicycle model: the front wheels steer toward the
  //    target (at a limited rate, up to full lock), the body turns at
  //    speed / wheelbase x tan(steer), and the tyres hold up to `grip` m/s^2
  //    sideways: turn harder and the body rotates but the car slides wide
  //    (course lags yaw), with smoke and squeal.
  //  - It brakes for corners (the speed the grip allows on the arc to the
  //    target, or a full-lock U-turn when the target is behind it) and to stop
  //    in time; pulls away with less push as it nears top speed.
  //  - The body squats under the gas, dives under the brakes and rolls in turns
  //    (a motorbike leans in); fliers bank and dip their nose.
  function drive(g, tx, tz, vmax, dt, arrive = 0) {
    const o = g.obj
    const ud = o.userData
    const fly = ud.fly ?? 0
    const flier = fly > 0
    const V = HEIST.vehicles[flier ? 'flier' : g.kind]
    // Keep the aim off the cliffs (and inside the ice gate's opening).
    const w = ud.width / 2 + 0.8
    let hw = LAYOUT.valley.halfWidth - w
    const gz = LANE.zone4.endZ
    if (o.position.z < gz + 1 && o.position.z > gz - LANE.gate.depth - 1) hw = Math.min(hw, LANE.gate.halfWidth - w)
    tx = clamp(tx, -hw + 1, hw - 1)
    const dx = tx - o.position.x
    const dz = tz - o.position.z
    const dist = Math.hypot(dx, dz)
    const err = wrap(Math.atan2(-dz, dx) - g.yaw)
    const v0 = g.speed
    const av = Math.abs(v0)

    // Steering and how hard it can turn.
    let yawRate
    let rMin
    if (flier) {
      const limit = Math.min(V.turn, V.grip / Math.max(av, 4))
      g.steer = approach(g.steer, clamp(err * 2.5, -limit, limit), V.turn * 2 * dt)
      yawRate = g.steer
      rMin = Math.max(av, 4) / V.turn
    } else {
      const wheelbase = Math.max(1.2, ud.length * V.wheelbase)
      g.steer = approach(g.steer, clamp(err * 2.2, -V.steer, V.steer), V.steerRate * dt)
      yawRate = (v0 / wheelbase) * Math.tan(g.steer)
      rMin = wheelbase / Math.tan(V.steer)
    }

    // How fast it wants to go: flat out, slower for the corner, and able to stop.
    let want = vmax
    const turn = Math.min(Math.abs(err), Math.PI / 2)
    const radius = Math.abs(err) > Math.PI / 2 ? rMin : Math.max(rMin, dist / Math.max(0.05, 2 * Math.sin(turn)))
    want = Math.min(want, Math.max(3, Math.sqrt(V.grip * radius)))
    if (arrive) want = Math.min(want, Math.max(0.8, Math.sqrt(2 * V.brake * 0.6 * Math.max(0, dist - 0.5))))
    if (want > v0) {
      g.speed = Math.min(want, v0 + V.accel * Math.max(0.5, 1 - 0.5 * (v0 / Math.max(vmax, 1))) * dt)
      g.throttle += (1 - g.throttle) * Math.min(1, dt * 6)
      g.braking = false
    } else {
      g.speed = Math.max(want, v0 - V.brake * dt)
      g.throttle += (0.1 - g.throttle) * Math.min(1, dt * 8)
      g.braking = v0 - want > 2
    }
    const longA = (g.speed - v0) / Math.max(dt, 1e-3)

    // Turn: the body follows the steering; the course follows the body only as
    // fast as the tyres grip, so a hard turn at speed slides wide.
    g.yaw = wrap(g.yaw + yawRate * dt)
    const gripRate = V.grip / Math.max(Math.abs(g.speed), 1)
    const slide = wrap(g.yaw - g.course)
    g.course = wrap(g.course + clamp(slide, -gripRate * dt, gripRate * dt))
    const slip = wrap(g.yaw - g.course)
    if (Math.abs(slip) > 0.45) g.course = wrap(g.yaw - Math.sign(slip) * 0.45) // never fully sideways
    g.skid = flier ? 0 : Math.abs(Math.sin(wrap(g.yaw - g.course))) * Math.abs(g.speed) + (g.braking && g.speed > 8 ? (v0 - g.speed) / Math.max(dt, 1e-3) / V.brake * 2 : 0)

    o.position.x += Math.cos(g.course) * g.speed * dt
    o.position.z -= Math.sin(g.course) * g.speed * dt
    // Scraping a cliff: held off it, and it costs speed.
    const cx = clamp(o.position.x, -hw, hw)
    if (cx !== o.position.x) {
      o.position.x = cx
      g.speed *= 1 - Math.min(1, dt * 1.5)
    }
    o.position.z = Math.min(o.position.z, LAYOUT.safeZoneZ - 1.5)
    // Ground vehicles keep to the floor; fliers climb to their cruising height
    // and settle back as they come in to park.
    const ground = lane.zoneAt(o.position.z)?.y ?? 0
    const alt = fly * (arrive ? clamp(dist / 10, 0, 1) : 1)
    o.position.y += (ground + alt - o.position.y) * Math.min(1, dt * (fly ? 2.2 : 12))
    o.rotation.y = g.yaw

    // Body: roll from the sideways pull, pitch from speeding up / braking.
    const latA = g.speed * yawRate
    const rollTo = flier ? clamp(latA * V.bank, -0.5, 0.5) : g.kind === 'bike' ? -clamp(Math.atan(latA / 9.81), -0.65, 0.65) : clamp(latA * V.roll, -0.09, 0.09)
    o.rotation.x += (rollTo - o.rotation.x) * Math.min(1, dt * (g.kind === 'bike' ? 7 : 5))
    const pitchTo = flier ? -(g.speed / Math.max(vmax, 1)) * 0.16 - longA * V.pitch : clamp(longA * V.pitch, -0.08, 0.06)
    g.pitch += (pitchTo - g.pitch) * Math.min(1, dt * 5)
    o.rotation.z = g.pitch

    // Tyre smoke from the back wheels while it slides or locks up.
    if (g.skid > 3 && Math.random() < dt * g.skid * 1.5) {
      const bx = o.position.x - Math.cos(g.yaw) * ud.length * 0.4
      const bz = o.position.z + Math.sin(g.yaw) * ud.length * 0.4
      puff(bx, o.position.y + 0.15, bz, { color: '#c8c8cc', size: 1 + g.skid * 0.05, spread: ud.width * 0.8, up: 0.6, life: 1.1, opacity: 0.45 })
    }
    return dist
  }

  // --- Endings -----------------------------------------------------------------------------------
  function clearRide() {
    sound.music = false
    player.riding = false
    player.rideKind = 'pedal'
    if (rideModel) rideModel.removeFromParent()
    rideModel = null
  }

  function escaped() {
    const b = carried
    carried = null
    const model = rideModel
    rideModel = null // kept: you walk it home
    clearRide()
    b.back = HEIST.respawn
    hud.endChase('escaped', b)
    sfx('escape')
    if (chaser) giveUp(chaser)
    onEscape(b, model)
  }

  function caught(g) {
    const b = carried
    carried = null
    // The bike drops where you were and tips onto its side.
    const model = rideModel
    rideModel = null
    scene.add(model)
    model.position.set(player.position.x, player.position.y + 0.05, player.position.z)
    model.rotation.set(0, player.facing - Math.PI / 2, 0, 'YXZ')
    dropped = { model, bike: b, t: 0 }
    clearRide()
    // You are thrown away from the vehicle.
    const o = g.obj.position
    const p = player.position
    let dx = p.x - o.x
    let dz = p.z - o.z
    const d = Math.hypot(dx, dz) || 1
    dx /= d
    dz /= d
    player.frozen = true
    player.velocity.x = dx * HEIST.knock.speed + Math.cos(g.yaw) * g.speed * 0.4
    player.velocity.z = dz * HEIST.knock.speed - Math.sin(g.yaw) * g.speed * 0.4
    player.velocity.y = HEIST.knock.up
    player.grounded = false
    // Roll the body away from the hit, sideways relative to your facing.
    const side = Math.sign(dx * Math.cos(player.facing) - dz * Math.sin(player.facing)) || 1
    knock = { t: 0, phase: 'fly', side }
    sfx('crash', p)
    sfx('busted')
    hud.endChase('busted', b)
    for (let i = 0; i < 8; i++) puff(p.x, p.y + 0.2, p.z, { size: 1.1, spread: 1.4, up: 1.6, life: 0.9 })
    g.state = 'stop'
    g.t = 0
    g.speed *= 0.3
  }

  function giveUp(g) {
    g.state = 'return'
    g.t = 0
    g.settling = false
    sound.siren = false
    clearEffects(g)
  }

  // --- Chase items (items.js) ------------------------------------------------------------------
  function clearEffects(g) {
    g.stun = g.slowT = g.blindT = 0
    g.spinOut = false
    g.dizzy?.set(false)
  }
  // Knocked out for `secs` (Zs over him, he rolls to a stop) or, with `spin`, spun out;
  // `knock` m/s throws him backwards first.
  function stun(g, secs, { spin = false, knock = 0 } = {}) {
    g.stun = Math.max(g.stun, secs)
    g.spinOut = spin
    if (knock) g.speed = -knock
    if (!spin) {
      g.dizzy ??= zzz(g.obj, 0, (g.obj.userData.zzz ?? g.obj.userData.height) - 0.6, 0)
      g.dizzy.set(true)
    }
  }
  // Drives at `share` of his speed for `secs`.
  function slow(g, secs, share) {
    g.slowT = Math.max(g.slowT, secs)
    g.slowF = share
  }
  // Loses sight of you for `secs`: wanders off toward a spot well to one side.
  function blind(g, secs) {
    g.blindT = secs
    const side = Math.random() < 0.5 ? -1 : 1
    g.blindX = clamp(player.position.x + side * (10 + Math.random() * 8), -LAYOUT.valley.halfWidth + 3, LAYOUT.valley.halfWidth - 3)
    g.blindZ = g.obj.position.z + (player.position.z - g.obj.position.z) * 0.4
  }

  // --- Per frame -----------------------------------------------------------------------------------
  function update(dt, t) {
    const p = player.position
    const speed = Math.hypot(player.velocity.x, player.velocity.z)

    // Respawned or teleported while riding off with a bike: it goes back.
    if (carried && last.distanceTo(v.set(p.x, p.y, p.z)) > 12) {
      const b = carried
      carried = null
      clearRide()
      b.taken = false
      b.mesh.visible = true
      for (const e of b.extras) e.visible = true
      hud.endChase('lost', b)
      if (chaser) giveUp(chaser)
    }
    last.set(p.x, p.y, p.z)

    // The STEAL prompt over the nearest bay bike in reach.
    let best = null
    if (!carried && !knock && !player.training && !player.holding) {
      let bd = HEIST.reach
      for (const b of bikes) {
        if (b.taken || !b.root.visible) continue
        const d = Math.hypot(b.x - p.x, b.z - p.z)
        if (d < bd && Math.abs(b.y - p.y) < 1.6) {
          bd = d
          best = b
        }
      }
    }
    if (best !== promptFor) promptFor = best
    if (best) {
      v.set(best.x, best.y + 1.25, best.z).project(camera)
      if (v.z < 1) hud.prompt(((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight, best.name)
      else hud.prompt(null)
    } else hud.prompt(null)

    // Riding away: escape at the SAFE ZONE line.
    if (carried) {
      if (p.z > LAYOUT.safeZoneZ - 0.6) escaped()
      else {
        const max = Math.max(1, player.topSpeed)
        const span = max / HEIST.gears
        const gear = speed < 0.4 ? 'N' : String(Math.min(HEIST.gears, 1 + Math.floor(speed / span)))
        const rev = gear === 'N' ? 0.04 : clamp((speed - (Number(gear) - 1) * span) / span, 0.08, 1)
        const wheelie = inputState.wheelie && speed > 1.5 && player.grounded
        if (wheelie && !wheelieWas) sfx('wheelie')
        wheelieWas = wheelie
        hud.chaseTick(speed * HEIST.mph, gear, rev, speed / max, wheelie)
        sound.rev = rev
        // Dust from the back wheel at speed.
        if (speed > 7 && Math.random() < dt * speed * 0.8) puff(p.x - Math.sin(player.facing) * 0.8, p.y + 0.15, p.z - Math.cos(player.facing) * 0.8, { size: 0.5 + speed * 0.03 })
      }
    }
    const wheelieOn = !!carried && inputState.wheelie && speed > 1.5
    pitch += ((wheelieOn ? HEIST.wheelie : 0) - pitch) * Math.min(1, dt * (wheelieOn ? 5 : 8))

    // Knocked down: fly, land, lie there, get up.
    let rollTarget = 0
    if (knock) {
      knock.t += dt
      const K = HEIST.knock
      if (knock.phase === 'fly') {
        rollTarget = knock.side * 1.5
        if (player.grounded && knock.t > 0.2) {
          knock.phase = 'down'
          knock.t = 0
          sfx('thud', p)
          for (let i = 0; i < 6; i++) puff(p.x, p.y + 0.1, p.z, { size: 1, spread: 1.6, up: 0.9 })
        }
      } else if (knock.phase === 'down') {
        rollTarget = knock.side * Math.PI / 2
        if (knock.t > K.down) {
          knock.phase = 'up'
          knock.t = 0
        }
      } else {
        rollTarget = 0
        if (knock.t > K.getUp) {
          knock = null
          player.frozen = false
        }
      }
    }
    const rollRate = knock?.phase === 'up' ? 5 : 10
    roll += (rollTarget - roll) * Math.min(1, dt * rollRate)

    // The dropped bike tips over, lies there, then pops back to its bay.
    if (dropped) {
      dropped.t += dt
      const f = Math.min(1, dropped.t / 0.35)
      dropped.model.rotation.x = (Math.PI / 2 - 0.16) * f * f // onto its side
      if (dropped.t > HEIST.dropped) {
        const m = dropped.model.position
        poof(m.x, m.y, m.z)
        dropped.model.removeFromParent()
        const b = dropped.bike
        b.taken = false
        b.mesh.visible = true
        for (const e of b.extras) e.visible = true
        poof(b.x, b.y, b.z)
        sfx('pop', b)
        dropped = null
      }
    }

    // Bays you escaped with fill again after a while.
    for (const b of bikes) {
      if (!b.taken || b === carried || b.back <= 0) continue
      b.back -= dt
      if (b.back <= 0) {
        b.taken = false
        b.mesh.visible = true
        for (const e of b.extras) e.visible = true
        if (b.root.visible) poof(b.x, b.y, b.z)
      }
    }

    // Guards.
    for (const g of guards) {
      if (g.state === 'sleep') continue
      g.t += dt
      const o = g.obj
      const head = o.userData.officer?.userData.head
      if (head) head.rotation.z += ((g.stun > 0 && !g.spinOut ? -0.38 : g.state === 'return' ? -0.1 : 0.08) - head.rotation.z) * Math.min(1, dt * 6)
      // Rotors and fans spool up as he wakes, then run flat out.
      g.spin += ((g.state === 'alert' ? 0.45 : 1) - g.spin) * Math.min(1, dt * 1.2)
      for (const sp of o.userData.spinners ?? []) sp.obj.rotation[sp.axis] += sp.rate * g.spin * dt
      if (g.state === 'alert') {
        if (g.t > HEIST.wake) {
          if (carried?.guard === g) startPursuit(g)
          else giveUp(g)
        }
      } else if (g.state === 'chase' && g.stun > 0) {
        // Knocked out by the bat, or spinning out on oil: he rolls to a stop.
        g.stun -= dt
        g.speed = approach(g.speed, 0, 16 * dt)
        o.position.x += Math.cos(g.yaw) * g.speed * dt
        o.position.z -= Math.sin(g.yaw) * g.speed * dt
        o.position.z = Math.min(o.position.z, LAYOUT.safeZoneZ - 1.5)
        if (g.spinOut) {
          g.yaw = wrap(g.yaw + dt * 11 * Math.min(1, g.stun / 0.6 + 0.15))
          o.rotation.y = g.yaw
          if (Math.random() < dt * 14) puff(o.position.x, o.position.y + 0.1, o.position.z, { color: '#3a3a40', size: 1.1, spread: o.userData.length * 0.6 })
        }
        o.rotation.x *= 1 - Math.min(1, dt * 4)
        g.course = g.yaw
        g.skid = g.spinOut ? g.speed : 0
        g.throttle = 0
        if (g.stun <= 0) {
          g.stun = 0
          g.spinOut = false
          g.dizzy?.set(false)
          sfx('alert', o.position)
        }
        if (!carried) giveUp(g)
      } else if (g.state === 'chase') {
        let vmax = guardTop(g.tier)
        if (g.slowT > 0) {
          g.slowT -= dt
          vmax *= g.slowF
          g.speed = Math.min(g.speed, vmax)
        }
        // Aim where you will be, not where you are (up to HEIST.lead s ahead,
        // less as he closes in), to cut you off.
        const lead = Math.min(HEIST.lead, Math.hypot(p.x - o.position.x, p.z - o.position.z) / Math.max(g.speed, 8))
        let tx = p.x + player.velocity.x * lead
        let tz = p.z + player.velocity.z * lead
        if (g.blindT > 0) {
          g.blindT -= dt
          vmax *= ITEMS.kinds.smoke.slow
          tx = g.blindX
          tz = g.blindZ
        }
        drive(g, tx, tz, vmax, dt)
        const dist = Math.hypot(p.x - o.position.x, p.z - o.position.z)
        const reach = Math.min(o.userData.length, 6) / 2 + 0.7
        if (carried && dist < reach && Math.abs(o.position.y - p.y) < 2 + (o.userData.fly ?? 0)) caught(g)
        else if (!carried || dist > HEIST.giveUp) giveUp(g)
        if (g.speed > 8 && Math.random() < dt * g.speed * 0.6) puff(o.position.x - Math.cos(g.yaw) * o.userData.length * 0.45, o.position.y + 0.15, o.position.z + Math.sin(g.yaw) * o.userData.length * 0.45, { size: 0.9 })
      } else if (g.state === 'stop') {
        // Brakes hard after hitting you: nose dives, tyres squeal.
        const v0 = g.speed
        g.speed = approach(g.speed, 0, 18 * dt)
        g.braking = g.speed > 0.5
        g.throttle = 0
        g.skid = g.speed > 4 ? 6 : 0
        o.position.x += Math.cos(g.course) * g.speed * dt
        o.position.z -= Math.sin(g.course) * g.speed * dt
        g.pitch += (clamp(((g.speed - v0) / Math.max(dt, 1e-3)) * 0.007, -0.08, 0.06) - g.pitch) * Math.min(1, dt * 5)
        o.rotation.z = (o.userData.fly ?? 0) > 0 ? o.rotation.z : g.pitch
        if (g.t > 0.9) giveUp(g)
      } else if (g.state === 'return') {
        const left = Math.hypot(g.home.x - o.position.x, g.home.z - o.position.z)
        // Nobody watching, or it has taken far too long: it is simply back asleep.
        if (!g.root.visible || g.t > HEIST.returnTimeout) park(g)
        else if (!g.settling && left > 3) drive(g, g.home.x, g.home.z, HEIST.returnSpeed, dt, 1)
        else {
          // Close in: glide into the bay, square up, settle down, then sleep.
          g.settling = true
          g.speed = g.skid = g.throttle = 0
          g.braking = false
          const k = Math.min(1, dt * 2.5)
          o.position.x += (g.home.x - o.position.x) * k
          o.position.z += (g.home.z - o.position.z) * k
          o.position.y += (g.home.y - o.position.y) * k
          g.yaw += wrap(g.homeYaw - g.yaw) * k
          g.course = g.yaw
          o.rotation.y = g.yaw
          o.rotation.x *= 1 - k
          o.rotation.z *= 1 - k
          if (left < 0.06 && Math.abs(wrap(g.homeYaw - g.yaw)) < 0.03 && Math.abs(o.position.y - g.home.y) < 0.05) park(g)
        }
      }
    }

    // The "!" over the guard who woke.
    if (alert.visible) {
      const g = alert.userData.g
      alert.userData.t += dt
      const at = alert.userData.t
      const s = at < 0.12 ? (at / 0.12) * 1.35 : at < 0.3 ? 1.35 - ((at - 0.12) / 0.18) * 0.35 : 1
      alert.scale.setScalar(s)
      const o = g.obj
      o.getWorldPosition(v)
      alert.position.set(v.x, v.y + (g.kind === 'bike' ? 2.6 : o.userData.height + 0.6) + Math.sin(at * 6) * 0.08, v.z)
      alert.rotation.y += dt * 2
      if (at > 2.6 || g.state === 'sleep' || g.state === 'return') alert.visible = false
    }

    // Pursuit lamps: halos double-flash, two lights wash the ground; siren follows.
    if (chaser) {
      const [r, b] = pursuitFlash(t)
      for (const s of chaser.halos ?? []) s.material.opacity = (s.userData.red ? r : b) * 0.8
      const o = chaser.obj
      const lit = chaser.state !== 'sleep'
      v.set(o.userData.lamps[0][0], o.userData.lamps[0][1] + 0.3, -1)
      o.localToWorld(v)
      redLight.position.copy(v)
      v.set(o.userData.lamps[0][0], o.userData.lamps[0][1] + 0.3, 1)
      o.localToWorld(v)
      blueLight.position.copy(v)
      redLight.intensity = lit ? r * 34 : 0
      blueLight.intensity = lit ? b * 48 : 0
      o.getWorldPosition(v)
      sound.x = v.x
      sound.y = v.y
      sound.z = v.z
      sound.vx = Math.cos(chaser.yaw) * chaser.speed
      sound.vz = -Math.sin(chaser.yaw) * chaser.speed
      sound.engineSpeed = chaser.speed
      // Headlights on in the dark worlds.
      const dark = !!lane.zoneAt(v.z)?.dark
      headLevel += ((dark && lit ? 1 : 0) - headLevel) * Math.min(1, dt * 3)
      if (headLevel > 0.01) {
        attachBeams(chaser)
        beamMat.uniforms.level.value = headLevel
        const [hx, hy] = o.userData.headlights[0]
        v.set(hx, hy, 0)
        o.localToWorld(v)
        headSpot.position.copy(v)
        v.set(hx + 14, hy - 2.5, 0)
        o.localToWorld(v)
        headAim.position.copy(v)
        headSpot.intensity = headLevel * HEIST.headlights.intensity
      } else headSpot.intensity = 0
    }
    sound.lvx = player.velocity.x
    sound.lvz = player.velocity.z
    // Your bike (a stolen one, or your own on Ride My Bike).
    const bk = player.bike
    sound.ride = carried ? rideKind : player.riding ? 'pedal' : null
    sound.rideMps = Math.abs(bk.speed)
    sound.rideSpeed = Math.min(1, Math.abs(bk.speed) / Math.max(1, player.topSpeed))
    sound.pedal = bk.pedal
    sound.brake = bk.speed > 3 ? bk.brake : 0
    sound.lean = Math.abs(bk.lean)
    sound.grounded = player.grounded
    if (chaser) {
      sound.throttle = chaser.throttle
      sound.skid = chaser.state === 'sleep' ? 0 : clamp(chaser.skid / 9, 0, 1)
      sound.braking = chaser.braking
      sound.engineTop = guardTop(chaser.tier)
    }

    // Puffs drift up, grow and fade.
    for (const s of puffs) {
      const u = s.userData
      if (u.age >= u.life) continue
      u.age += dt
      const f = u.age / u.life
      if (f >= 1) {
        s.visible = false
        continue
      }
      s.position.x += u.vx * dt
      s.position.y += u.vy * dt
      s.position.z += u.vz * dt
      u.vy *= 1 - dt * 2
      s.scale.setScalar(u.size * (0.5 + f * 1.2))
      s.material.opacity = u.opacity * (1 - f)
    }
  }

  return {
    update,
    // Chase items (items.js): the guard chasing you right now (or null) and what can be done to him.
    get chaser() {
      return chaser?.state === 'chase' ? chaser : null
    },
    stun,
    slow,
    blind,
    puff,
    guards, // read-only: each guard's state ('sleep' | 'alert' | 'chase' | 'stop' | 'return')
    bikes, // read-only: the bay bikes (taken, back = s until the bay refills)
    get carrying() {
      return !!carried
    },
    get knocked() {
      return !!knock
    },
    get rideKind() {
      return rideKind
    },
    get rideModel() {
      return rideModel
    },
    get pitch() {
      return pitch
    },
    get roll() {
      return roll
    },
    // Lying on your side: lifted a little so the body rests on the ground, not in it.
    get lift() {
      return Math.abs(Math.sin(roll)) * 0.3
    },
  }
}
