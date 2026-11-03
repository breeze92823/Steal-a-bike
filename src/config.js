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
// recommended = what the post's sign says.
export const LANE = {
  zone1: { endZ: -55, y: 0, post: [20.5, -31], portal: [-19, -46] }, // grass; Halloween portal while the event is open
  zone2: { endZ: -88, y: 0.7, post: [-19, -80], recommended: '600' }, // raised grass plateau
  zone3: { endZ: -129, y: 0, post: [15, -112], recommended: '4K' }, // sand, cacti, yellow-topped cliffs
  zone4: { endZ: -168, y: 0.25, post: [-8, -160], recommended: '20K' }, // snow basin walled in by ice
  gate: { halfWidth: 15, height: 15, depth: 12, archRise: 7 }, // ice wall across zone 4's north end, arch over the gap
  endZ: -232, // temporary end of the lane past the gate until zone 5 is built
}
// Zones 5..44 (zones.js builds them from these themes, lane.js streams them in
// as you approach). Each theme: floor + patch colours, cliff colours (`wall`,
// a terraceWall theme), decor recipes [name, count, where, opts] (where =
// 'edge' by the cliffs, 'scatter' over the floor, 'sky' overhead, 'far' out
// beyond the cliffs, 'center' down the middle; names are DECOR builders in
// decor.js), a `hero` set piece, weather particles, drifting motes, a lighting
// `mood` (over the day sky; null = plain day) and an ambience `sound`
// (audio.js BEDS). Further from the hub = stranger, more glow, more particles.
export const MOODS = {
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
  { name: 'Jungle Festival', floor: '#4fbf34', patch: '#62d048', wall: W('#7a4a2a', '#8a5a32', '#3fb83a'), decor: [['palm', 14, 'edge'], ['tree', 6, 'edge', { scale: 1.2 }], ['flowers', 8, 'scatter']], hero: ['stage', {}], weather: [{ kind: 'fall', colors: ['#ff5fa8', '#3ff0ff', '#ffe14a'], count: 60, size: 0.25, speed: 0.8, soft: false }], motes: ['#c8ff6a', '#ffe14a'], mood: null, sound: 'festival', gate: '#ff3cb4' },
  { name: 'Bamboo Grove', floor: '#7fc04a', patch: '#8fd05a', wall: W('#5a7a3a', '#6a8a42', '#7fcf4a'), decor: [['bamboo', 22, 'edge'], ['lantern', 8, 'scatter', { color: '#ff6a2a' }], ['rock', 5, 'scatter', { color: '#9aa08a' }]], hero: ['torii', { color: '#e0262b' }], weather: [{ kind: 'fall', colors: ['#9fe060', '#c8f080'], count: 50, size: 0.3, speed: 0.6 }], motes: ['#e8ffb0'], mood: 'mist', sound: 'wind', gate: '#7dff3a' },
  { name: 'Cherry Blossom Garden', floor: '#8ad06a', patch: '#ffc8e0', wall: W('#8a6a5a', '#9a7a6a', '#ff9ac8', '#ffd0e4', ['#ff9ac8', '#ffb8d8', '#ff7ab8']), decor: [['tree', 14, 'edge', { leaves: ['#ff9ac8', '#ffb8d8', '#ff7ab8'] }], ['lantern', 6, 'scatter', { color: '#ffb0d0' }], ['waterPool', 2, 'scatter', { color: '#8fe8ff', w: 7, d: 4 }]], hero: ['torii', { color: '#ff5f8a' }], weather: [{ kind: 'fall', colors: ['#ffb8d8', '#ff9ac8', '#ffffff'], count: 120, size: 0.32, speed: 0.7, sway: 1.4 }], motes: ['#ffd8ec'], mood: 'sunset', sound: 'meadow', gate: '#ff7ab8' },
  { name: 'Autumn Woods', floor: '#c88a3a', patch: '#d89a4a', wall: W('#7a4a2a', '#8a5a32', '#e07a2a', '#ffb02a', ['#ff8a1a', '#e05a1a', '#ffc02a']), decor: [['tree', 16, 'edge', { leaves: ['#ff8a1a', '#e05a1a', '#ffc02a'] }], ['mushroom', 6, 'scatter', { cap: '#e0262b', height: 1.6 }], ['pumpkins', 4, 'scatter']], hero: ['treeHouse', { leaves: ['#ff8a1a', '#e05a1a', '#ffc02a'] }], weather: [{ kind: 'fall', colors: ['#ff8a1a', '#e05a1a', '#ffc02a', '#a0522d'], count: 110, size: 0.35, speed: 0.9, sway: 1.6 }], motes: ['#ffd27a'], mood: 'dusk', sound: 'night', gate: '#ff8a1a' },
  { name: 'Mushroom Hollow', floor: '#5a8a4a', patch: '#6a9a5a', wall: W('#4a3a5a', '#5a4a6a', '#7a5aaa', null, ['#b07bff', '#ff7ad8', '#7a5aaa']), decor: [['mushroom', 16, 'edge', { cap: '#b07bff', glow: true, height: 4 }], ['mushroom', 10, 'scatter', { cap: '#ff5fa8', glow: true, height: 1.8 }], ['flowers', 6, 'scatter', { colors: ['#3ff0ff', '#b07bff'] }]], hero: ['giantMushroom', { cap: '#3ff0ff' }], weather: [{ kind: 'rise', colors: ['#b07bff', '#3ff0ff', '#ff7ad8'], count: 90, size: 0.25, speed: 0.4 }], motes: ['#c8a0ff'], mood: 'cave', sound: 'crystal', gate: '#b07bff' },
  { name: 'Canyon Mesa', floor: '#d8743a', patch: '#e8844a', wall: W('#b8542a', '#c8643a', '#e8844a', '#f0a060', ['#8a9a3a', '#9aaa4a', '#7a8a2a']), decor: [['cactus', 10, 'edge'], ['rock', 10, 'scatter', { color: '#c8643a' }], ['tumbleweed', 4, 'scatter']], hero: ['obelisk', { color: '#c8643a' }], weather: [{ kind: 'fall', colors: ['#f0c080'], count: 60, size: 0.2, speed: 0.4, sway: 4 }], motes: ['#ffd8a0'], mood: 'sunset', sound: 'desert', gate: '#ff8a1a' },
  { name: 'Oasis Dunes', floor: '#ecd27a', patch: '#f4dc8a', wall: W('#d8b860', '#e0c070', '#f0d888', null, ['#3fb83a', '#5bcf47', '#2a9a2a']), decor: [['palm', 12, 'edge'], ['waterPool', 2, 'scatter', { color: '#3fd8ff', w: 10, d: 6 }], ['cactus', 6, 'scatter']], hero: ['palm', { scale: 2 }], weather: [{ kind: 'fall', colors: ['#fff0c0'], count: 50, size: 0.18, speed: 0.3, sway: 5 }], motes: ['#fff4c0'], mood: 'golden', sound: 'desert', gate: '#3fd8ff' },
  { name: 'Pharaoh Tombs', floor: '#d9b86a', patch: '#e4c47a', wall: W('#c8a058', '#d4ac64', '#e8c87a', '#3a8aff'), decor: [['obelisk', 6, 'edge', { glowTip: '#ffd23a' }], ['torch', 10, 'edge', { color: '#ff8a1a' }], ['statue', 4, 'edge', { color: '#e4c47a' }], ['goldPile', 4, 'scatter']], hero: ['pyramid', {}], weather: [{ kind: 'rise', colors: ['#ffd23a'], count: 40, size: 0.2, speed: 0.4 }], motes: ['#ffe8a0'], mood: 'golden', sound: 'temple', gate: '#ffd23a' },
  { name: 'Savanna Sunset', floor: '#d8b84a', patch: '#e4c85a', wall: W('#a8743a', '#b8844a', '#c8a84a', null, ['#5a8a2a', '#6a9a3a', '#4a7a1a']), decor: [['tree', 10, 'edge', { leaves: ['#5a8a2a', '#6a9a3a', '#4a7a1a'], scale: 1.3 }], ['rock', 6, 'scatter', { color: '#a8743a' }], ['flowers', 4, 'scatter', { colors: ['#ffd23a', '#ff8a1a'] }]], hero: ['rock', { scale: 3, color: '#a8743a' }], weather: [{ kind: 'fall', colors: ['#ffe8a0'], count: 40, size: 0.2, speed: 0.3, sway: 2 }], motes: ['#ffd27a', '#ff9a4a'], mood: 'sunset', sound: 'meadow', gate: '#ffb02a' },
  { name: 'Swamp Bayou', floor: '#4a6a3a', patch: '#3a5a4a', wall: W('#3a4a2a', '#4a5a32', '#5a7a3a', null, ['#3a6a2a', '#4a7a3a', '#2a5a2a']), decor: [['tree', 12, 'edge', { leaves: ['#3a6a2a', '#4a7a3a', '#2a5a2a'] }], ['waterPool', 4, 'scatter', { color: '#5a8a6a', w: 9, d: 5, k: 1 }], ['mushroom', 6, 'scatter', { cap: '#c8ff6a', glow: true, height: 1.4 }]], hero: ['bones', {}], weather: [], motes: ['#c8ff6a', '#ffe14a'], mood: 'swamp', sound: 'swamp', gate: '#c8ff6a' },
  { name: 'Pirate Cove', floor: '#ecd8a0', patch: '#f4e4b0', wall: W('#8a7a6a', '#9a8a7a', '#5fbf3a'), decor: [['palm', 10, 'edge'], ['barrels', 6, 'scatter'], ['goldPile', 3, 'scatter'], ['waterPool', 2, 'edge', { color: '#2ad0ff', w: 10, d: 6 }]], hero: ['shipwreck', { face: 0.4 }], weather: [{ kind: 'fall', colors: ['#ffffff'], count: 30, size: 0.2, speed: 0.4, sway: 3 }], motes: ['#e8fbff'], mood: null, sound: 'waves', gate: '#2ad0ff' },
  { name: 'Coral Reef', floor: '#e8d8b8', patch: '#f0e4c8', wall: W('#3a8aaa', '#4a9aba', '#ff6f91', '#ffb347'), decor: [['coral', 18, 'edge'], ['coral', 8, 'scatter', { scale: 0.7 }], ['kelp', 8, 'edge'], ['jelly', 6, 'sky', { color: '#ff7ad8' }]], hero: ['shipwreck', { face: -0.6 }], weather: [{ kind: 'rise', colors: ['#bff4ff', '#ffffff'], count: 120, size: 0.3, speed: 1.0, sway: 0.4 }], motes: ['#9fe8ff', '#ffd8f0'], mood: 'underwater', sound: 'underwater', gate: '#ff6f91' },
  { name: 'Deep Abyss', floor: '#1a2a4a', patch: '#22355a', wall: W('#0a1a3a', '#122248', '#1a3a6a', '#3ff0ff', ['#2a4a8a', '#3a5aaa', '#1a3a7a']), decor: [['jelly', 12, 'sky', { color: '#3ff0ff' }], ['jelly', 8, 'sky', { color: '#ff7ad8' }], ['kelp', 10, 'edge', { color: '#1a5a5a' }], ['orb', 10, 'scatter', { color: '#3ff0ff' }]], hero: ['bones', {}], weather: [{ kind: 'rise', colors: ['#3ff0ff', '#7dffd8'], count: 140, size: 0.2, speed: 0.3, bright: 2 }], motes: ['#3ff0ff'], mood: 'abyss', sound: 'abyss', gate: '#3ff0ff' },
  { name: 'Crystal Caverns', floor: '#4a3a6a', patch: '#5a4a7a', wall: W('#3a2a5a', '#4a3a6a', '#8a6aca', '#b07bff', ['#b07bff', '#d8b0ff', '#8a5aea']), decor: [['crystal', 18, 'edge', { color: '#b07bff' }], ['crystal', 10, 'scatter', { color: '#3ff0ff' }], ['crystal', 6, 'scatter', { color: '#ff7ad8' }]], hero: ['heroCrystal', { color: '#d8b0ff' }], weather: [{ kind: 'rise', colors: ['#d8b0ff', '#3ff0ff'], count: 100, size: 0.3, speed: 0.3, soft: false }], motes: ['#e8d8ff'], mood: 'cave', sound: 'crystal', gate: '#d8b0ff' },
  { name: 'Gem Mine', floor: '#6a5a4a', patch: '#7a6a5a', wall: W('#4a3a2a', '#5a4a3a', '#6a5a4a', '#ffd23a', ['#3a8aff', '#ff3b5c', '#3fdc4c']), decor: [['rails', 1, 'center', { len: 34 }], ['crystal', 10, 'edge', { color: '#ff3b5c' }], ['crystal', 8, 'edge', { color: '#3fdc4c' }], ['torch', 8, 'edge'], ['goldPile', 4, 'scatter']], hero: ['heroCrystal', { color: '#3a8aff' }], weather: [{ kind: 'fall', colors: ['#c8b8a0'], count: 50, size: 0.15, speed: 0.3 }], motes: ['#ffe8a0'], mood: 'cave', sound: 'mine', gate: '#ffd23a' },
  { name: 'Lava Fields', floor: '#2a2a2e', patch: '#3a2a2a', wall: W('#2a2024', '#34282c', '#4a3030', '#ff5a1a', DARK), decor: [['lavaPool', 5, 'scatter', { w: 9, d: 4 }], ['rock', 10, 'edge', { color: '#2a2024' }], ['bones', 2, 'scatter']], hero: ['volcano', {}], weather: [{ kind: 'rise', colors: ['#ffb02a', '#ff5a1a'], count: 140, size: 0.22, speed: 1.5, bright: 2.2 }, { kind: 'fall', colors: ['#5a5a5a'], count: 60, size: 0.3, speed: 0.5, bright: 0.6 }], motes: ['#ff8a1a'], mood: 'lava', sound: 'lava', gate: '#ff5a1a' },
  { name: 'Volcano Core', floor: '#3a1a14', patch: '#4a2014', wall: W('#2a1410', '#3a1a14', '#ff5a1a', '#ffb02a', DARK), decor: [['lavaPool', 8, 'scatter', { w: 7, d: 4 }], ['rock', 12, 'edge', { color: '#2a1410' }], ['torch', 6, 'edge', { color: '#ff3b1a' }]], hero: ['volcano', {}], weather: [{ kind: 'rise', colors: ['#ffd23a', '#ff5a1a', '#ff3b1a'], count: 180, size: 0.25, speed: 2, bright: 2.4 }], motes: ['#ff5a1a'], mood: 'lava', sound: 'lava', gate: '#ff3b1a' },
  { name: 'Obsidian Forge', floor: '#1a1a24', patch: '#24242e', wall: W('#14141c', '#1c1c26', '#3a3a4a', '#ff8a1a', ['#3a3a4a', '#2a2a3a', '#4a4a5a']), decor: [['anvil', 6, 'scatter'], ['torch', 10, 'edge', { color: '#ff8a1a' }], ['lavaPool', 3, 'edge', { w: 6, d: 3 }], ['gear', 4, 'edge', { color: '#5a606e' }]], hero: ['castleGate', { color: '#24242e', roof: '#ff5a1a' }], weather: [{ kind: 'rise', colors: ['#ffb02a', '#ffd23a'], count: 120, size: 0.18, speed: 2.5, bright: 2.4 }], motes: ['#ffb02a'], mood: 'lava', sound: 'forge', gate: '#ff8a1a' },
  { name: 'Frozen Tundra', floor: '#e8f4fb', patch: '#d8ecf8', wall: W('#9ac8e8', '#aad4f0', '#f4fbff', null, SNOWY), decor: [['pine', 16, 'edge', { snow: true }], ['iceSpike', 8, 'scatter'], ['rock', 4, 'scatter', { color: '#c8d8e8' }]], hero: ['iceSpike', {}], weather: [{ kind: 'fall', colors: ['#ffffff'], count: 260, size: 0.3, speed: 2.2, sway: 3 }], motes: ['#ffffff'], mood: 'blizzard', sound: 'blizzard', gate: '#9fe8ff' },
  { name: 'Aurora Peaks', floor: '#d8e8f4', patch: '#c8dcec', wall: W('#5a7a9a', '#6a8aaa', '#f4fbff', '#3fffb0', SNOWY), decor: [['pine', 12, 'edge', { snow: true }], ['iceSpike', 6, 'scatter'], ['beam', 4, 'edge', { color: '#3fffb0' }], ['orb', 8, 'scatter', { color: '#8affd8' }]], hero: ['heroCrystal', { color: '#3fffb0' }], weather: [{ kind: 'fall', colors: ['#ffffff'], count: 80, size: 0.25, speed: 0.8 }], motes: ['#8affd8', '#b07bff'], mood: 'aurora', sound: 'aurora', gate: '#3fffb0', aurora: true },
  { name: 'Glacier Caves', floor: '#c8ecfb', patch: '#b8e0f4', wall: W('#5ab0e0', '#6ac0ec', '#e8f8ff', '#ffffff', SNOWY), decor: [['iceSpike', 14, 'edge'], ['crystal', 8, 'scatter', { color: '#9fe8ff' }], ['waterPool', 2, 'scatter', { color: '#9fe8ff', w: 8, d: 4 }]], hero: ['heroCrystal', { color: '#9fe8ff' }], weather: [{ kind: 'fall', colors: ['#e8f8ff'], count: 70, size: 0.22, speed: 0.6 }], motes: ['#bff4ff'], mood: 'ice', sound: 'cave', gate: '#9fe8ff' },
  { name: 'Haunted Graveyard', floor: '#3a4a3a', patch: '#2a3a2a', wall: W('#3a3a4a', '#444456', '#2a3a2a', null, DARK), decor: [['tombstone', 24, 'scatter'], ['tree', 10, 'edge', { leaves: ['#2a2a2a', '#3a3a3a', '#1a1a1a'] }], ['lantern', 6, 'edge', { color: '#9fe8ff' }], ['pumpkins', 3, 'scatter']], hero: ['castleGate', { color: '#3a3a4a', roof: '#2a1a3a' }], weather: [{ kind: 'fall', colors: ['#c8d8ff'], count: 50, size: 0.5, speed: 0.2, bright: 0.6 }], motes: ['#9fe8ff', '#c8ff6a'], mood: 'spooky', sound: 'spooky', gate: '#9fe8ff', ghosts: true },
  { name: 'Pumpkin Patch', floor: '#5a4a2a', patch: '#6a5a32', wall: W('#4a3a2a', '#5a4a32', '#ff8a12', null, ['#ff8a1a', '#e05a1a', '#3a3a2a']), decor: [['pumpkins', 14, 'scatter'], ['tree', 8, 'edge', { leaves: ['#ff8a1a', '#e05a1a', '#3a3a2a'] }], ['torch', 6, 'edge', { color: '#ff8a1a' }]], hero: ['pumpkins', {}], weather: [{ kind: 'fall', colors: ['#ff8a1a', '#3a2a1a'], count: 70, size: 0.3, speed: 0.7, sway: 1.5 }], motes: ['#ffb02a'], mood: 'dusk', sound: 'spooky', gate: '#ff8a12', ghosts: true },
  { name: 'Witch Woods', floor: '#3a2a4a', patch: '#4a3a5a', wall: W('#2a1a3a', '#3a2a4a', '#5a3a7a', '#5fff6a', ['#5a2a8a', '#7a3aaa', '#3a1a5a']), decor: [['tree', 14, 'edge', { leaves: ['#5a2a8a', '#7a3aaa', '#3a1a5a'] }], ['cauldron', 4, 'scatter'], ['mushroom', 8, 'scatter', { cap: '#5fff6a', glow: true, height: 1.6 }], ['orb', 8, 'sky', { color: '#5fff6a' }]], hero: ['cauldron', { color: '#b07bff' }], weather: [{ kind: 'rise', colors: ['#5fff6a', '#b07bff'], count: 110, size: 0.28, speed: 0.5 }], motes: ['#5fff6a'], mood: 'witch', sound: 'spooky', gate: '#5fff6a' },
  { name: 'Candy Land', floor: '#ffb8d8', patch: '#ffd0e8', wall: W('#ff8ac8', '#ff9ad4', '#ffffff', '#5fd8ff', ['#ff5fa8', '#ffd23a', '#5fd8ff']), decor: [['candy', 20, 'edge'], ['candy', 8, 'scatter'], ['cloudPuff', 6, 'edge']], hero: ['rainbow', {}], weather: [{ kind: 'fall', colors: ['#ff5fa8', '#ffd23a', '#5fd8ff', '#7dff3a', '#ffffff'], count: 140, size: 0.22, speed: 0.9, soft: false }], motes: ['#fff0f8'], mood: 'candy', sound: 'candy', gate: '#ff5fa8' },
  { name: 'Toy Town', floor: '#7ad0ff', patch: '#8ad8ff', wall: W('#e0262b', '#2a6dff', '#ffd23a', '#3fb83a'), decor: [['toyBlocks', 14, 'edge'], ['toyBlocks', 6, 'scatter'], ['candy', 4, 'scatter']], hero: ['castleGate', { color: '#ffd23a', roof: '#e0262b' }], weather: [{ kind: 'fall', colors: ['#e0262b', '#2a6dff', '#ffd23a', '#3fb83a'], count: 120, size: 0.25, speed: 1.0, soft: false }], motes: ['#ffffff'], mood: null, sound: 'toys', gate: '#ffd23a' },
  { name: 'Neon City', floor: '#1a1a2a', patch: '#22223a', wall: W('#141424', '#1c1c30', '#2a2a44', '#ff3cb4', ['#3a3a5a', '#2a2a4a', '#4a4a6a']), decor: [['building', 12, 'edge', { glass: '#2a3a7a', neon: ['#ff3cb4', '#3ff0ff', '#ffe14a'] }], ['neonSign', 10, 'edge'], ['lantern', 6, 'scatter', { color: '#3ff0ff' }]], hero: ['building', { glass: '#3a2a7a', neon: ['#ff3cb4'] }], weather: [{ kind: 'rain', colors: ['#9fb8ff'], count: 300, size: 0.5, speed: 26, bright: 0.8 }], motes: ['#ff3cb4', '#3ff0ff'], mood: 'neon', sound: 'city', gate: '#ff3cb4', grid: '#ff3cb4' },
  { name: 'Cyber Grid', floor: '#05101a', patch: '#081a28', wall: W('#04121c', '#061a26', '#0a2a3a', '#3ff0ff', ['#0a3a4a', '#0a2a3a', '#0a4a5a']), decor: [['building', 10, 'edge', { glass: '#0a3a5a', neon: ['#3ff0ff', '#7dff3a'] }], ['orb', 12, 'sky', { color: '#3ff0ff' }], ['beam', 6, 'edge', { color: '#3ff0ff' }]], hero: ['heroCrystal', { color: '#3ff0ff' }], weather: [{ kind: 'rise', colors: ['#3ff0ff', '#7dff3a'], count: 160, size: 0.18, speed: 1.5, soft: false, bright: 2 }], motes: ['#3ff0ff'], mood: 'cyber', sound: 'cyber', gate: '#3ff0ff', grid: '#3ff0ff' },
  { name: 'Robot Factory', floor: '#5a606e', patch: '#6a707e', wall: W('#3a3f4c', '#4a505e', '#ffd23a', '#2a2a30', ['#5a606e', '#6a707e', '#4a505e']), decor: [['gear', 10, 'edge', { color: '#9aa3b2' }], ['steamPipe', 8, 'edge', { color: '#7a808e' }], ['barrels', 6, 'scatter', { color: '#ffd23a' }]], hero: ['dish', {}], weather: [{ kind: 'rise', colors: ['#ffd23a'], count: 60, size: 0.15, speed: 2, soft: false, bright: 2 }], motes: ['#ffe8a0'], mood: 'smog', sound: 'factory', gate: '#ffd23a' },
  { name: 'Steampunk Docks', floor: '#8a6a4a', patch: '#9a7a5a', wall: W('#6a4a2a', '#7a5a3a', '#b08a3a', '#c8a050', ['#8a7a5a', '#9a8a6a', '#7a6a4a']), decor: [['gear', 8, 'edge', { color: '#b08a3a' }], ['steamPipe', 10, 'edge'], ['barrels', 6, 'scatter'], ['floatRock', 4, 'sky', { color: '#6a4a2a', top: '#b08a3a' }]], hero: ['shipwreck', { face: 0.2 }], weather: [{ kind: 'rise', colors: ['#e8e0d0'], count: 70, size: 0.8, speed: 1.2, bright: 0.5 }], motes: ['#ffd8a0'], mood: 'smog', sound: 'steam', gate: '#c8a050' },
  { name: 'Angel Biome', floor: '#e4ecf8', patch: '#f0f4fc', wall: W('#e8f0ff', '#f4f8ff', '#ffffff', '#ffd23a', ['#ffffff', '#fff4d0', '#f0f8ff']), decor: [['cloudPuff', 16, 'edge'], ['statue', 6, 'edge', { color: '#f4f0e0', halo: true }], ['pillar', 8, 'edge', { color: '#f4f0e0' }], ['beam', 6, 'scatter', { color: '#fff2b0' }]], hero: ['fountain', {}], weather: [{ kind: 'fall', colors: ['#ffffff', '#fff4d0'], count: 90, size: 0.4, speed: 0.4, sway: 1.5 }], motes: ['#ffe88a'], mood: 'heaven', sound: 'heaven', gate: '#ffd23a' },
  { name: 'Sky Islands', floor: '#6ad84a', patch: '#7ae05a', wall: W('#8a6a4a', '#9a7a5a', '#6ad84a'), decor: [['floatRock', 12, 'sky'], ['tree', 10, 'edge'], ['cloudPuff', 8, 'scatter'], ['waterPool', 2, 'scatter', { color: '#3fd8ff', w: 6, d: 4 }]], hero: ['rainbow', {}], weather: [{ kind: 'fall', colors: ['#ffffff'], count: 40, size: 0.3, speed: 0.4 }], motes: ['#ffffff', '#c8ff6a'], mood: null, sound: 'wind', gate: '#3fd8ff' },
  { name: 'Storm Peaks', floor: '#5a5f6a', patch: '#4a4f5a', wall: W('#3a3f4a', '#444a56', '#5a5f6a', '#ffe14a', ['#3a4a3a', '#2a3a2a', '#4a5a4a']), decor: [['rock', 14, 'edge', { color: '#4a4f5a' }], ['pine', 8, 'edge', { leaf: '#2a4a3a' }], ['obelisk', 4, 'scatter', { color: '#4a4f5a', glowTip: '#9fe8ff' }]], hero: ['obelisk', { color: '#3a3f4a', glowTip: '#ffe14a' }], weather: [{ kind: 'rain', colors: ['#c8d8ff'], count: 360, size: 0.5, speed: 30, bright: 0.8 }], motes: ['#9fe8ff'], mood: 'storm', sound: 'storm', gate: '#ffe14a' },
  { name: 'Ancient Temple', floor: '#7aa88a', patch: '#8ab89a', wall: W('#4a7a5a', '#5a8a6a', '#3fb83a', '#ffd23a'), decor: [['pillar', 12, 'edge', { color: '#8ab89a' }], ['statue', 6, 'edge', { color: '#5a8a6a' }], ['torch', 8, 'edge', { color: '#5fff6a' }], ['goldPile', 3, 'scatter']], hero: ['pyramid', { color: '#5a8a6a' }], weather: [{ kind: 'fall', colors: ['#9fe060', '#ffe14a'], count: 60, size: 0.3, speed: 0.6, sway: 1.5 }], motes: ['#c8ff6a'], mood: 'jade', sound: 'temple', gate: '#5fff6a' },
  { name: "Dragon's Lair", floor: '#3a1a1a', patch: '#4a2020', wall: W('#2a1414', '#3a1a1a', '#5a2020', '#ffd23a', DARK), decor: [['goldPile', 12, 'scatter'], ['torch', 10, 'edge', { color: '#ff3b1a' }], ['bones', 4, 'edge'], ['lavaPool', 3, 'edge', { w: 6, d: 3 }]], hero: ['dragonSkull', {}], weather: [{ kind: 'rise', colors: ['#ffd23a', '#ff5a1a'], count: 120, size: 0.22, speed: 1.2, bright: 2.2 }], motes: ['#ffd23a'], mood: 'dragon', sound: 'lava', gate: '#ffd23a' },
  { name: 'Celestial Garden', floor: '#2a2a5a', patch: '#3a3a6a', wall: W('#1a1a4a', '#22225a', '#6a4ac8', '#ffe88a', ['#b07bff', '#8a5aea', '#d8b0ff']), decor: [['tree', 10, 'edge', { leaves: ['#b07bff', '#8a5aea', '#d8b0ff'] }], ['orb', 16, 'sky', { color: '#ffe88a' }], ['crystal', 8, 'scatter', { color: '#d8b0ff' }], ['flowers', 8, 'scatter', { colors: ['#3ff0ff', '#ffe88a', '#ff7ad8'] }]], hero: ['planet', { color: '#b07bff', size: 9, ring: '#ffe88a' }], weather: [{ kind: 'fall', colors: ['#ffe88a', '#ffffff', '#b07bff'], count: 120, size: 0.3, speed: 0.4, soft: false, bright: 2 }], motes: ['#ffe88a'], mood: 'celestial', sound: 'aurora', gate: '#ffe88a' },
  { name: 'Galaxy Road', floor: '#100a24', patch: '#1a1034', wall: W('#0a0618', '#120a24', '#3a1a6a', '#ff3cb4', ['#3a1a6a', '#5a2a8a', '#2a1a4a']), decor: [['orb', 18, 'sky', { color: '#ff7ad8' }], ['crystal', 8, 'edge', { color: '#ff3cb4' }], ['planet', 2, 'far', { color: '#ff8a5a', size: 16, ring: '#ffd27a' }]], hero: ['planet', { color: '#3a8aff', size: 12 }], weather: [{ kind: 'fall', colors: ['#ffffff', '#ff7ad8', '#3ff0ff'], count: 160, size: 0.2, speed: 0.3, soft: false, bright: 2.2 }], motes: ['#ff7ad8', '#3ff0ff'], mood: 'space', sound: 'space', gate: '#ff3cb4' },
  { name: 'Moon Base', floor: '#9aa0aa', patch: '#8a909a', wall: W('#6a707a', '#7a808a', '#9aa0aa', '#3ff0ff', ['#8a909a', '#9aa0aa', '#7a808a']), decor: [['crater', 10, 'scatter'], ['dome', 4, 'edge'], ['dish', 4, 'edge'], ['planet', 1, 'far', { color: '#3a8aff', size: 22 }]], hero: ['dome', {}], weather: [{ kind: 'fall', colors: ['#ffffff'], count: 60, size: 0.15, speed: 0.15, soft: false, bright: 2 }], motes: ['#3ff0ff'], mood: 'moon', sound: 'space', gate: '#3ff0ff' },
  { name: 'Rainbow Road', floor: '#f0e8ff', patch: '#ffe8f8', wall: W('#b07bff', '#c08aff', '#ffffff', '#ffe14a', ['#ff5fa8', '#5fd8ff', '#ffd23a']), decor: [['orb', 14, 'sky', { color: '#ffffff' }], ['crystal', 10, 'edge', { color: '#ff5fa8' }], ['crystal', 10, 'edge', { color: '#5fd8ff' }]], hero: ['rainbow', {}], weather: [{ kind: 'fall', colors: ['#ff3b3b', '#ff9a1a', '#ffe14a', '#3fdc4c', '#2a9cff', '#8a3cff'], count: 180, size: 0.25, speed: 0.6, soft: false, bright: 2 }], motes: ['#ffffff'], mood: 'rainbow', sound: 'gold', gate: '#ffffff', rainbowFloor: true },
  { name: 'Golden Paradise', floor: '#e8b83a', patch: '#f0c84a', wall: W('#e8b83a', '#f0c84a', '#fff0b0', '#ffffff', ['#ffd23a', '#fff0b0', '#ffe14a']), decor: [['goldPile', 14, 'scatter'], ['statue', 8, 'edge', { color: '#ffd23a', halo: true }], ['pillar', 8, 'edge', { color: '#ffe48a' }], ['beam', 6, 'scatter', { color: '#fff2b0' }]], hero: ['fountain', {}], weather: [{ kind: 'fall', colors: ['#ffd23a', '#fff4c0', '#ffffff'], count: 200, size: 0.3, speed: 0.6, soft: false, bright: 2.4 }], motes: ['#ffe88a'], mood: 'golden', sound: 'gold', gate: '#ffd23a' },
]

// Guard vehicles by strength (police.js), five zones per tier, five marks each.
export const GUARD_TIERS = [
  { kind: 'policeBike', name: 'Police Bike' },
  { kind: 'policeSportsBike', name: 'Police Sports Bike' },
  { kind: 'policeCar', name: 'Police Car' },
  { kind: 'policeSUV', name: 'Police SUV' },
  { kind: 'swatTruck', name: 'SWAT Truck' },
  { kind: 'armoredTruck', name: 'Armoured Truck' },
  { kind: 'policeTank', name: 'Police Tank' },
  { kind: 'hoverTank', name: 'Hover Tank' },
]
// Shape of the generated zones: length, how much each climbs, the sign amounts
// (zone 4's 20K grows by `growth` per zone), the bikes on offer and streaming.
export const ZONE_GEN = {
  length: 48, // m per zone
  rise: 0.5, // m each zone's floor sits above the last
  growth: 2.1,
  rarities: ['Rare', 'Epic', 'Legendary', 'Legendary', 'Mythical', 'Insane', 'Secret', 'Cosmic'], // per tier of 5 zones
  posts: [[1, 14], [2, 29], [3, 99]], // [guard posts, up to zone]
  ahead: 2, // zones built and shown ahead of yours
  behind: 1, // ... and behind
}
// Sound (audio.js).
export const AUDIO = { volume: 0.7, bedVolume: 0.55, crossfade: 2, snoreRange: 22, fallRange: 34 }

export const RIDE = { speedScale: 1.7, seatLift: 0.45, bikeScale: 1.25 } // Ride My Bike: speed multiplier, how far the rider sits up, bike size
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
export const ANNOUNCE = { first: 25, every: 90, show: 6, messages: [{ pre: 'A ', bike: 'Secret Phantom GT', post: ' Just Spawned in Angel Biome!' }] }
export const HUD_START = { cash: 3300, gems: 377, income: 10 } // income = treadmill $2/s + Club Tourer $8/s
export const SLOW_MODE_SCALE = 0.5 // walk/sprint speed with Slow Mode on

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
