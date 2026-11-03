// Every tunable constant lives here; the rest of src/ holds no theme values.

// --- Identity -------------------------------------------------------------
export const GAME_SLUG = 'steal-a-bike' // slug registered on bloxity.io
export const GAME_TITLE = 'Steal a Bike'

// Forces the Bloxity SDK and avatar CDN to be treated as unavailable (see .env.example).
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// --- World (metres: +X east, +Z south, +Y up) -------------------------------
export const GROUND_Y = 0
// The lobby (lobby.js, market.js, valley.js): one flat lego plaza walled in by
// purple terraces. An east-west road splits it: the bike plots on the south side,
// the shops on the north side, and in the middle a short road north through the
// SAFE ZONE line into the grass valley between brown cliffs.
export const LAYOUT = {
  minX: -80, maxX: 80, // inner faces of the west / east walls
  southZ: 42, // inner face of the south wall
  northZ: -18, // inner face of the north wall (either side of the valley)
  road: { z: 0, halfWidth: 4, curb: 0.4 }, // E-W road, orange curb strip on each edge
  junction: { halfWidth: 6, northZ: -13 }, // the stub of road north to the safe zone
  safeZoneZ: -16, // the red line where the grass starts
  valley: { halfWidth: 26, cliffHeight: 26 }, // the lane north of the safe zone (zones 1, 2, ...)
  wallHeight: 24,
  // Plots south of the road: centre x of each, west to east. Columns (west to
  // east) are pad / pad / path / pad, rows are pads; the treadmill sits at the
  // north end of the path.
  plotCenters: [-66.5, -44.5, -22.5, -0.5, 21.5, 43.5, 65.5],
  plotOwners: [null, null, null, 'me', 'BikeBandit88', 'MotoMaverick', null], // placeholder neighbours until multiplayer
  plotZ: 12, // north edge of every plot
  plotColumns: [4.5, 4.5, 3.5, 4.5], // widths, m
  plotRows: 4,
  plotRowDepth: 4.5,
  treadmillZ: 5.2, // north end (console) of each treadmill
  stud: 2, // m per stud texture tile (6 studs)
}
// The north lane (valley.js + zone1..4.js): zones one after another from the
// SAFE ZONE line, each with its own floor height and a guard post. endZ = the
// zone's north edge, y = its floor, post = [x, z] of the post's centre,
// recommended = what the post's sign says, rec = that speed as a number (sets
// how fast the post's guard chases you, see RIDE.power).
export const LANE = {
  zone1: { endZ: -55, y: 0, post: [20.5, -31], portal: [-19, -46], rec: 200 }, // grass; Halloween portal while the event is open
  zone2: { endZ: -88, y: 0.7, post: [-19, -80], recommended: '600', rec: 600 }, // raised grass plateau
  zone3: { endZ: -129, y: 0, post: [15, -112], recommended: '4K', rec: 4e3 }, // sand, cacti, yellow-topped cliffs
  zone4: { endZ: -168, y: 0.25, post: [-8, -160], recommended: '20K', rec: 20e3 }, // snow basin walled in by ice
  gate: { halfWidth: 15, height: 15, depth: 12, archRise: 7 }, // ice wall across zone 4's north end, arch over the gap
}
// The lane's worlds after the four hand-built zones (Plain World, Lake, Desert,
// Snow): the Bike Index's worlds in order (zones.js builds them, lane.js
// streams them in). Each theme: `name` (= its INDEX_WORLDS name, whose bikes
// stand in its bays), `rec` (the "Recommended" speed), its `guard` (a fleet.js /
// police.js vehicle, mark, display name), floor + patch colours, cliff colours
// (`wall`, a terraceWall theme), decor recipes [name, count, where, opts]
// (where = 'edge' by the cliffs, 'scatter' over the floor, 'sky' overhead,
// 'far' out beyond the cliffs, 'center' down the middle; names are DECOR
// builders in decor.js), a `hero` set piece, weather particles, drifting
// motes, a lighting `mood` (over the day sky; null = plain day), an ambience
// `sound` (audio.js BEDS) and `dark` (night-time: guards drive with headlights).
// Only Magma, Cosmic and Aurora Nexus are dark; the rest are daylight.
export const MOODS = {
  amethyst: { zenith: '#6a8aff', horizon: '#ecdcff', sunColor: '#fff4ff', sunIntensity: 2.1, hemiSky: '#efe0ff', hemiGround: '#7a5ab8', hemiIntensity: 0.95 },
  magma: { zenith: '#120404', horizon: '#8a2208', sunColor: '#ff7a3a', sunIntensity: 0.55, hemiSky: '#ff6a3a', hemiGround: '#140404', hemiIntensity: 0.45, envIntensity: 0.25, exposure: 1.2, stars: 0.3, fogNear: 30, fogFar: 220 },
  dusk: { zenith: '#3a3a8a', horizon: '#ff9a6a', sunColor: '#ffb07a', sunIntensity: 1.6, hemiSky: '#ffc8a0', hemiGround: '#6a4a5a', hemiIntensity: 0.8, exposure: 1.0 },
  sunset: { zenith: '#5a3a9a', horizon: '#ffb84a', sunColor: '#ffcf80', sunIntensity: 2.0, hemiSky: '#ffd8a0', hemiGround: '#a06a3a', hemiIntensity: 0.9 },
  golden: { zenith: '#ffb84a', horizon: '#ffe8a8', sunColor: '#ffe0a0', sunIntensity: 1.7, hemiSky: '#ffe8b8', hemiGround: '#a07830', hemiIntensity: 0.75, envIntensity: 0.4, exposure: 0.85 },
  mist: { zenith: '#7a8a9a', horizon: '#c8d0d8', sunColor: '#e8eef4', sunIntensity: 1.4, hemiSky: '#d8e0e8', hemiGround: '#6a7a6a', fogNear: 30, fogFar: 180 },
  swamp: { zenith: '#3a5a4a', horizon: '#9ab89a', sunColor: '#d8f0b0', sunIntensity: 1.2, hemiSky: '#b8d8a8', hemiGround: '#3a4a2a', fogNear: 25, fogFar: 160 },
  underwater: { zenith: '#0a4a8a', horizon: '#2ab0d8', sunColor: '#9fe8ff', sunIntensity: 1.3, hemiSky: '#6ad0ff', hemiGround: '#0a3a5a', hemiIntensity: 1.1, fogNear: 30, fogFar: 200 },
  abyss: { zenith: '#020a1a', horizon: '#0a2a4a', sunColor: '#4a8aff', sunIntensity: 0.5, hemiSky: '#2a5aaa', hemiGround: '#020a14', hemiIntensity: 0.6, envIntensity: 0.25, exposure: 1.2, stars: 0.5, fogNear: 20, fogFar: 150 },
  cave: { zenith: '#1a1030', horizon: '#3a2a5a', sunColor: '#c8a0ff', sunIntensity: 0.9, hemiSky: '#8a6ac8', hemiGround: '#1a1024', hemiIntensity: 0.7, envIntensity: 0.3, exposure: 1.15, fogNear: 40, fogFar: 220 },
  lava: { zenith: '#3a0a0a', horizon: '#ff5a1a', sunColor: '#ff8a4a', sunIntensity: 1.6, hemiSky: '#ff8a5a', hemiGround: '#3a0a0a', hemiIntensity: 0.8, exposure: 1.05, fogNear: 40, fogFar: 260 },
  blizzard: { zenith: '#9ab0c8', horizon: '#e0ecf4', sunColor: '#ffffff', sunIntensity: 1.5, hemiSky: '#e8f2ff', hemiGround: '#8aa0b8', fogNear: 20, fogFar: 140 },
  aurora: { zenith: '#04102a', horizon: '#1a5a6a', sunColor: '#8affd8', sunIntensity: 0.6, hemiSky: '#4ac8b0', hemiGround: '#0a1a2a', hemiIntensity: 0.6, envIntensity: 0.3, exposure: 1.2, stars: 1 },
  ice: { zenith: '#4a9ad8', horizon: '#c8f0ff', sunColor: '#e8f8ff', sunIntensity: 2.2, hemiSky: '#d8f4ff', hemiGround: '#6aa0c8' },
  spooky: { zenith: '#0a0a1a', horizon: '#4a3a6a', sunColor: '#a8b8ff', sunIntensity: 0.6, hemiSky: '#6a5a9a', hemiGround: '#1a1420', hemiIntensity: 0.6, envIntensity: 0.25, exposure: 1.2, stars: 0.8, fogNear: 30, fogFar: 200 },
  witch: { zenith: '#1a0a2a', horizon: '#5a2a7a', sunColor: '#b88aff', sunIntensity: 0.8, hemiSky: '#8a5ac8', hemiGround: '#1a0a1a', hemiIntensity: 0.7, exposure: 1.15, stars: 0.6, fogNear: 30, fogFar: 200 },
  candy: { zenith: '#ff8ad8', horizon: '#ffe0f4', sunColor: '#fff0f8', sunIntensity: 2.2, hemiSky: '#ffe0f0', hemiGround: '#d8a0c8' },
  neon: { zenith: '#05051a', horizon: '#3a1a5a', sunColor: '#c8a0ff', sunIntensity: 0.6, hemiSky: '#6a4aaa', hemiGround: '#100820', hemiIntensity: 0.7, envIntensity: 0.35, exposure: 1.2, stars: 0.4, fogNear: 50, fogFar: 260 },
  cyber: { zenith: '#000814', horizon: '#003a5a', sunColor: '#3ff0ff', sunIntensity: 0.6, hemiSky: '#2a8aaa', hemiGround: '#000a10', hemiIntensity: 0.6, envIntensity: 0.3, exposure: 1.2, stars: 0.6 },
  smog: { zenith: '#6a6a5a', horizon: '#b8a888', sunColor: '#ffd8a0', sunIntensity: 1.5, hemiSky: '#c8b898', hemiGround: '#5a4a3a', fogNear: 40, fogFar: 240 },
  heaven: { zenith: '#7ac8ff', horizon: '#fff4dc', sunColor: '#fff0c8', sunIntensity: 1.8, hemiSky: '#f4f8ff', hemiGround: '#c8b890', hemiIntensity: 0.8, envIntensity: 0.4, exposure: 0.82 },
  storm: { zenith: '#2a3040', horizon: '#6a7484', sunColor: '#c8d0e0', sunIntensity: 0.9, hemiSky: '#8a94a8', hemiGround: '#2a2a30', hemiIntensity: 0.7, fogNear: 30, fogFar: 200 },
  jade: { zenith: '#2a8a6a', horizon: '#c8f0d8', sunColor: '#fff0c0', sunIntensity: 2.0, hemiSky: '#d8ffe8', hemiGround: '#4a8a5a' },
  dragon: { zenith: '#2a0a1a', horizon: '#c84a2a', sunColor: '#ffb04a', sunIntensity: 1.4, hemiSky: '#ff9a6a', hemiGround: '#2a0a0a', hemiIntensity: 0.8, exposure: 1.1 },
  celestial: { zenith: '#0a0a3a', horizon: '#6a4ac8', sunColor: '#d8c8ff', sunIntensity: 1.0, hemiSky: '#a08aff', hemiGround: '#1a1040', hemiIntensity: 0.8, envIntensity: 0.4, exposure: 1.15, stars: 1 },
  space: { zenith: '#000004', horizon: '#1a0a3a', sunColor: '#ffffff', sunIntensity: 1.6, hemiSky: '#6a5aaa', hemiGround: '#05030a', hemiIntensity: 0.6, envIntensity: 0.3, exposure: 1.15, stars: 1, fogNear: 300, fogFar: 1100 },
  moon: { zenith: '#000004', horizon: '#14141e', sunColor: '#ffffff', sunIntensity: 2.2, hemiSky: '#8a8a9a', hemiGround: '#1a1a1e', hemiIntensity: 0.5, envIntensity: 0.3, stars: 1, fogNear: 300, fogFar: 1100 },
  rainbow: { zenith: '#6a5aff', horizon: '#ffd8f8', sunColor: '#ffffff', sunIntensity: 2.2, hemiSky: '#fff0ff', hemiGround: '#a0c8ff', exposure: 1.0, stars: 0.3 },
}
const W = (main, alt, top, band = null, leaves = ['#45b83a', '#5bcf47', '#3aa832']) => ({ main, alt, panel: alt, top, band, ledge: null, leaves, windows: false })
const DARK = ['#3a3a3a', '#2a2a2a', '#4a4a4a']
const SNOWY = ['#3db3c4', '#f2fbff', '#e6f6ff']
export const ZONE_THEMES = [
  { name: 'Jungle', rec: 75e3, guard: { kind: 'jungleTank', mk: 0, name: 'Police Tank' }, floor: '#4cc236', patch: '#5fd248', wall: W('#8a6a3a', '#9a7a48', '#3fb83a'), decor: [['tree', 12, 'edge'], ['palm', 8, 'edge'], ['bamboo', 10, 'edge'], ['flowers', 8, 'scatter'], ['rock', 3, 'scatter', { color: '#8a8a7a' }]], hero: ['treeHouse', {}], weather: [{ kind: 'fall', colors: ['#7fd84a', '#c8f080', '#ffe14a'], count: 60, size: 0.28, speed: 0.6, sway: 1.4 }], motes: ['#e8ffb0', '#ffe14a'], mood: null, sound: 'jungle', gate: '#7dff3a' },
  { name: 'Swamp', rec: 225e3, guard: { kind: 'policeHeli', mk: 0, name: 'Police Helicopter' }, floor: '#4f8a3c', patch: '#5f9a4a', wall: W('#6a6a5a', '#7a7a68', '#5fbf3a', null, ['#3a7a2a', '#4a8a3a', '#2a6a2a']), decor: [['mushroom', 6, 'edge', { cap: '#ff8ad8', height: 3.6 }], ['mushroom', 6, 'scatter', { cap: '#b07bff', height: 2 }], ['mushroom', 4, 'scatter', { cap: '#ff5a6a', height: 1.5 }], ['waterPool', 3, 'scatter', { color: '#3fb8a8', w: 7, d: 4 }], ['tree', 6, 'edge', { leaves: ['#3a7a2a', '#4a8a3a', '#2a6a2a'] }]], hero: ['giantMushroom', { cap: '#ff7ad8' }], weather: [{ kind: 'rise', colors: ['#c8ff6a', '#ffe14a'], count: 50, size: 0.22, speed: 0.4 }], motes: ['#c8ff6a', '#ffe14a'], mood: null, sound: 'swamp', gate: '#c8ff6a' },
  { name: 'Candy', rec: 600e3, guard: { kind: 'monsterTruck', mk: 0, name: 'Police Monster Truck' }, floor: '#ffb8d8', patch: '#ffd0e8', wall: W('#ff8ac8', '#ff9ad4', '#ffffff', '#5fd8ff', ['#ff5fa8', '#ffd23a', '#5fd8ff']), decor: [['candy', 20, 'edge'], ['candy', 8, 'scatter'], ['cloudPuff', 6, 'edge']], hero: ['rainbow', {}], weather: [{ kind: 'fall', colors: ['#ff5fa8', '#ffd23a', '#5fd8ff', '#7dff3a', '#ffffff'], count: 140, size: 0.22, speed: 0.9, soft: false }], motes: ['#fff0f8'], mood: 'candy', sound: 'candy', gate: '#ff5fa8' },
  { name: 'Crystal', rec: 2e6, guard: { kind: 'flyingCar', mk: 0, name: 'Flying Police Car' }, floor: '#7a5ce0', patch: '#8a6cf0', wall: W('#5a3ab8', '#6a4ac8', '#8a6a4a', '#3ff0ff', ['#b07bff', '#d8b0ff', '#8a5aea']), decor: [['crystal', 12, 'edge', { color: '#3ff0ff' }], ['crystal', 8, 'scatter', { color: '#b07bff' }], ['crystal', 4, 'scatter', { color: '#ff7ad8' }], ['orb', 6, 'sky', { color: '#3ff0ff' }]], hero: ['heroCrystal', { color: '#3ff0ff' }], weather: [{ kind: 'rise', colors: ['#d8b0ff', '#3ff0ff'], count: 90, size: 0.28, speed: 0.3, soft: false }], motes: ['#e8d8ff'], mood: 'amethyst', sound: 'crystal', gate: '#3ff0ff' },
  { name: 'Magma', rec: 6e6, dark: true, guard: { kind: 'hoverTank', mk: 2, name: 'Hover Tank' }, floor: '#2a2a2e', patch: '#3a2a2a', wall: W('#2a2024', '#34282c', '#4a3030', '#ff5a1a', DARK), decor: [['lavaPool', 5, 'scatter', { w: 9, d: 4 }], ['rock', 10, 'edge', { color: '#2a2024' }], ['torch', 6, 'edge', { color: '#ff5a1a' }], ['bones', 2, 'scatter']], hero: ['volcano', {}], weather: [{ kind: 'rise', colors: ['#ffb02a', '#ff5a1a'], count: 140, size: 0.22, speed: 1.5, bright: 2.2 }, { kind: 'fall', colors: ['#5a5a5a'], count: 60, size: 0.3, speed: 0.5, bright: 0.6 }], motes: ['#ff8a1a'], mood: 'magma', sound: 'lava', gate: '#ff5a1a' },
  { name: 'Cosmic', rec: 20e6, dark: true, guard: { kind: 'policeSaucer', mk: 0, name: 'Police Saucer' }, floor: '#100a24', patch: '#1a1034', wall: W('#0a0618', '#120a24', '#3a1a6a', '#ff3cb4', ['#3a1a6a', '#5a2a8a', '#2a1a4a']), decor: [['orb', 18, 'sky', { color: '#ff7ad8' }], ['crystal', 8, 'edge', { color: '#ff3cb4' }], ['crater', 5, 'scatter'], ['planet', 2, 'far', { color: '#ff8a5a', size: 16, ring: '#ffd27a' }]], hero: ['planet', { color: '#3a8aff', size: 12 }], weather: [{ kind: 'fall', colors: ['#ffffff', '#ff7ad8', '#3ff0ff'], count: 160, size: 0.2, speed: 0.3, soft: false, bright: 2.2 }], motes: ['#ff7ad8', '#3ff0ff'], mood: 'space', sound: 'space', gate: '#ff3cb4' },
  { name: 'Aurora Nexus', rec: 60e6, dark: true, guard: { kind: 'hoverTank', mk: 3, name: 'Hover Tank Mk III' }, floor: '#d8e8f4', patch: '#c8dcec', wall: W('#5a7a9a', '#6a8aaa', '#f4fbff', '#3fffb0', SNOWY), decor: [['pine', 12, 'edge', { snow: true }], ['iceSpike', 6, 'scatter'], ['beam', 4, 'edge', { color: '#3fffb0' }], ['orb', 8, 'scatter', { color: '#8affd8' }]], hero: ['heroCrystal', { color: '#3fffb0' }], weather: [{ kind: 'fall', colors: ['#ffffff'], count: 80, size: 0.25, speed: 0.8 }], motes: ['#8affd8', '#b07bff'], mood: 'aurora', sound: 'aurora', gate: '#3fffb0', aurora: true },
  { name: 'Angel Biome', rec: 200e6, guard: { kind: 'policeSaucer', mk: 4, name: 'Golden Saucer' }, floor: '#e4ecf8', patch: '#f0f4fc', wall: W('#e8f0ff', '#f4f8ff', '#ffffff', '#ffd23a', ['#ffffff', '#fff4d0', '#f0f8ff']), decor: [['cloudPuff', 16, 'edge'], ['statue', 6, 'edge', { color: '#f4f0e0', halo: true }], ['pillar', 8, 'edge', { color: '#f4f0e0' }], ['beam', 6, 'scatter', { color: '#fff2b0' }]], hero: ['fountain', {}], weather: [{ kind: 'fall', colors: ['#ffffff', '#fff4d0'], count: 90, size: 0.4, speed: 0.4, sway: 1.5 }], motes: ['#ffe88a'], mood: 'heaven', sound: 'heaven', gate: '#ffd23a' },
]

// Shape of the generated zones: length, how much each floor climbs, streaming.
export const ZONE_GEN = {
  length: 48, // m per zone
  rise: 0.5, // m each zone's floor sits above the last
  ahead: 2, // zones built and shown ahead of yours
  behind: 1, // ... and behind
}
// Sound (audio.js).
export const AUDIO = { volume: 0.7, bedVolume: 0.55, crossfade: 2, snoreRange: 22, fallRange: 34 }

// Riding a bike (yours or a stolen one), player.js. The speed counter (trained
// on the treadmill) sets your top speed against the lane zones' Recommended
// speeds: at zone k's Recommended speed you top out at `top` x perZone^(k-1)
// m/s (zone 1 = `top`), in a straight line between one zone's speed and the
// next, from `zero` x top at a counter of 0, flat past the last zone. A zone's
// guard chases at HEIST.chaseShare of what its Recommended speed gives you,
// and faster the further your counter is short of it (HEIST.underTrained).
// The bike itself has momentum: it pedals up to speed (`accel`, fading toward
// the top), coasts (`roll` + `drag` x v^2), brakes when you pull back, and
// steers along its heading, turning no tighter than `grip` (m/s^2 sideways)
// allows at speed, leaning into the turn (`maxLean`).
export const RIDE = {
  seatLift: 0.45, // how far the rider sits up
  bikeScale: 1.25,
  axleY: 0.42, // the kit bicycle's back axle (height, distance behind centre) that wheelies pivot on
  axleZ: 0.58,
  top: 19, // m/s at zone 1's Recommended speed
  perZone: 1.1, // x top speed per zone Recommended speed
  zero: 0.75, // share of `top` with a counter of 0
  accel: { pedal: 8, motor: 11 }, // m/s^2 pulling away (fading near top speed)
  brake: 13, // m/s^2 pulling back on the stick
  reverse: 2.5, // m/s you walk it backwards once stopped
  roll: 0.5, // m/s^2 rolling resistance when coasting
  drag: 0.0035, // x v^2 air drag when coasting
  turnStill: 2.2, // rad/s you can swing the bars round at a standstill
  turnMax: 3.2, // rad/s steering at walking pace
  grip: 17, // m/s^2 sideways grip: the turn rate at speed v is at most grip / v
  maxLean: 0.62, // rad
  airTurn: 0.6, // share of steering while airborne
}
// Stealing a bike from a guard post: the STEAL prompt, the guard waking and
// giving chase (at `chaseShare` of the top speed its zone's Recommended speed
// gives you, driven like a real vehicle: `vehicles` per kind),
// what counts as caught, getting knocked off, and the bay refilling.
export const HEIST = {
  reach: 2.4, // m from a bay bike its STEAL prompt shows
  wake: 0.8, // s the guard takes to wake (the red "!") before he gives chase
  chaseShare: 0.94, // x your top speed at his zone's Recommended speed: trained to it, you just outrun him
  underTrained: 0.9, // short of it, he also gets your speed x this x the share you are short
  // How each kind of guard vehicle drives (a bicycle-model car: it steers its
  // front wheels up to `steer` rad at `steerRate` rad/s, turns about a wheelbase
  // of `wheelbase` x its length, and holds the road up to `grip` m/s^2 sideways
  // (past that it slides: tyre smoke and squeal); `accel` / `brake` m/s^2,
  // `roll` / `pitch` how far the body leans per m/s^2 (a bike leans into the turn).
  // Fliers bank and turn about their own centre.
  vehicles: {
    bike: { accel: 13, brake: 11, grip: 14, steer: 0.75, steerRate: 3.2, wheelbase: 0.62, roll: -0.045, pitch: 0.006 },
    car: { accel: 11, brake: 10, grip: 11, steer: 0.6, steerRate: 2.4, wheelbase: 0.6, roll: 0.012, pitch: 0.009 },
    tank: { accel: 8.5, brake: 8, grip: 8, steer: 0.55, steerRate: 1.6, wheelbase: 0.55, roll: 0.008, pitch: 0.007 },
    flier: { accel: 12, brake: 9, grip: 16, turn: 1.6, bank: -0.06, pitch: 0.012 },
  },
  lead: 1.2, // s at most a chasing guard aims ahead of where you are heading (to cut you off)
  giveUp: 150, // m behind you it stops chasing
  returnSpeed: 9, // m/s it drives back to its post
  returnTimeout: 30, // s; still not back by then, it is simply parked asleep again
  respawn: 20, // s before a bay you escaped with fills again
  drive: 3.5, // s the DRIVE! sign stays up
  wheelie: 0.55, // rad the front lifts with Shift
  knock: { speed: 7, up: 6, down: 1.3, getUp: 0.7 }, // caught: thrown off, lying, standing back up (s)
  dropped: 1.6, // s the lost bike lies on its side before it pops back to its bay
  mph: 2.237, // m/s -> MPH on the speedometer
  gears: 5,
  siren: { range: 120, volume: 0.32 },
  headlights: { intensity: 140, distance: 42, angle: 0.5 }, // the chasing guard's lamps in the dark zones
}
// Chase items (items.js): a hotbar of up to `slots` items, one slot each, `stack` of an item at most.
// Pick one (1-5 / tap its slot), then click (F, or the USE button on touch) while
// a guard chases you. Item crates drop on the lane ahead of you during a chase.
export const ITEMS = {
  slots: 5,
  stack: 5,
  start: [['bat', 1], ['wire', 2]], // what a new player has (then saved in localStorage `sab-items`)
  kinds: {
    bat: { name: 'Bat', reach: 5, stun: 3.5, knock: 7 }, // m from his nose you can hit him; s he sleeps; m/s he bounces back
    wire: { name: 'Barbed Wire', life: 16, width: 3.2, slow: 0.35, slowFor: 3.5, tyre: 0.25 }, // a coil behind you: speed share while snagged; instant speed share
    oil: { name: 'Oil Slick', life: 16, radius: 2.2, spinFor: 1.8 }, // a puddle behind you: he spins out
    smoke: { name: 'Smoke Bomb', blindFor: 4, slow: 0.55, radius: 9 }, // he loses you: wanders off at this speed share
    nitro: { name: 'Nitro', boost: 1.5, time: 3 }, // your speed x boost for time s
  },
  drop: 2.4, // m behind you a trap lands
  maxGroundHeight: 2.2, // m: fliers above this pass over wire and oil
  pickups: { every: [2.2, 4.5], max: 3, ahead: [16, 36], spread: 5, reach: 2, weights: { bat: 2, wire: 3, oil: 2, smoke: 2, nitro: 2 } }, // s between crates; crates on the lane at once; m ahead, m either side of you
}
// A bike you got away with (base.js): over the SAFE ZONE line you walk it by
// the handlebars (beside you on your right, its tag overhead, hotbar slot 3),
// then sell it at the SELL! stall (hold E) or press E on your plot to park it
// in the next free slot, where it earns its income $/s into your cash.
// slots = [column, row] pads of your plot in fill order (column 2 is the
// treadmill path; [3, 0] holds the Club Tourer). The top banner on your plot
// reads "You earn $X/12h Offline!" = income x offlineHours x offlineShare.
export const BASE = {
  hold: { x: -0.78, z: 0.3, scale: 1.15, tagX: -0.78, tagY: 5.0, tagHeight: 1.5 }, // the walked bike in the player's frame (+Z forward, -X right) and its tag
  slots: [[3, 1], [3, 2], [3, 3], [1, 0], [1, 1], [1, 2], [1, 3], [0, 0], [0, 1], [0, 2], [0, 3]],
  capacity: 6, // bikes your plot holds, the Club Tourer included ("Upgrade Plot 6 > 8 Bikes")
  margin: 0.6, // m outside the plot's pads that still counts as on it
  offlineHours: 12,
  offlineShare: 1,
}
// Training on your treadmill (training.js): walk onto the belt to mount your bike
// and pedal; every `tick` s you gain the level's rate in speed (the bike counter).
// The "x4 CLICK!" badge: each click pops a wheelie and pays `clickMult` ticks at once,
// then refills over `clickCooldown` s. Jump gets you off.
export const TRAINING = {
  tick: 1,
  rates: [1, 2, 4, 7, 12, 20, 32, 50], // speed per tick at level 1..8
  upgradeCash: [600, 2500, 9000, 30000, 90000, 250000, 700000], // to level 2..8
  upgradeGems: [11, 25, 50, 90, 150, 240, 380],
  clickMult: 4,
  clickCooldown: 0.45,
  pedalSpeed: 7, // speed fed to the pedalling animation and the wheels, m/s
  beltIdle: 0.9, // belt texture scroll, repeats/s
  beltTraining: 3.2,
  wheelie: { angle: 0.55, rise: 0.09, hold: 0.22, fall: 0.38 }, // rad, s up, s held, s down
  seat: 2.6, // m from the console end where the bike stands
  upgradeRange: 2.6, // m from the Upgrade Treadmill sign to show its button
}
export const PALETTE = {
  ground: '#d98a3c',
  road: '#5d5c80',
  roadLine: '#ffffff',
  curb: '#ff8a1c',
  pad: '#5b49c9',
  padLine: '#ff8a1c',
  path: '#aeb1ee',
  padEdge: '#2a2856',
  wall: '#5a3fc4',
  wallAlt: '#6a50d4',
  wallPanel: '#4f37b0',
  wallTop: '#f08a22',
  ledge: '#f5b625',
  window: '#9fa8f0',
  cliff: '#a85a3e',
  cliffTop: '#53c23c',
  grass: '#62d83c',
  brick: '#9b5b49',
  trunk: '#5b3a2a',
  leavesOrange: ['#ff8a1a', '#ffa21f', '#ff6f12'],
  leavesGreen: ['#45b83a', '#5bcf47', '#3aa832'],
  steel: '#25304c',
  treadFrame: '#b8dcf2',
  treadBelt: '#262e4a',
  safeLine: '#ff2440',
  puddle: '#58d4ff',
}
// Lobby countdowns (timers.js) in seconds, and the HUD's starting numbers (hud.js).
export const TIMERS = {
  event: { open: 240, closed: 1500, startLeft: 223 }, // Halloween event: open 4 min, back 25 min later
  race: { every: 300, startLeft: 174, nowFor: 8 }, // a race every 5 min; "Race is NOW!" for 8 s
  boost: 260, // s left on the x2 boost shown under the x2 Speed button
}
// Server-style announcements across the top of the screen (hud.js): every
// `every` s, shown for `show` s. `bike` is drawn in its rarity's colours.
export const ANNOUNCE = { first: 25, every: 90, show: 6, messages: [] }
export const HUD_START = { cash: 0, speed: 5, income: 10 } // speed = the bike counter (trained on the treadmill); income = treadmill $2/s + Club Tourer $8/s
export const SLOW_MODE_SCALE = 0.5 // walk/sprint speed with Slow Mode on

// Shop windows at the market stalls (shopwin.js): stand in a stall's glowing
// pool or disc (`zone`: a circle x, z, r or a box x, z, halfX, halfZ) and hold E,
// or hold the prompt on touch, for PROMPT.holdTime s. Walking PROMPT.slack m out
// of the zone closes the window. `anchor` is where the prompt floats.
export const PROMPT = { holdTime: 0.7, slack: 1.5 }
export const STALLS = {
  trails: { zone: { x: 32.5, z: -7, halfX: 5.6, halfZ: 3.4 }, anchor: { x: 32.5, y: 2.6, z: -9.5 } },
  sell: { zone: { x: -30, z: -7.4, r: 3.3 }, anchor: { x: -30, y: 2.6, z: -9.6 } },
  fuse: { zone: { x: -15.5, z: -7.4, r: 3.3 }, anchor: { x: -15.5, y: 2.6, z: -9.6 } },
  halloween: { zone: { x: -43, z: -7.4, r: 3.3 }, anchor: { x: -43, y: 2.6, z: -9.6 } },
}
// Bikes as the windows draw them (bikeart.js) and what they sell for.
// kind: bicycle / dirt / sport; body, accent, rim colours; skull on the tank.
export const BIKES = {
  BMX: { kind: 'bicycle', value: 300, body: '#ff2a2a', accent: '#ffffff', rim: '#c8ccd4' },
  'Supro Cub': { kind: 'dirt', value: 15e3, body: '#1a6cff', accent: '#ffffff', rim: '#d4d8e0' },
  'Phantom GT': { kind: 'sport', value: 12e4, body: '#f4f6ff', accent: '#a03aff', rim: '#ff4fd8' },
  MX09: { kind: 'dirt', value: 6e5, body: '#2a2e3a', accent: '#5a6070', rim: '#3fe0d0' },
  'Crimson Wyvern': { kind: 'sport', value: 5e6, body: '#d01a2a', accent: '#1a1a22', rim: '#ff3a3a' },
  'Phantom Wraith': { kind: 'dirt', value: 25e4, body: '#3fe8ff', accent: '#ffffff', rim: '#1aa8c8' },
  'Eclipse Reaper': { kind: 'sport', value: 1e8, body: '#1a1a26', accent: '#ffd21a', rim: '#b04aff', skull: true },
}
export const SELL_START = ['BMX'] // the bikes you can sell at the start (sellshop.js)
// Bike rarities: index tile colours (top, bottom), and the index reward for
// discovering one (speed added to the bike counter; cash = income x INDEX_REWARD.cashSeconds).
export const RARITIES = {
  Common: { bg: ['#ffffff', '#c4c6cc'], speed: 2 },
  Uncommon: { bg: ['#16ff16', '#00b400'], speed: 4 },
  Rare: { bg: ['#12b8ff', '#0a6ac8'], speed: 8 },
  Epic: { bg: ['#b40aff', '#7000c0'], speed: 15 },
  Legendary: { bg: ['#ffff10', '#b4b400'], speed: 30 },
  Mythical: { bg: ['#ff1010', '#a80000'], speed: 60 },
  Insane: { bg: ['#ff0a8e', '#bc0058'], speed: 120 },
  Secret: { bg: ['#4a4a4e', '#0c0c0e'], speed: 250 },
  Limited: { bg: ['#ff9a2a', '#a83400'], speed: 150 },
}
export const INDEX_REWARD = { cashSeconds: 45 }
// The Bike Index (bikeindex.js): every bike in the game, world by world.
// Each bike: [name, rarity, kind (bicycle / cargo / scooter / dirt / sport / cruiser), colour, income $/s].
// scene = the world's poster painter (bikeart.js). Bikes in BIKES above keep their own look.
export const INDEX_WORLDS = [
  { name: 'Plain World', scene: 'plain', bikes: [['BMX', 'Common', 'bicycle', '#ff2a2a', 4], ['Vispo', 'Common', 'scooter', '#7fd8ff', 5], ['Cream Courier', 'Common', 'cargo', '#f4e4c0', 6], ['Club Tourer', 'Common', 'bicycle', '#9fe0ff', 8], ['Doka', 'Uncommon', 'bicycle', '#3fdc4c', 12], ['Zip Scoot', 'Uncommon', 'scooter', '#ffd21a', 15]] },
  { name: 'Lake', scene: 'lake', bikes: [['Puddle Putt', 'Common', 'scooter', '#5fd8ff', 9], ['Ripple Moped', 'Common', 'scooter', '#ffffff', 10], ['Lagoon Vespa', 'Uncommon', 'scooter', '#3fe8c8', 18], ['Tide Cub', 'Uncommon', 'scooter', '#2a9cff', 22], ['Harbor Runner', 'Rare', 'scooter', '#ff6a3a', 40], ['Marina Moto', 'Rare', 'scooter', '#1a4fd8', 48]] },
  { name: 'Desert', scene: 'desert', bikes: [['Dune Racer', 'Uncommon', 'dirt', '#ff8a1a', 60], ['Desert Fox', 'Uncommon', 'dirt', '#ff9a2a', 70], ['Sand Viper', 'Rare', 'dirt', '#c03ad8', 110], ['Mirage', 'Rare', 'dirt', '#ffd27a', 125], ['Cactus Jack', 'Rare', 'dirt', '#3fb83a', 140], ['Sandstorm', 'Epic', 'cruiser', '#d8a050', 220], ['Pharaoh', 'Epic', 'cruiser', '#ffd21a', 260]] },
  { name: 'Snow', scene: 'snow', bikes: [['Snow Vispo', 'Uncommon', 'scooter', '#3a8cff', 300], ['Frost Bite', 'Uncommon', 'dirt', '#7ee03a', 340], ['Glacier GT', 'Rare', 'sport', '#26262e', 520], ['Yeti', 'Rare', 'dirt', '#e8f4ff', 580], ['Icicle', 'Rare', 'dirt', '#9fe8ff', 640], ['Blizzard', 'Epic', 'cruiser', '#d8ecf8', 900], ['Avalanche', 'Epic', 'cruiser', '#5a7a9a', 1050]] },
  { name: 'Jungle', scene: 'jungle', bikes: [['Vine Rider', 'Rare', 'dirt', '#3fb83a', 1400], ['Canopy', 'Rare', 'dirt', '#7fcf4a', 1600], ['Jaguar', 'Epic', 'dirt', '#ffb02a', 2400], ['Tiki Trail', 'Epic', 'dirt', '#c8642a', 2700], ['Monsoon', 'Epic', 'dirt', '#2a9cff', 3000], ['Temple Raider', 'Legendary', 'dirt', '#ffd23a', 4800], ['Kong', 'Legendary', 'dirt', '#5a3a2a', 5500]] },
  { name: 'Swamp', scene: 'swamp', bikes: [['Bog Hopper', 'Rare', 'dirt', '#5a8a3a', 6000], ['Mire', 'Rare', 'dirt', '#4a6a3a', 6800], ['Gator', 'Epic', 'dirt', '#3a7a2a', 9500], ['Croak', 'Epic', 'dirt', '#7ad83a', 10500], ['Mangrove', 'Epic', 'dirt', '#6a5a3a', 11500], ['Bayou King', 'Legendary', 'dirt', '#c8ff6a', 17000], ['Marsh Phantom', 'Legendary', 'cruiser', '#2a3a2a', 19000]] },
  { name: 'Candy', scene: 'candy', bikes: [['Gumdrop', 'Epic', 'dirt', '#ff5fa8', 25000], ['Lollipop', 'Epic', 'cruiser', '#ff3a6a', 28000], ['Taffy Twister', 'Legendary', 'sport', '#ffb8d8', 42000], ['Choco Rocket', 'Legendary', 'sport', '#7a4a2a', 46000], ['Sugar Rush', 'Legendary', 'cruiser', '#5fd8ff', 50000], ['Candy Crusher', 'Mythical', 'scooter', '#ff2a8a', 80000], ['Sprinkle Storm', 'Mythical', 'sport', '#ffd23a', 90000]] },
  { name: 'Crystal', scene: 'crystal', bikes: [['Quartz', 'Epic', 'cruiser', '#e8d8ff', 1.1e5], ['Geode', 'Epic', 'sport', '#8a5aea', 1.2e5], ['Amethyst', 'Legendary', 'cruiser', '#b07bff', 1.8e5], ['Prism', 'Legendary', 'sport', '#3ff0ff', 2e5], ['Sapphire Surge', 'Legendary', 'sport', '#2a6dff', 2.2e5], ['Diamond Dash', 'Mythical', 'cruiser', '#d8f4ff', 3.5e5], ['Crystal Crown', 'Mythical', 'sport', '#ff7ad8', 4e5]] },
  { name: 'Magma', scene: 'magma', bikes: [['Ember', 'Legendary', 'dirt', '#ff8a1a', 5e5], ['Cinder', 'Legendary', 'cruiser', '#5a2a1a', 5.5e5], ['Inferno', 'Mythical', 'sport', '#ff3b1a', 8e5], ['Molten Fury', 'Mythical', 'sport', '#ff5a1a', 9e5], ['Obsidian', 'Mythical', 'cruiser', '#1a1a24', 1e6], ['Lava Lord', 'Mythical', 'sport', '#ffb02a', 1.1e6], ['Volcanic X', 'Insane', 'sport', '#ff2a00', 1.8e6], ['Phoenix', 'Insane', 'sport', '#ffd23a', 2.1e6]] },
  { name: 'Cosmic', scene: 'cosmic', bikes: [['Nebula', 'Mythical', 'sport', '#b07bff', 2.5e6], ['Comet', 'Mythical', 'sport', '#3ff0ff', 2.8e6], ['Pulsar', 'Insane', 'sport', '#ff3cb4', 4e6], ['Quasar', 'Insane', 'sport', '#7a3aff', 4.5e6], ['Starlight', 'Insane', 'sport', '#fff2b0', 5e6], ['Supernova', 'Insane', 'sport', '#ff8a1a', 5.6e6], ['Black Hole', 'Secret', 'sport', '#14141c', 9e6], ['Void Walker', 'Secret', 'sport', '#2a0a4a', 1e7]] },
  { name: 'Aurora Nexus', scene: 'aurora', bikes: [['Polaris', 'Mythical', 'sport', '#bff4ff', 3e6], ['Northern Light', 'Mythical', 'cruiser', '#3fffb0', 3.4e6], ['Aurora GT', 'Insane', 'sport', '#3fffb0', 5.5e6], ['Borealis', 'Insane', 'sport', '#8affd8', 6e6], ['Spectra', 'Insane', 'sport', '#b07bff', 6.6e6], ['Lumen', 'Insane', 'cruiser', '#e8fff4', 7e6], ['Nexus Prime', 'Secret', 'sport', '#1a2a4a', 1.2e7], ['Aurora Phantom', 'Secret', 'sport', '#0a3a3a', 1.4e7]] },
  { name: 'Angel Biome', scene: 'angel', bikes: [['Halo Runner', 'Insane', 'sport', '#fff4d0', 7e6], ['Seraph', 'Insane', 'sport', '#ffffff', 7.5e6], ['Cherub', 'Insane', 'scooter', '#ffd8ec', 8e6], ['Celestia', 'Insane', 'cruiser', '#ffe88a', 8.6e6], ["Heaven's Gate", 'Insane', 'sport', '#f4f0e0', 9e6], ['Phantom GT', 'Secret', 'sport', '#f4f6ff', 1.6e7], ['Archangel', 'Secret', 'sport', '#ffd23a', 1.8e7], ['Divine Wing', 'Secret', 'sport', '#ffffff', 2e7]] },
  { name: 'Fusion Bikes', scene: 'fusion', bikes: [['Supro Cub', 'Insane', 'dirt', '#1a6cff', 6e6], ['MX09', 'Insane', 'dirt', '#2a2e3a', 7e6], ['Street Spark', 'Rare', 'dirt', '#e8202a', 1.5e3], ['Trail Blazer', 'Epic', 'dirt', '#f0b020', 2.6e4], ['Thunder Wraith', 'Legendary', 'sport', '#2a3a8a', 3.4e5], ['Quantum Reactor', 'Insane', 'sport', '#1a2a8a', 6e6], ['Astral Crown', 'Secret', 'sport', '#8a2ad8', 2.2e7], ['Crimson Wyvern', 'Secret', 'sport', '#d01a2a', 2.5e7]] },
  { name: 'Halloween', scene: 'halloween', bikes: [['Pumpkin Putt', 'Epic', 'scooter', '#ff8a12', 2e4], ['Bat Wing', 'Legendary', 'sport', '#2a1a3a', 6e4], ['Hex Hog', 'Legendary', 'cruiser', '#5fff6a', 7e4], ['Skull Cruiser', 'Mythical', 'cruiser', '#e8e8e8', 2e5], ['Phantom Wraith', 'Limited', 'dirt', '#3fe8ff', 2.5e4], ['Eclipse Reaper', 'Limited', 'sport', '#1a1a26', 1e7]] },
]
// The Fuse Machine (fuse.js), at the Fuse Machine stall. Each tier turns its three
// bikes into the result (which joins your bikes and the Index); a tier unlocks when
// the one before it has been fused. FUSE_BIKES are the ingredients that are in no
// world of the Index: [kind, colour, sell value].
export const FUSE_TIERS = [
  { result: 'Street Spark', from: ['BMX', 'Scooter', 'Market Commuter'] },
  { result: 'Trail Blazer', from: ['Supro Cub', 'Rukkus', 'Magnum'] },
  { result: 'Thunder Wraith', from: ['Glacier GT', 'Gator', 'Amethyst'] },
  { result: 'Quantum Reactor', from: ['Trakor GT', 'R-One', 'Fjorr'] },
  { result: 'Astral Crown', from: ['Apex Ion', 'Inferno Reaper', 'Sovereign'] },
]
export const FUSE_BIKES = {
  Scooter: ['scooter', '#1c2230', 600],
  'Market Commuter': ['bicycle', '#b8d8c8', 900],
  Rukkus: ['dirt', '#8a8a2a', 12e3],
  Magnum: ['dirt', '#2a2a30', 15e3],
  'Trakor GT': ['sport', '#1a2a4a', 4e5],
  'R-One': ['sport', '#2a5ac8', 5e5],
  Fjorr: ['sport', '#b01a2a', 6e5],
  'Apex Ion': ['sport', '#2a8a9a', 2e6],
  'Inferno Reaper': ['sport', '#c02a1a', 3e6],
  Sovereign: ['cruiser', '#5a2a8a', 4e6],
}
export const INDEX_START = ['BMX', 'Club Tourer'] // discovered at the start (the Club Tourer is on your plot)
// The Halloween stall (halloween.js): spend candy corn. Bikes join your bikes
// (sellable); boosts last `minutes`. tone = the card colour.
export const HALLOWEEN_SHOP = {
  corn: 0, // starting corn
  items: [
    { bike: 'Phantom Wraith', income: '$25K/s', corn: 2500, tone: 'pink' },
    { bike: 'Eclipse Reaper', income: '$10M/s', corn: 5e4, tone: 'pink' },
    { boost: '1.5x Training', minutes: 5, corn: 100, tone: 'purple' },
    { boost: '1.5x Income', minutes: 5, corn: 100, tone: 'green' },
  ],
}
// Daily Rewards (daily.js): one day unlocks every `every` s after the last
// claim; after day 7 it starts over. op = the OP! tag. Saved in localStorage.
export const DAILY_REWARDS = {
  every: 86400,
  days: [{ cash: 500 }, { bike: 'Supro Cub', op: true }, { cash: 75e3 }, { bike: 'Phantom GT', op: true }, { cash: 1e6 }, { bike: 'MX09', op: true }, { bike: 'Crimson Wyvern', op: true }],
}
// The 12 trails, cheapest first. cash in $, gems in ◎ (null: cash only).
// bg = card background top/bottom; ribbon/body = trail art light/mid/dark.
export const TRAILS = [
  { id: 'grey', name: 'Grey Trail', mult: 1.5, cash: 100, gems: null, bg: ['#ffffff', '#c4c8d0'], ribbon: ['#f2f4f8', '#a9afba', '#5d6470'], body: ['#eef0f4', '#a3a9b4', '#5a606c'] },
  { id: 'green', name: 'Green Trail', mult: 2, cash: 2e3, gems: 11, bg: ['#8cff7a', '#36c93e'], ribbon: ['#9dff8a', '#22d43a', '#0b7a1e'], body: ['#8bff7a', '#1fcf38', '#0a7a1c'] },
  { id: 'blue', name: 'Blue Trail', mult: 2.5, cash: 2e4, gems: 19, bg: ['#45e4ff', '#1478f0'], ribbon: ['#7fd0ff', '#1a6cff', '#0a2aa0'], body: ['#7fcaff', '#1a6cff', '#0a2a9a'] },
  { id: 'red', name: 'Red Trail', mult: 3, cash: 25e4, gems: 29, bg: ['#ff8c8c', '#e3202c'], ribbon: ['#ff9a9a', '#ff2a2a', '#8a0a12'], body: ['#ff9a9a', '#f02a2a', '#8a0a12'] },
  { id: 'purple', name: 'Purple Trail', mult: 4, cash: 3e6, gems: 45, bg: ['#dc96ff', '#7a2ae0'], ribbon: ['#e6aaff', '#a03aff', '#4a0a9a'], body: ['#e2a6ff', '#9a3af6', '#4a0a94'] },
  { id: 'gold', name: 'Gold Trail', mult: 5, cash: 4e7, gems: 69, bg: ['#fff27a', '#ffb000'], ribbon: ['#fff6a8', '#ffc21a', '#a86400'], body: ['#fff2a0', '#ffbe1a', '#a05e00'] },
  { id: 'lava', name: 'Lava Trail', mult: 6, cash: 5e8, gems: 99, bg: ['#ffc04a', '#ff3a14'], ribbon: ['#ffe27a', '#ff6a14', '#a01a00'], body: ['#3a2a2a', '#241a1a', '#100808'] },
  { id: 'shadow', name: 'Shadow Trail', mult: 7, cash: 2e9, gems: 149, bg: ['#7a7a9c', '#1c1c30'], ribbon: ['#6a6a8a', '#2a2a40', '#0a0a14'], body: ['#5a5a78', '#2a2a40', '#0c0c18'] },
  { id: 'galaxy', name: 'Galaxy Trail', mult: 8.5, cash: 1e10, gems: 239, bg: ['#7a5aff', '#180a52'], ribbon: ['#ff7ae8', '#6a3aff', '#14063a'], body: ['#8a6aff', '#4a2ad0', '#160a4a'], stars: true },
  { id: 'eternal', name: 'Eternal Trail', mult: 10, cash: 5e10, gems: 339, bg: ['#f4f6ff', '#c6cdee'], ribbon: ['#ffffff', '#d4daf2', '#8a94bc'], body: ['#ffffff', '#d2d8f0', '#8a92b8'] },
  { id: 'rainbow', name: 'Rainbow Trail', mult: 14, cash: 1e12, gems: 559, bg: ['#ff9ab4', '#ffe48a', '#8affd0', '#8ad4ff'], ribbon: ['#ff2a4a', '#ffd21a', '#2ad44a', '#1a8cff', '#a03aff'], body: ['#ff3a5a', '#ffd21a', '#1ad4ff', '#a03aff'], rainbow: true },
  { id: 'angel', name: 'Angel Trail', mult: 20, cash: 1e13, gems: 839, bg: ['#fffaea', '#d6c69c'], ribbon: ['#ffffff', '#f6f0dc', '#e0b43a'], body: ['#ffffff', '#e8ecf8', '#d4a82a'], angel: true },
]

export const SPAWN = { x: -1, y: 0.05, z: 8 }
export const SPAWN_FACING = Math.PI // yaw the character faces on spawn (PI = toward -Z)

// --- Player modes (modes.js) -------------------------------------------------
// 'character' = third-person chase cam with the avatar on screen.
// 'player' = first-person, the camera is the player's eyes and the avatar is hidden.
export const MODES = ['character', 'player']
export const START_MODE = 'character'

// --- Physics (physics.js, player.js) ------------------------------------------
export const PHYSICS = {
  gravity: -22, // m/s^2 for dynamic bodies and the player
  fixedStep: 1 / 60, // s per physics tick; rendering interpolates between ticks
  maxSubSteps: 5, // a long frame never runs more ticks than this
  walkSpeed: 8, // m/s
  sprintSpeed: 14, // m/s with Shift held
  accel: 70, // m/s^2 toward the target velocity on the ground
  airAccel: 22, // m/s^2 steering while airborne
  decel: 60, // m/s^2 when no key is held
  turnSpeed: 12, // rad/s the body turns toward its heading
  jumpSpeed: 8.5, // m/s
  coyoteTime: 0.1, // s after leaving a ledge a jump still counts
  jumpBuffer: 0.12, // s a jump pressed before landing is remembered
  stepHeight: 0.75, // m autostep (zone 2's plateau is a 0.7 m step)
  maxSlope: 50, // degrees the player can walk up
  snapToGround: 0.4, // m the controller stays glued to downward steps and slopes
  pushMass: 80, // kg the character weighs when shoving crates
  killY: -6, // sank this far: respawn
}
export const PLAYER_DIMS = { radius: 0.75, height: 1.8 } // capsule the character controller moves

// --- Look ------------------------------------------------------------------
export const RENDER = { exposure: 1.0 }
export const FOG = { near: 160, far: 620 }
// The two lighting moods lighting.js blends between (key N toggles).
export const TIME_OF_DAY = {
  transition: 2.5, // s to blend day <-> night
  day: {
    zenith: '#2b8ff0',
    horizon: '#bdeaff',
    sunColor: '#fff6e6',
    // Sun + hemi + env together keep the pale sand (#eed39c) near its own tan;
    // much more and ACES washes it (and the props) out to grey-white.
    sunIntensity: 2.6,
    sunElevation: 62, // degrees above the horizon
    sunAzimuth: 160, // degrees, 0 = from +Z
    hemiSky: '#e8f4ff',
    hemiGround: '#c99a6a',
    hemiIntensity: 0.95,
    envIntensity: 0.5,
    lampIntensity: 0,
    stars: 0,
    exposure: 0.95,
  },
  night: {
    zenith: '#050b22',
    horizon: '#24345e',
    sunColor: '#9fb4ff', // the moon
    sunIntensity: 0.55,
    sunElevation: 38,
    sunAzimuth: -60,
    hemiSky: '#3a4c80',
    hemiGround: '#1a1a22',
    hemiIntensity: 0.35,
    envIntensity: 0.25,
    lampIntensity: 30,
    stars: 1,
    exposure: 1.15,
  },
}
export const LIGHT = {
  shadowRange: 48, // half-width of the sun's shadow box around the player
  lampColor: '#ffb35c',
  lampDistance: 22,
}

// Default (fallback) character look, used only when player.glb cannot load.
export const CHARACTER_COLORS = { skin: '#f2c79a', suit: '#2f6fd0', hair: '#4a2f1c' }

export const MATERIAL_PBR = {
  PLAYER: { roughness: 0.7, metalness: 0 },
  GROUND: { roughness: 0.95, metalness: 0 },
}

// --- Graphics presets, picked by the Bloxity graphics_quality setting ----------
export const GRAPHICS_PRESETS = {
  Low: { shadows: false, shadowMap: 512, antialias: false, dpr: 1, bloom: false, particles: 0.35 },
  Medium: { shadows: true, shadowMap: 1024, antialias: false, dpr: 1.25, bloom: false, particles: 0.6 },
  High: { shadows: true, shadowMap: 2048, antialias: true, dpr: 2, bloom: true, particles: 1 },
  Ultra: { shadows: true, shadowMap: 4096, antialias: true, dpr: 2, bloom: true, particles: 1 },
}

// Bloom (postfx.js): only HDR-bright pixels (above threshold, linear, before
// tone mapping) glow: neon rails, waterfall, VIP gate, particles. Sunlit sand
// stays under the threshold.
export const BLOOM = { strength: 0.6, radius: 0.35, threshold: 2.0 }
// Neon materials (propkit.js): k = HDR colour multiplier with bloom on; with
// bloom off they are capped at plainMax so they stay coloured, not white.
export const NEON = { k: 3.5, plainMax: 1.2 }

// Phones and tablets default to a lighter preset when the portal sends no value,
// and any preset is capped there (a phone at DPR 3 renders 9x the pixels; bloom
// is a full-screen multi-pass blur, so it stays off on phones).
export const COARSE_POINTER = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
export const DEFAULT_GRAPHICS = COARSE_POINTER ? 'Medium' : 'High'
export const MOBILE_GRAPHICS_CAP = { dpr: 1.5, shadowMap: 1024, particles: 0.6 }

// The preset to render with on this device.
export function graphicsPreset(name) {
  const p = GRAPHICS_PRESETS[name] ?? GRAPHICS_PRESETS[DEFAULT_GRAPHICS]
  if (!COARSE_POINTER) return p
  const cap = MOBILE_GRAPHICS_CAP
  return { ...p, dpr: Math.min(p.dpr, cap.dpr), shadowMap: Math.min(p.shadowMap, cap.shadowMap), bloom: false, particles: Math.min(p.particles, cap.particles) }
}

// --- Touch controls (touch.js) --------------------------------------------------
export const TOUCH = {
  deadZone: 0.12, // fraction of the joystick radius that does nothing
  lookScale: 1.5, // touch drag pixels -> look, relative to a mouse pixel
  pinchPixelsPerNotch: 30, // finger spread change that equals one wheel notch
}

// --- Camera (camera.js) -------------------------------------------------------
export const CAMERA = {
  fov: 70,
  near: 0.1,
  far: 1200,
  startPitch: 0.36, // radians above the horizon (raised chase cam, looking down on the plaza)
  minPitch: -0.35,
  maxPitch: 1.25,
  firstPersonPitch: 1.45, // |pitch| limit looking up/down in player mode
  eyeHeight: 0.92, // eye height as a fraction of player height (player mode)
  distance: 15, // resting boom length, m
  minDistance: 2.5, // wheel in past this enters player mode
  maxDistance: 26,
  followLerp: 14, // 1/s: the one smoothing stage, on the point the camera follows
  targetHeight: 1.2, // look-at point as a fraction of player height
  lookSensitivity: 0.0026, // rad per pixel of mouse movement
  zoomStep: 0.9, // m per wheel notch
  zoomEase: 12, // 1/s the zoom glides to its target
  speedFov: 6, // degrees the FOV widens at sprint speed
  speedEase: 3, // 1/s the speed framing eases in and out
  clearEase: 6, // 1/s the boom eases back out once a wall stops blocking it
}

// --- Bloxity (bloxity.js, avatar/) -------------------------------------------------
// SDK setting keys this game listens for; registering a listener makes the control
// appear in the portal's settings menu.
export const SETTINGS = {
  graphics_quality: { def: DEFAULT_GRAPHICS, type: 'enum', values: ['Low', 'Medium', 'High', 'Ultra'] },
  camera_sensitivity: { def: '1', type: 'number', min: 0.1, max: 5 },
  show_fps: { def: 'false', type: 'bool' },
  fullscreen: { def: 'false', type: 'bool' },
}

// The base rig, measured from player.glb: origin at the feet, 6.4 units tall at bind pose.
export const RIG_HEIGHT = 6.4
// Bind-pose values of the rig nodes the SDK proportions drive.
export const RIG = { armOffsetX: 2, legOffsetX: 0.6, neckOffsetY: 0.6 }
// getProportions() ranges, straight from the SDK spec; clamped before they reach the scene graph.
export const PROPORTIONS = {
  height: { def: 1, min: 0.5, max: 1.6 },
  shoulderWidth: { def: 1, min: 0.5, max: 1.5 },
  armLength: { def: 1, min: 0.05, max: 3 },
  legOffsetX: { def: 1, min: -0.7, max: 5 },
  torsoScaleX: { def: 1, min: 0.3, max: 2 },
  neckHeight: { def: 1, min: 0.94, max: 1.2 },
  headScale: { def: 1, min: 0.3, max: 2.6 },
}

// Procedural animation (avatar/animator.js), ported from Clean Leaves for Loot.
// Rotations are radians in CHARACTER space: +X swings a limb backward, +Y yaws, +Z rolls.
const deg = (d) => (d * Math.PI) / 180
export const ANIM = {
  emoteFade: 0.2, // s a Bloxity emote takes to blend in and out
  airborneDelay: 0.07, // s off the ground before the air pose (ignores a step down a ledge)
  // Walk -> run is one cycle at two depths; phase advances with distance travelled.
  locomotion: {
    minFrequency: 0.7,
    maxFrequency: 3.6,
    strideDistance: 3.8, // m per cycle
    idleSpeed: 0.6,
    walkSpeed: 2.5,
    runSpeed: 8,
    sprintSpeed: 13,
    hipSwing: { walk: deg(22), run: deg(42), sprint: deg(56) },
    kneeBend: { walk: deg(30), run: deg(58), sprint: deg(72) },
    armSwing: { walk: deg(18), run: deg(36), sprint: deg(52) },
    elbowBend: { walk: deg(14), run: deg(44), sprint: deg(70) },
    torsoTwist: { walk: deg(4), run: deg(7), sprint: deg(9) },
    torsoLean: { walk: deg(3), run: deg(10), sprint: deg(18) },
    headCounterTwist: { walk: deg(2), run: deg(4), sprint: deg(5) },
    torsoRoll: { walk: deg(2), run: deg(3), sprint: deg(3) },
    bob: { walk: 0.03, run: 0.07, sprint: 0.09 }, // m, on the avatar root
    bankAngle: deg(9),
    bankRate: 8,
  },
  idle: {
    breathFrequency: 0.35,
    breathAmount: deg(1.8),
    breathBob: 0.007,
    basePose: {
      ArmL1: { x: deg(-4), z: deg(8) },
      ArmL2: { x: deg(12) },
      ArmR1: { x: deg(-4), z: deg(-8) },
      ArmR2: { x: deg(12) },
      LegL1: { x: deg(-4) },
      LegR1: { x: deg(4) },
    },
  },
  airborne: {
    rise: {
      LegL1: { x: deg(-38) }, LegR1: { x: deg(8) }, LegL2: { x: deg(62) }, LegR2: { x: deg(40) },
      ArmL1: { x: deg(-40), z: deg(34) }, ArmR1: { x: deg(-30), z: deg(-34) },
      ArmL2: { x: deg(30) }, ArmR2: { x: deg(30) }, Spine1: { x: deg(6) },
    },
    fall: {
      LegL1: { x: deg(-14) }, LegR1: { x: deg(10) }, LegL2: { x: deg(22) }, LegR2: { x: deg(18) },
      ArmL1: { x: deg(-70), z: deg(40) }, ArmR1: { x: deg(-60), z: deg(-40) },
      ArmL2: { x: deg(20) }, ArmR2: { x: deg(20) }, Spine1: { x: deg(-4) },
    },
    velocityReference: 8, // m/s vertical speed that reads as fully rising / falling
  },
  landing: {
    duration: 0.16,
    pose: {
      LegL1: { x: deg(-34) }, LegR1: { x: deg(-34) }, LegL2: { x: deg(58) }, LegR2: { x: deg(58) },
      ArmL1: { x: deg(-18), z: deg(20) }, ArmR1: { x: deg(-18), z: deg(-20) }, Spine1: { x: deg(14) },
    },
    bobY: -0.2,
  },
  // Riding your bike (Ride My Bike): seated, hands on the bars, legs pedalling.
  ride: {
    pose: {
      Spine1: { x: deg(16) }, Neck1: { x: deg(-10) },
      ArmL1: { x: deg(-62), z: deg(12) }, ArmR1: { x: deg(-62), z: deg(-12) },
      ArmL2: { x: deg(18) }, ArmR2: { x: deg(18) },
      LegL1: { x: deg(-72) }, LegR1: { x: deg(-72) }, LegL2: { x: deg(78) }, LegR2: { x: deg(78) },
    },
    pedalHip: deg(22),
    pedalKnee: deg(26),
    pedalDistance: 2.6, // m per pedal turn
    transition: 0.18,
  },
  // Walking a bike (base.js): the right hand down on its handlebars; the arm stops swinging.
  hold: { ArmR1: { x: deg(-28), z: deg(-14) }, ArmR2: { x: deg(14) } },
  transitions: { toLocomotion: 0.14, toAirborne: 0.12, toLanding: 0.06 }, // s to blend a pose change
}

export const FONT_FAMILY = 'Fredoka'

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Coerce one raw SDK string against its SETTINGS entry.
export function coerceSetting(key, raw) {
  const spec = SETTINGS[key]
  if (!spec) return raw
  const value = raw === '' || raw == null ? spec.def : raw
  if (spec.type === 'bool') return value === 'true' || value === true
  if (spec.type === 'enum') return spec.values.includes(value) ? value : spec.def
  const n = Number(value)
  return clamp(Number.isFinite(n) ? n : Number(spec.def), spec.min, spec.max)
}

// --- Game server (net.js, remotePlayers.js; backend: Steal-a-bike-backend) ---------------------
// Local dev talks to the backend directly; deployed builds ask the Bloxity matchmaker for a pod
// (bloxity.resolveServerEndpoint), so SERVER_URL is empty there.
export const SERVER_URL = import.meta.env.DEV ? import.meta.env.VITE_SERVER_URL_DEV || 'ws://localhost:2567' : ''
export const NET = {
  saveEvery: 5, // s: progress is sent at most this often (and when the tab hides or closes)
  retry: 2, // s before the first reconnect; doubles after each failed resolve/join...
  retryMax: 30, // ...up to this (the matchmaker can hold a cold start for ~45 s)
  rejoin: 1, // s before resolving again after the room closed (e.g. its pod is being replaced)
  poseHz: 10, // this player's pose goes out at most this often (nothing while it stands still)
  remoteLerp: 10, // 1/s: remote players ease toward their last pose
  predictMax: 0.4, // s of dead reckoning (speed x heading) past the last pose
  maxRemotes: 24, // the nearest this many others are drawn (fewer on touch)
  maxRemotesTouch: 10,
  remoteFade: 140, // m: others further away than this are not drawn
  detailRange: 45, // m: trail and bike tag only up close
}
// The boards on Bloxity's own trophy button (bloxity.js declares them; the game server reports the
// scores). Most Cash first: the portal opens on it. Keep in step with the backend's PLATFORM_BOARDS.
export const LEADERBOARDS = [
  { id: 'cash', label: 'Most Cash', order: 'desc', mode: 'best', format: 'compact', reset: 'none' },
  { id: 'speed', label: 'Top Speed', order: 'desc', mode: 'best', format: 'compact', reset: 'none' },
]
// The MOST CASH board in the hub (market.js): the server's global top 50, paged.
export const LEADERBOARD = {
  rows: 10, // rows on the hub board; the global top 50 pages through them
  pageEvery: 6, // s per page
}
