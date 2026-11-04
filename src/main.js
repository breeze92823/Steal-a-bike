import { ACESFilmicToneMapping, Clock, Group, PCFSoftShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import { CAMERA, graphicsPreset, LAYOUT, RENDER, RIDE, SPAWN } from './config.js'
import * as bloxity from './bloxity.js'
import { install as installInput, onKey, releaseInput } from './input.js'
import { installTouch } from './touch.js'
import { createPlayerBody, interpolate as interpolatePlayer, player, resetPlayer, respawn, rideTop } from './player.js'
import { setCameraSensitivity, syncYawToPlayer, update as updateCamera } from './camera.js'
import { onModeChanged, toggleMode } from './modes.js'
import { bodyCount, initPhysics, stepPhysics } from './physics.js'
import { createLighting } from './lighting.js'
import { createWorld } from './world.js'
import { buildLobby } from './lobby.js'
import { buildMarket } from './market.js'
import { buildValley } from './valley.js'
import { setParticleScale, updateFx } from './fx.js'
import { createLane } from './lane.js'
import { installAudio, setAdBreak, updateAudio } from './audio.js'
import { createHud } from './hud.js'
import { createShops } from './shops.js'
import { createTraining } from './training.js'
import { createChaseHud } from './chasehud.js'
import { createHeist } from './heist.js'
import { createBase } from './base.js'
import { bikeModel } from './bikes3d.js'
import { initNet, sendBase, sendEmote, sendLoadout, sendPose, syncAvatar } from './net.js'
import { createPlots } from './plots.js'
import { createBubble } from './bubble.js'
import { playEmote } from './avatar/emotes.js'
import { createRemotePlayers } from './remotePlayers.js'
import { equippedTrail } from './trailshop.js'
import { createTrail } from './trails.js'
import { createItems } from './items.js'
import { bicycle } from './kit.js'
import { createPostFx } from './postfx.js'
import { setNeonBloom } from './propkit.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'

// Boot order: Bloxity SDK -> renderer -> Rapier (async wasm) -> ground + sky + lighting,
// player body -> avatar (async, swaps in when ready) -> loop. The SDK is optional at every step.
let lighting = null
let renderer = null
let postfx = null

// Settings come from the portal's settings menu (or their defaults offline).
function applySetting(key, value) {
  if (key === 'camera_sensitivity') setCameraSensitivity(value)
  else if (key === 'fullscreen') bloxity.requestFullscreen(value)
  else if (key === 'graphics_quality' && renderer) {
    const next = graphicsPreset(value)
    renderer.shadowMap.enabled = next.shadows
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, next.dpr))
    lighting?.setShadows(next)
    postfx?.configure(next)
    setNeonBloom(next.bloom)
    postfx?.setSize(window.innerWidth, window.innerHeight)
  }
}
bloxity.onSetting(applySetting)
bloxity.init()

// --- Renderer ---------------------------------------------------------------
const preset = graphicsPreset(bloxity.settings.graphics_quality)
renderer = new WebGLRenderer({ antialias: preset.antialias, powerPreference: 'high-performance' })
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = RENDER.exposure
renderer.shadowMap.enabled = preset.shadows
renderer.shadowMap.type = PCFSoftShadowMap
renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.dpr))
document.body.appendChild(renderer.domElement)
installInput(() => bloxity.showMenu(), renderer.domElement) // Esc opens the portal menu

const scene = new Scene()
const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
postfx = createPostFx(renderer, scene, camera)
postfx.configure(preset)

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  postfx.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

for (const key of Object.keys(bloxity.settings)) applySetting(key, bloxity.settings[key])

// --- Physics + ground + sky --------------------------------------------------
bloxity.loadingStep('Starting physics')
await initPhysics()

lighting = createLighting(scene, renderer, preset)
const world = createWorld(scene) // clouds
bloxity.loadingStep('Building the lobby')
setParticleScale(preset.particles)
const lobby = buildLobby(scene) // ground, road, plots, garages, walls
const market = buildMarket(scene) // shops north of the road
const junction = buildValley(scene) // the road to the safe zone line
const hud = createHud()
const shops = createShops({
  hud,
  camera,
  // An Exclusive bike you bought: into your hands like a stolen one (base.hold), if they are free.
  give(name, value) {
    if (player.holding || heist.carrying || player.training) return hud.say('Place or sell your bike first!'), false
    base.hold(name, bikeModel(name), value)
    return true
  },
}) // Trail Shop, Sell Bikes, Exclusive Bikes (hold E at the stalls), Daily Rewards, Bike Index
createPlayerBody()
syncYawToPlayer()
installAudio()
// The zones north of the safe zone, built and shown as you approach them.
const lane = createLane(scene, { lighting, hud, hub: [...lobby.roots, market, junction] })
// Your treadmill: the one on your plot (plots.js moves you to the server's pick once connected).
const training = createTraining({ scene, hud, camera, mill: { ...lobby.plots[LAYOUT.myPlot].treadmill } })
lane.update(player.position, true)

// --- Player avatar ----------------------------------------------------------
// The Bloxity base rig (player.glb; procedural fallback if it fails), dressed
// with the signed-in player's equipped cosmetics and body proportions. It
// rebuilds on customizer edits and sign-in/out.
const playerGroup = new Group()
scene.add(playerGroup)
// Avatar + bike sit in `ride`, which pivots about the back axle for wheelies;
// `fall` rolls the lot over about the feet when the police knock you down.
const fall = new Group()
const axle = new Group()
const ride = new Group()
axle.position.set(0, RIDE.axleY * RIDE.bikeScale, -RIDE.axleZ * RIDE.bikeScale)
ride.position.set(0, -RIDE.axleY * RIDE.bikeScale, RIDE.axleZ * RIDE.bikeScale)
axle.add(ride)
fall.add(axle)
playerGroup.add(fall)
let avatar = null
let animator = null
const bubble = createBubble(playerGroup, 3.45) // your Bloxity chat line, over your head
let generation = 0
let avatarReady = false

function setAvatar(next) {
  if (avatar) ride.remove(avatar)
  disposeAnimator(animator)
  avatar = next
  ride.add(avatar)
  animator = makeAnimator(avatar)
}

setAvatar(buildDefaultCharacter()) // visible immediately; replaced once the rig loads

// Your bike, under the avatar while you ride it (Ride My Bike) or train on your treadmill; its wheels roll with your speed.
const myBike = bicycle()
myBike.rotation.y = -Math.PI / 2 // the kit's +X front to the avatar's forward (+Z)
myBike.scale.setScalar(RIDE.bikeScale)
myBike.visible = false
ride.add(myBike)

// The bike you got away with, walked beside you (follows your position and facing,
// not the wheelie/knockdown pivots), and your base where you park it.
const holder = new Group()
playerGroup.add(holder)
const base = createBase({ hud, camera, holder })

// The game server (saves, the MOST CASH board, other players). Every saved window has registered
// itself by now; the server's save is applied once the connection answers.
const remotes = createRemotePlayers(scene)
const myTrail = createTrail(scene)
initNet({ hud })

// Every plot is a player's base (plots.js): yours from your own state, everyone else's from the
// roster. When the server gives you a plot, your base, treadmill and spawn point move there (and
// so do you, if you haven't wandered off yet).
const spawnDx = SPAWN.x - LAYOUT.plotCenters[LAYOUT.myPlot]
const plots = createPlots(scene, lobby.plots, {
  mine: () => ({ name: bloxity.displayName(), floors: base.floors, placed: base.placed, treadmill: training.level }),
  onMine(plot) {
    base.setPlot(plot)
    training.setMill(plot.treadmill)
    const atSpawn = Math.hypot(player.position.x - SPAWN.x, player.position.z - SPAWN.z) < 12
    SPAWN.x = plot.cx + spawnDx // R and falls bring you back to your own base
    if (atSpawn && !player.holding && !player.training) {
      resetPlayer(SPAWN, player.facing)
      syncYawToPlayer()
    }
  },
})
let sentBase = -1
let sentLevel = -1

// Stealing bikes from the guard posts and the chase home (the guards and bikes
// registered themselves as their zones were built).
const heist = createHeist({ scene, camera, hud: createChaseHud(hud), lane, rig: ride, onEscape: (b, model) => base.hold(b.name, model, b.value) })
// The chase items on the hotbar (bat, barbed wire, oil, smoke, nitro) and the crates that drop during a chase.
const items = createItems({ scene, hud, heist, lane, rig: ride, canvas: renderer.domElement })

async function loadAvatar() {
  // The SDK fires twice per change (optimistic + confirmed); only the newest load may land.
  const mine = ++generation
  try {
    const group = await loadBaseCharacter()
    if (mine !== generation) return
    const equipped = bloxity.authState.user ? bloxity.getEquippedAvatar() : null
    await attachEquippedAccessories(group, equipped, { skinTextureUrl: bloxity.getSkinTextureUrl() })
    if (mine !== generation) return
    applyProportions(group, bloxity.authState.user ? bloxity.getProportions() : null)
    setAvatar(group)
    syncAvatar() // the others see the new look
  } finally {
    if (mine === generation) avatarReady = true
  }
}

let signedIn = null
bloxity.subscribeAuth((s) => {
  const now = !!s.user
  if (now !== signedIn) {
    signedIn = now
    loadAvatar() // also runs once at start to swap in the real rig
  }
})
bloxity.onAvatarChanged(loadAvatar)
bloxity.onProportionsChanged(() => {
  applyProportions(avatar, bloxity.getProportions())
  syncAvatar()
})
bloxity.onRespawnRequest(respawn)
bloxity.onChat((uid, text, seconds, local) => {
  if (local) bubble.say(text, seconds)
  else remotes.say(uid, text, seconds)
})
bloxity.onEmote((id) => {
  playEmote(() => animator, id)
  sendEmote(id)
})
bloxity.onPointerLock((locked) => locked || releaseInput())

// An ad break freezes the world and silences it. The room stays joined.
let adBreak = false
bloxity.onAdBreak((on) => {
  adBreak = on
  setAdBreak(on)
  releaseInput()
})

// --- Modes + keys --------------------------------------------------------------
onModeChanged((mode) => {
  playerGroup.visible = mode !== 'player' // first person: you are the camera
})
onKey('KeyV', toggleMode)
onKey('KeyN', () => lighting.toggleDayNight())
onKey('KeyR', respawn)
installTouch({ mode: toggleMode, day: () => lighting.toggleDayNight(), respawn })

// --- Loop -------------------------------------------------------------------
const clock = new Clock()
let shownLoading = true
let readySince = 0

const round2 = (n) => Math.round(n * 100) / 100

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1) // clamp huge frames (tab switch, breakpoint)
  if (adBreak) return
  const elapsed = clock.elapsedTime

  player.counter = hud.speed
  player.topSpeed = rideTop(hud.speed) * items.boost // treadmill training makes your bike faster (Nitro, for a moment)
  stepPhysics(dt) // runs the player controller + world at the fixed rate, interpolates bodies
  interpolatePlayer()

  const p = player.renderPosition
  playerGroup.position.set(p.x, p.y, p.z)
  playerGroup.rotation.y = player.facing
  training.update(dt)
  heist.update(dt, elapsed)
  items.update(dt, elapsed)
  base.update(dt)
  const train = training.state
  holder.visible = !player.riding // the held bike's tag hides while you ride it
  const onBike = player.riding || train.active
  const speed = train.active ? train.pedal : Math.hypot(player.velocity.x, player.velocity.z)
  // Riding while holding a bike (e.g. a bought Abyss): that very bike is under you.
  base.setRiding(player.riding && !heist.carrying && !train.active, ride, RIDE.bikeScale)
  const ridingHeld = player.riding && !!player.holding && !heist.carrying && !train.active
  myBike.visible = onBike && !heist.carrying && !ridingHeld // a stolen bike shows its own model
  const wheels = heist.carrying ? heist.rideModel?.userData.wheels : ridingHeld ? base.heldModel?.userData.wheels : myBike.userData.wheels
  if (onBike && wheels) for (const w of wheels) w.rotation.z -= (speed * dt) / (0.42 * RIDE.bikeScale)
  axle.rotation.x = -(train.wheelie + heist.pitch) // front wheel up
  fall.rotation.z = heist.roll - player.bike.lean // knocked over, or leaning into a turn
  fall.position.y = heist.lift
  animator?.update(dt, {
    grounded: player.grounded,
    speed: heist.knocked ? 0 : speed,
    verticalVelocity: player.velocity.y,
    turn: 0,
    riding: onBike,
    seatLift: RIDE.seatLift,
    holding: !!player.holding,
  })

  // Others see where you are, what you ride and your trail (net.js throttles and skips duplicates).
  sendPose({ x: round2(p.x), y: round2(p.y), z: round2(p.z), yaw: round2(player.facing), speed: round2(speed), state: onBike ? 1 : player.holding ? 2 : 0 })
  sendLoadout({ trail: equippedTrail()?.id ?? '', bike: player.holding ?? '' })
  myTrail.update(dt, equippedTrail()?.id ?? '', p.x, p.y, p.z) // your own, so you see what they see
  remotes.update(dt, p)
  if (base.version !== sentBase || training.level !== sentLevel) {
    sentBase = base.version
    sentLevel = training.level
    sendBase({ floors: base.floors, placed: base.placed, treadmill: training.level })
    plots.refresh()
  }
  plots.update(dt, p)
  bubble.update(dt)

  updateCamera(camera, dt)
  world.update(dt, elapsed)
  lane.update(player.position)
  updateFx(dt, elapsed)
  updateAudio(dt, player.renderPosition)
  hud.update(dt)
  shops.update(dt)
  lighting.update(dt, playerGroup.position)
  postfx.render()

  // Loading ends once the scene has drawn and the avatar has had its chance (max ~5 s).
  if (shownLoading) {
    readySince += dt
    if (avatarReady || readySince > 5) {
      shownLoading = false
      bloxity.notifyFirstFrame()
    }
  }
}
renderer.setAnimationLoop(frame)

window.addEventListener('beforeunload', bloxity.teardown)

// Dev-only console hook, e.g. __game.teleport(-24, 0, 6, Math.PI / 2)
if (import.meta.env.DEV) {
  const teleport = (x, y, z, facing = player.facing) => {
    resetPlayer({ x, y, z }, facing)
    syncYawToPlayer()
  }
  window.__game = { player, scene, renderer, camera, postfx, bodies: bodyCount, toggleMode, teleport, lane, training, hud, heist, base, items, plots, frame } // frame(): one loop step by hand (a hidden tab draws none)
}
