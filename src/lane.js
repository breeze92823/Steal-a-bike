import { Group } from 'three'
import { COARSE_POINTER, LANE, LAYOUT, MOODS, ZONE_GEN, ZONE_THEMES } from './config.js'
import { bakeStatic } from './bake.js'
import { setFxOwner } from './fx.js'
import { onThunder, setBed } from './audio.js'
import { buildZone1 } from './zone1.js'
import { buildZone2 } from './zone2.js'
import { buildZone3 } from './zone3.js'
import { buildZone4 } from './zone4.js'
import { buildThemedZone, shortNumber } from './zones.js'

// The north lane as a list of zones, one per Bike Index world: 1..4 (Plain
// World, Lake, Desert, Snow) hand-built from the reference screenshots, 5..12
// generated from ZONE_THEMES. A zone's `dark` flag (Magma, Cosmic, Aurora
// Nexus) has its guard drive with headlights (heist.js). Each zone builds into its
// own group the first time you come within range (one per frame, so walking
// never stalls for long) and is only shown near you; the hub (lobby, shops,
// junction) hides once you are far up the lane. Entering a zone sets its
// lighting mood and ambience and shows its title card on the HUD.
const SHOW_AHEAD = COARSE_POINTER ? 230 : 330 // m ahead of you a zone is drawn
const BUILD_AHEAD = SHOW_AHEAD + 90
const SHOW_BEHIND = 70
const HUB_HIDE_Z = -320 // past here the plaza is out of sight

export function createLane(scene, { lighting, hud, hub }) {
  const zones = []
  const fixed = [
    { name: 'Plain World', end: LANE.zone1.endZ, y: LANE.zone1.y, build: buildZone1, sound: 'meadow', rec: '0', guard: 'Police Bike' },
    { name: 'Lake', end: LANE.zone2.endZ, y: LANE.zone2.y, build: buildZone2, sound: 'meadow', rec: LANE.zone2.recommended, guard: 'Police Car' },
    { name: 'Desert', end: LANE.zone3.endZ, y: LANE.zone3.y, build: buildZone3, sound: 'desert', rec: LANE.zone3.recommended, guard: 'S.W.A.T. Truck' },
    { name: 'Snow', end: LANE.zone4.endZ - LANE.gate.depth, y: LANE.zone4.y, build: buildZone4, sound: 'blizzard', rec: LANE.zone4.recommended, guard: 'Riot Unit', mood: 'ice' },
  ]
  let z0 = LAYOUT.safeZoneZ
  fixed.forEach((f, i) => {
    zones.push({ k: i + 1, name: f.name, z0, z1: f.end, y: f.y, build: f.build, sound: f.sound, mood: f.mood ? MOODS[f.mood] : null, rec: f.rec, guard: f.guard, color: '#ffffff' })
    z0 = f.end
  })
  ZONE_THEMES.forEach((theme, i) => {
    const k = i + 5
    const z1 = z0 - ZONE_GEN.length
    const y = LANE.zone4.y + (k - 4) * ZONE_GEN.rise
    const last = i === ZONE_THEMES.length - 1
    const from = z0
    zones.push({
      k,
      name: theme.name,
      z0: from,
      z1,
      y,
      build: (root) => buildThemedZone(root, k, theme, from, z1, y, { last }),
      sound: theme.sound,
      mood: theme.mood ? MOODS[theme.mood] : null,
      rec: shortNumber(theme.rec),
      guard: theme.guard.name,
      color: theme.gate,
      dark: !!theme.dark,
    })
    z0 = z1
  })

  function build(zone) {
    const group = new Group()
    scene.add(group)
    setFxOwner(group)
    zone.build(group)
    setFxOwner(null)
    bakeStatic(group)
    zone.group = group
  }
  // How far zone `z` is from the player at pz (0 inside), and whether it is ahead (north).
  const distance = (z, pz) => (pz > z.z0 ? [pz - z.z0, true] : pz < z.z1 ? [z.z1 - pz, false] : [0, true])

  let current = null // the zone you are in (null = the hub)
  onThunder(() => {
    if (current?.sound === 'storm') lighting.flash()
  })

  function enter(zone) {
    current = zone
    lighting.setZoneMood(zone?.mood ?? null)
    setBed(zone ? zone.sound : 'meadow')
    if (zone) hud.enterZone(zone)
    else hud.leaveLane()
  }

  // Everything near the spawn is built up front, under the loading screen.
  function update(pos, initial = false) {
    const pz = pos.z
    let builtThisFrame = false
    for (const zone of zones) {
      const [d, ahead] = distance(zone, pz)
      const near = ahead ? d < BUILD_AHEAD : d < SHOW_BEHIND + 40
      if (!zone.group && near && (initial || !builtThisFrame)) {
        build(zone)
        builtThisFrame = true
      }
      if (zone.group) zone.group.visible = ahead ? d < SHOW_AHEAD : d < SHOW_BEHIND
    }
    for (const g of hub) g.visible = pz > HUB_HIDE_Z
    const inZone = pz <= LAYOUT.safeZoneZ ? zones.find((z) => pz <= z.z0 && pz > z.z1) ?? null : null
    if (inZone !== current || initial) enter(inZone)
  }

  return {
    zones,
    update,
    zoneAt: (z) => zones.find((zone) => z <= zone.z0 && z > zone.z1) ?? null,
  }
}
