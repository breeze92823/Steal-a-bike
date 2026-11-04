import { inputState } from './input.js'
import { getYaw, syncYawToPlayer } from './camera.js'
import { isFirstPerson } from './modes.js'
import { RAPIER, alpha, onTick, world } from './physics.js'
import { LANE, PHYSICS, PLAYER_DIMS, RIDE, SPAWN, SPAWN_FACING, ZONE_THEMES } from './config.js'

// The local player singleton, mutated in place. A kinematic Rapier capsule
// driven by Rapier's KinematicCharacterController: it slides along walls,
// autosteps small ledges, climbs slopes up to PHYSICS.maxSlope, snaps down
// steps and shoves dynamic bodies (crates, balls) with PHYSICS.pushMass.
// Gravity, jumping (with coyote time and a jump buffer) and acceleration are
// ours; collision resolution is Rapier's. Stepped once per physics tick.
export const player = {
  position: { x: 0, y: 0, z: 0 }, // capsule base (feet), at the latest tick
  renderPosition: { x: 0, y: 0, z: 0 }, // feet, interpolated for this frame
  velocity: { x: 0, y: 0, z: 0 },
  grounded: true,
  facing: SPAWN_FACING, // yaw the character model faces, radians
  dims: { ...PLAYER_DIMS },
  speedScale: 1, // Slow Mode scales walking and sprinting
  counter: 0, // the speed counter (trained on the treadmill; main.js copies it each frame)
  topSpeed: RIDE.top, // m/s your bike tops out at (rideTop of the counter, x Nitro; main.js sets it each frame)
  riding: false, // on your bike (Ride My Bike, outside the safe zone)
  // The bike while riding: forward speed (m/s, < 0 walking it back), pedal 0..1,
  // brake 0..1, turn rate (rad/s, + = left), lean (rad, + = into a left turn).
  bike: { speed: 0, pedal: 0, brake: 0, yawRate: 0, lean: 0, stuck: 0 },
  rideKind: 'pedal', // 'pedal' | 'motor': what you are riding (heist.js sets it for a stolen bike)
  training: null, // { x, y, z, facing } while pedalling on your treadmill (training.js): the body is held there
  wantsOff: false, // set when Jump is pressed while training; training.js gets you off
  frozen: false, // knocked off a stolen bike (heist.js): no control until you are back up
  bikeSelected: true, // the held bike is selected on the hotbar (in hand, and what Ride My Bike rides)
  holding: null, // the name of the stolen bike you are walking home (base.js)
}

// Each lane zone's Recommended speed (zone 1..12).
export const ZONE_RECS = [LANE.zone1.rec, LANE.zone2.rec, LANE.zone3.rec, LANE.zone4.rec, ...ZONE_THEMES.map((t) => t.rec)]

// Top riding speed (m/s) for a speed counter value: RIDE.top x perZone^k at
// zone k's Recommended speed, a straight line between zones (RIDE).
export function rideTop(counter) {
  const c = Math.max(0, counter)
  let lo = 0
  let loV = RIDE.zero
  for (let k = 0; k < ZONE_RECS.length; k++) {
    const hiV = RIDE.perZone ** k
    if (c <= ZONE_RECS[k]) return RIDE.top * (loV + ((hiV - loV) * (c - lo)) / (ZONE_RECS[k] - lo))
    lo = ZONE_RECS[k]
    loV = hiV
  }
  return RIDE.top * loV
}

const HALF = PLAYER_DIMS.height / 2 // capsule centre above the feet
const prev = { x: 0, y: 0, z: 0 }
let body = null
let collider = null
let controller = null
let sinceGrounded = 0
let jumpQueued = 0 // s left on a buffered jump

export function createPlayerBody() {
  const r = PLAYER_DIMS.radius
  body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(SPAWN.x, SPAWN.y + HALF, SPAWN.z))
  collider = world.createCollider(RAPIER.ColliderDesc.capsule(HALF - r, r).setFriction(0), body)

  controller = world.createCharacterController(0.02)
  controller.setUp({ x: 0, y: 1, z: 0 })
  controller.enableAutostep(PHYSICS.stepHeight, 0.15, false)
  controller.enableSnapToGround(PHYSICS.snapToGround)
  controller.setMaxSlopeClimbAngle((PHYSICS.maxSlope * Math.PI) / 180)
  controller.setMinSlopeSlideAngle(((PHYSICS.maxSlope + 5) * Math.PI) / 180)
  controller.setApplyImpulsesToDynamicBodies(true)
  controller.setCharacterMass(PHYSICS.pushMass)

  resetPlayer()
  onTick(step)
}

export function resetPlayer(spawn = SPAWN, facing = SPAWN_FACING) {
  player.position.x = prev.x = player.renderPosition.x = spawn.x
  player.position.y = prev.y = player.renderPosition.y = spawn.y
  player.position.z = prev.z = player.renderPosition.z = spawn.z
  player.velocity.x = player.velocity.y = player.velocity.z = 0
  player.grounded = true
  player.facing = facing
  body?.setTranslation({ x: spawn.x, y: spawn.y + HALF, z: spawn.z }, true)
  body?.setNextKinematicTranslation({ x: spawn.x, y: spawn.y + HALF, z: spawn.z })
}

export function respawn() {
  resetPlayer()
  syncYawToPlayer()
}

const TAU = Math.PI * 2
const STILL = { x: 0, z: 0 }
let wasRiding = false
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d))

// One tick on the bike. The stick (camera-relative, as on foot) says where you
// want to go: the bike steers its heading toward it no faster than its grip
// allows at this speed (a wide arc when fast, a tight one when slow), pedals
// up to top speed (fading as it gets there; half stick = half speed), coasts
// when you let go, and brakes when you pull back against the way it is going
// (then walks it backwards). Velocity is always along the heading: bikes do not
// slide sideways. Leans into turns by the real angle, atan(v * yawRate / g).
function pedalBike(dt, wishX, wishZ, len) {
  const R = RIDE
  const b = player.bike
  const stick = Math.min(1, len)
  const top = player.topSpeed * player.speedScale
  const hx = Math.sin(player.facing)
  const hz = Math.cos(player.facing)
  const along = stick > 0.05 ? (wishX * hx + wishZ * hz) / Math.max(1e-6, Math.hypot(wishX, wishZ)) : 0
  const backing = stick > 0.05 && along < -0.55
  let target = player.facing
  b.pedal = 0
  b.brake = 0
  if (backing) {
    if (b.speed > 0.4) b.brake = stick
    else target = player.facing // stopped: walk it straight back
  } else if (stick > 0.05) {
    target = b.speed < -0.2 ? player.facing : Math.atan2(wishX, wishZ)
    b.pedal = stick * (along > 0 ? 1 : 0.6) // easing off through a U-turn
  }

  // Speed.
  const v = b.speed
  if (b.brake > 0) b.speed = approach(v, 0, R.brake * b.brake * dt)
  else if (backing) b.speed = approach(v, -R.reverse, 4 * dt)
  else if (b.pedal > 0 && player.grounded && v < top * stick) {
    if (v < 0) b.speed = approach(v, 0, R.brake * dt)
    else {
      const f = v / Math.max(top, 1)
      b.speed = Math.min(top * stick, v + R.accel[player.rideKind] * b.pedal * Math.max(0.15, 1 - f ** 4) * dt)
    }
  } else {
    // Coasting (or over the pace you are asking for): rolling resistance and air drag.
    const slow = (player.grounded ? R.roll : 0) + R.drag * v * v
    b.speed = approach(v, 0, slow * dt)
    if (v > top * 1.02) b.speed = Math.max(top, b.speed - 6 * dt) // Nitro wearing off
  }

  // Steering: aim for the stick's heading, turning no faster than grip allows.
  const s = Math.abs(b.speed)
  const maxYaw = (s < 1.5 ? R.turnStill + (R.turnMax - R.turnStill) * (s / 1.5) : Math.min(R.turnMax, R.grip / s)) * (player.grounded ? 1 : R.airTurn)
  const err = wrap(target - player.facing)
  const wantYaw = clamp(err * 5, -maxYaw, maxYaw)
  b.yawRate = approach(b.yawRate, wantYaw, 14 * dt) // the bars take a moment to swing
  player.facing = wrap(player.facing + b.yawRate * dt)

  const lean = clamp(Math.atan((b.speed * b.yawRate) / 9.81), -R.maxLean, R.maxLean)
  b.lean += (lean - b.lean) * Math.min(1, dt * 9)

  player.velocity.x = Math.sin(player.facing) * b.speed
  player.velocity.z = Math.cos(player.facing) * b.speed
}
// Turns angle `from` toward `to` by at most maxDelta, the short way round.
function rotateTowards(from, to, maxDelta) {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  if (Math.abs(diff) <= maxDelta) return to
  return (from + Math.sign(diff) * maxDelta) % TAU
}

// Moves the (x, z) velocity toward the target as one 2D vector so it curves
// straight instead of warping axis-by-axis.
function approach2D(v, targetX, targetZ, maxDelta) {
  const dx = targetX - v.x
  const dz = targetZ - v.z
  const dist = Math.hypot(dx, dz)
  if (dist <= maxDelta || dist === 0) {
    v.x = targetX
    v.z = targetZ
  } else {
    v.x += (dx / dist) * maxDelta
    v.z += (dz / dist) * maxDelta
  }
}

function step(dt) {
  prev.x = player.position.x
  prev.y = player.position.y
  prev.z = player.position.z

  // On the treadmill: held on the belt, facing the console; Jump asks to get off.
  const seat = player.training
  if (seat) {
    if (inputState.jump) {
      inputState.jump = false
      player.wantsOff = true
    }
    player.velocity.x = player.velocity.y = player.velocity.z = 0
    player.grounded = true
    player.facing = seat.facing
    body.setNextKinematicTranslation({ x: seat.x, y: seat.y + HALF, z: seat.z })
    player.position.x = seat.x
    player.position.y = seat.y
    player.position.z = seat.z
    return
  }

  // Camera-relative ground basis.
  const yaw = getYaw()
  const fwdX = -Math.sin(yaw)
  const fwdZ = -Math.cos(yaw)
  const rightX = Math.cos(yaw)
  const rightZ = -Math.sin(yaw)
  const mv = player.frozen ? STILL : inputState.move
  const len = Math.hypot(mv.x, mv.z)
  const scale = len > 1 ? 1 / len : 1
  const wishX = (fwdX * mv.z + rightX * mv.x) * scale
  const wishZ = (fwdZ * mv.z + rightZ * mv.x) * scale
  if (player.riding && !player.frozen) {
    if (!wasRiding) player.bike.speed = player.velocity.x * Math.sin(player.facing) + player.velocity.z * Math.cos(player.facing)
    pedalBike(dt, wishX, wishZ, len)
  } else {
    const speed = (inputState.sprint ? PHYSICS.sprintSpeed : PHYSICS.walkSpeed) * player.speedScale
    const rate = player.frozen ? (player.grounded ? 16 : 0) : !player.grounded ? PHYSICS.airAccel : len > 0.01 ? PHYSICS.accel : PHYSICS.decel
    approach2D(player.velocity, wishX * speed, wishZ * speed, rate * dt)
    player.bike.speed = player.bike.pedal = player.bike.brake = player.bike.yawRate = 0
    player.bike.lean *= 1 - Math.min(1, dt * 8)
  }
  wasRiding = player.riding && !player.frozen

  // Jump: buffered a little before landing, and allowed a little after leaving a ledge.
  if (inputState.jump && !player.frozen) {
    jumpQueued = PHYSICS.jumpBuffer
    inputState.jump = false
  }
  sinceGrounded = player.grounded ? 0 : sinceGrounded + dt
  let jumped = false
  if (jumpQueued > 0 && sinceGrounded <= PHYSICS.coyoteTime) {
    player.velocity.y = PHYSICS.jumpSpeed
    jumpQueued = 0
    sinceGrounded = PHYSICS.coyoteTime + 1
    jumped = true
  }
  jumpQueued = Math.max(0, jumpQueued - dt)

  player.velocity.y += PHYSICS.gravity * dt
  if (player.grounded && !jumped && player.velocity.y < -2) player.velocity.y = -2 // stay pressed to slopes

  const desired = { x: player.velocity.x * dt, y: player.velocity.y * dt, z: player.velocity.z * dt }
  controller.computeColliderMovement(collider, desired, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS)
  const moved = controller.computedMovement()
  player.grounded = !jumped && controller.computedGrounded()

  // Blocked vertically: a ceiling stops the rise, the floor stops the fall.
  if (player.velocity.y > 0 && moved.y < desired.y * 0.5) player.velocity.y = 0
  if (player.grounded && player.velocity.y < 0) player.velocity.y = Math.max(player.velocity.y, -2)
  // Horizontal velocity is left alone: the controller already slides along walls,
  // and scaling it by moved/desired would also bleed speed on every ramp and step.
  // A bike is the exception: held against a wall for a moment it stops (not on
  // the first blocked tick: autostep may need a couple to get it up a ledge);
  // a glancing scrape costs a little speed.
  if (wasRiding) {
    const b = player.bike
    const want = Math.hypot(desired.x, desired.z)
    const got = Math.hypot(moved.x, moved.z)
    const r = want > 1e-4 ? got / want : 1
    b.stuck = r < 0.5 ? b.stuck + dt : 0
    if (b.stuck > 0.2) b.speed = Math.sign(b.speed) * Math.min(Math.abs(b.speed), got / dt)
    else if (r < 0.9) b.speed *= 1 - (1 - r) * Math.min(1, dt * 3)
  }

  const t = body.translation()
  const next = { x: t.x + moved.x, y: t.y + moved.y, z: t.z + moved.z }
  body.setNextKinematicTranslation(next)
  player.position.x = next.x
  player.position.y = next.y - HALF
  player.position.z = next.z

  if (player.position.y < PHYSICS.killY) {
    respawn()
    return
  }

  // The body turns toward its heading; in first person it always faces the view.
  // On a bike the heading is the bike's (pedalBike steers it).
  if (wasRiding) return
  if (isFirstPerson()) player.facing = yaw + Math.PI
  else if (Math.hypot(wishX, wishZ) > 0.05) {
    player.facing = rotateTowards(player.facing, Math.atan2(wishX, wishZ), PHYSICS.turnSpeed * dt)
  }
}

// Called once per frame after the physics ticks: interpolated feet position.
export function interpolate() {
  const p = player.position
  const r = player.renderPosition
  r.x = prev.x + (p.x - prev.x) * alpha
  r.y = prev.y + (p.y - prev.y) * alpha
  r.z = prev.z + (p.z - prev.z) * alpha
}
