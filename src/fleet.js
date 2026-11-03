import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Group, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, TorusGeometry } from 'three'
import { neon, put } from './propkit.js'
import { canvasTexture, plain, sbox, studMat, tube } from './kit.js'
import { BLUE, carFittings, driver, finishGuard, glassMat, lightBar, metal, mirrors, paint, POLICE, RED, startFlashing, tyre, underglow, WHITE_LAMP } from './police.js'

// The guards of the later zones, built from the reference screenshots: the
// navy S.W.A.T. truck (Desert), the riot-unit water-cannon truck (Snow), the
// white-and-navy police tank (Jungle), the police helicopter (Swamp), the
// police monster truck (Candy), the flying police car on four ducted fans
// (Crystal) and the police saucer (Cosmic, Angel). Same kit convention as
// police.js: length along X, front at +X, standing on y = 0. Rotors and fans
// are `userData.spinners` (finishGuard bakes them apart so heist.js can spin
// them); `fly` = how high it cruises while chasing, `sound` = its engine
// voice in audio.js, `headlights` = where its lamps shine in the dark zones.

const NAVY = '#1f2a5c'
const navyStud = () => studMat(NAVY)
const whiteStud = () => studMat('#f2f4fa')
const blackStud = () => studMat('#1c1d24')

// Flat text plate (S.W.A.T., RIOT UNIT, POLICE) on both sides of a body half `hw` wide.
const plateCache = new Map()
function sidePlate(g, text, x, y, hw, w, h, bg = '#f4f6fb', ink = '#1b2a6a', italic = false) {
  const key = `${text}|${bg}|${ink}|${italic}`
  let m = plateCache.get(key)
  if (!m) {
    const tex = canvasTexture(512, 128, (ctx, cw, ch) => {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, cw, ch)
      ctx.fillStyle = ink
      ctx.font = `${italic ? 'italic ' : ''}700 76px "Arial", Fredoka, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, cw / 2, ch / 2 + 4)
    })
    m = new MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2 })
    m.color.setScalar(0.92)
    plateCache.set(key, m)
  }
  for (const s of [-1, 1]) {
    const d = put(g, new PlaneGeometry(w, h), m, x, y, s * (hw + 0.015), false)
    d.rotation.y = s < 0 ? Math.PI : 0
  }
}
// Big chunky wheel for the trucks: tyre, a pale dished rim, a dark hub.
function truckWheel(g, x, y, z, r, w, rim = '#dbe6f0') {
  const t = put(g, new CylinderGeometry(r, r, w, 22), tyre(), x, y, z)
  t.rotation.x = Math.PI / 2
  const side = Math.sign(z) || 1
  put(g, new CylinderGeometry(r * 0.62, r * 0.62, 0.04, 18), plain(rim, { roughness: 0.4 }), x, y, z + side * (w / 2 + 0.01), false).rotation.x = Math.PI / 2
  put(g, new CylinderGeometry(r * 0.24, r * 0.24, 0.06, 12), plain('#2a2d36'), x, y, z + side * (w / 2 + 0.03), false).rotation.x = Math.PI / 2
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    put(g, new BoxGeometry(0.05, 0.05, 0.05), metal('#8a93a6'), x + Math.cos(a) * r * 0.36, y + Math.sin(a) * r * 0.36, z + side * (w / 2 + 0.03), false)
  }
}
// A rotor/fan blade set lying in the XZ plane (spins about Y): `n` blades, `len` tip to tip.
function blades(n, len, width, mat) {
  const r = new Group()
  for (let i = 0; i < n; i++) {
    const b = put(r, new BoxGeometry(len / 2, 0.04, width), mat, 0, 0, 0, false)
    b.geometry.translate(len / 4, 0, 0) // from the hub out
    b.rotation.y = (i / n) * Math.PI * 2
  }
  return r
}

// --- Desert: the S.W.A.T. truck --------------------------------------------------------------
export function swatArmor(mk = 0) {
  startFlashing()
  const g = new Group()
  const hw = 1.25
  const navy = navyStud()
  sbox(g, 6.0, 0.5, 2.2, '#16171c', 0, 0.42, 0, { studs: false }) // chassis
  sbox(g, 6.2, 1.15, hw * 2, null, 0, 0.85, 0, { mat: navy }) // lower body
  sbox(g, 4.6, 1.55, hw * 2 - 0.05, null, -0.8, 2.0, 0, { mat: navy }) // armoured box
  sbox(g, 1.5, 0.55, hw * 2 - 0.05, null, 2.25, 2.0, 0, { mat: navy }) // hood
  const ws = put(g, new BoxGeometry(0.1, 1.0, hw * 2 - 0.3), glassMat(), 1.62, 3.0, 0, false) // windscreen
  ws.rotation.z = 0.42
  sbox(g, 0.9, 0.18, hw * 2 - 0.1, null, 1.2, 3.55, 0, { mat: navy })
  // Side windows (two in the back, one by the driver), the white band and S.W.A.T.
  for (const s of [-1, 1]) {
    for (const x of [-2.4, -1.4]) put(g, new BoxGeometry(0.7, 0.5, 0.04), glassMat(), x, 3.05, s * (hw + 0.005), false)
    put(g, new BoxGeometry(0.6, 0.5, 0.04), glassMat(), 0.9, 3.05, s * (hw + 0.005), false)
    for (const [x, w] of [[-2.6, 0.9], [-0.9, 1.6], [1.3, 1.8]]) put(g, new BoxGeometry(w, 0.16, 0.04), plain('#f2f4fa'), x, 1.78, s * (hw + 0.02), false)
  }
  sidePlate(g, 'S.W.A.T.', -1.7, 2.45, hw, 1.7, 0.42)
  // Push bar: a black frame with uprights in front of the grille.
  put(g, new BoxGeometry(0.16, 0.14, hw * 2), plain('#14151b'), 3.32, 0.75, 0)
  put(g, new BoxGeometry(0.16, 0.14, hw * 2 - 0.4), plain('#14151b'), 3.32, 1.55, 0)
  for (const z of [-0.95, -0.35, 0.35, 0.95]) put(g, new BoxGeometry(0.16, 1.1, 0.14), plain('#14151b'), 3.32, 1.15, z)
  put(g, new BoxGeometry(0.06, 0.5, 1.4), plain('#0e0f14'), 3.11, 1.6, 0) // grille
  for (let i = 0; i < 4; i++) put(g, new BoxGeometry(0.07, 0.04, 1.3), metal('#9aa3b2'), 3.12, 1.42 + i * 0.12, 0, false)
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.06, 0.22, 0.36), WHITE_LAMP, 3.11, 2.25, s * 0.85, false)
  carFittings(g, -3.1, 3.12, 1.35, hw, mk)
  mirrors(g, 1.6, 2.7, hw, navy)
  lightBar(g, 0.7, 3.73, 1.7, mk)
  tube(g, [-1.4, 3.55, -0.8], [-1.4, 4.7, -0.8], 0.018, plain('#1a1c24')) // antenna
  put(g, new BoxGeometry(1.2, 0.2, 0.9), plain('#2a2d36'), -2.0, 3.65, 0.3) // roof hatch
  for (const x of [-2.0, -0.9]) for (const s of [-1, 1]) truckWheel(g, x, 0.62, s * (hw - 0.05), 0.62, 0.5)
  for (const s of [-1, 1]) truckWheel(g, 2.05, 0.62, s * (hw - 0.05), 0.62, 0.5)
  driver(g, 1.0, 2.6, 0.5)
  if (mk >= 4) underglow(g, 6.2, hw * 2)
  Object.assign(g.userData, { zzz: 4.6, sound: 'truck', headlights: [[3.14, 2.25, -0.85], [3.14, 2.25, 0.85]] })
  return g
}

// --- Snow: the riot unit (water cannon) ----------------------------------------------------------
export function riotTruck(mk = 0) {
  startFlashing()
  const g = new Group()
  const hw = 1.25
  const white = whiteStud()
  const navy = navyStud()
  sbox(g, 6.4, 0.5, 2.2, '#16171c', -0.1, 0.45, 0, { studs: false }) // chassis
  // Cab: white, a navy POLICE band, big dark windscreen.
  sbox(g, 2.0, 2.2, hw * 2, null, 2.1, 0.75, 0, { mat: white })
  sbox(g, 2.02, 0.5, hw * 2 + 0.02, null, 2.1, 1.55, 0, { mat: navy })
  sidePlate(g, 'POLICE', 2.1, 1.8, hw + 0.01, 1.6, 0.42, '#1f2a5c', '#ffffff')
  put(g, new BoxGeometry(0.06, 0.95, hw * 2 - 0.3), glassMat(), 3.11, 2.35, 0, false)
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.9, 0.7, 0.04), glassMat(), 2.3, 2.4, s * (hw + 0.005), false)
  sbox(g, 0.3, 0.45, hw * 2 + 0.1, null, 3.2, 0.55, 0, { mat: blackStud() }) // bumper
  put(g, new BoxGeometry(0.06, 0.4, 1.4), plain('#0e0f14'), 3.11, 1.2, 0) // grille
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.06, 0.24, 0.42), WHITE_LAMP, 3.12, 1.25, s * 0.85, false)
  // The tank: a navy drum with white end bands and RIOT UNIT.
  const drum = put(g, new CylinderGeometry(1.15, 1.15, 3.8, 22), paint(NAVY), -1.2, 2.1, 0)
  drum.rotation.z = Math.PI / 2
  for (const x of [-3.0, 0.6]) put(g, new CylinderGeometry(1.18, 1.18, 0.2, 22), paint('#f2f4fa'), x, 2.1, 0).rotation.z = Math.PI / 2
  sidePlate(g, 'RIOT UNIT', -1.4, 2.35, 1.16, 1.4, 0.36)
  sbox(g, 4.0, 0.3, hw * 2 - 0.3, null, -1.2, 0.9, 0, { mat: plain('#2a2d36') }) // tank cradle
  for (let i = 0; i < 3; i++) put(g, new BoxGeometry(0.3, 0.06, 0.5), metal('#9aa3b2'), -2.6 + i * 1.3, 3.27, 0, false) // walkway
  // Roof turret and water cannon on the cab, the hose back to the tank.
  put(g, new CylinderGeometry(0.42, 0.48, 0.3, 14), paint(NAVY), 2.0, 3.1, 0)
  const cannon = put(g, new CylinderGeometry(0.14, 0.18, 1.6, 12), paint(NAVY), 2.5, 3.5, 0)
  cannon.rotation.z = -Math.PI / 2 + 0.25
  put(g, new CylinderGeometry(0.22, 0.16, 0.3, 12), paint('#2a8cff'), 3.3, 3.7, 0).rotation.z = -Math.PI / 2 + 0.25 // nozzle
  tube(g, [1.8, 3.3, 0], [0.4, 3.35, 0], 0.09, plain('#14151b'))
  lightBar(g, 2.35, 2.95, 1.6, mk, 0)
  mirrors(g, 3.0, 2.2, hw, white)
  carFittings(g, -3.2, 3.12, 1.25, hw, mk)
  for (const x of [-2.3, -1.15, 2.1]) for (const s of [-1, 1]) truckWheel(g, x, 0.62, s * (hw - 0.05), 0.62, 0.5)
  driver(g, 2.3, 1.6, 0.5)
  if (mk >= 4) underglow(g, 6.4, hw * 2)
  Object.assign(g.userData, { zzz: 4.8, sound: 'truck', headlights: [[3.14, 1.25, -0.85], [3.14, 1.25, 0.85]] })
  return g
}

// --- Jungle: the police tank (white deck, navy hull and turret, gold badge) ----------------------
export function jungleTank(mk = 0) {
  startFlashing()
  const g = new Group()
  const hw = 1.75
  const navy = navyStud()
  const white = whiteStud()
  // Tracks: black belts, five big white road wheels, sprocket and idler.
  for (const s of [-1, 1]) {
    const z = s * (hw - 0.4)
    sbox(g, 6.0, 1.1, 0.8, null, 0, 0.05, z, { mat: blackStud() })
    for (let i = 0; i < 5; i++) {
      const w = put(g, new CylinderGeometry(0.42, 0.42, 0.84, 18), plain('#eef1f7', { roughness: 0.5 }), -2.0 + i * 1.0, 0.55, z)
      w.rotation.x = Math.PI / 2
      put(g, new CylinderGeometry(0.16, 0.16, 0.88, 10), plain('#2a2d36'), -2.0 + i * 1.0, 0.55, z, false).rotation.x = Math.PI / 2
    }
    for (const x of [-2.95, 2.95]) put(g, new CylinderGeometry(0.34, 0.34, 0.86, 12), metal('#3a3d46'), x, 0.65, z).rotation.x = Math.PI / 2
    sbox(g, 5.4, 0.6, 0.12, null, 0, 1.0, s * (hw + 0.02), { mat: navy }) // skirt
    sidePlate(g, 'POLICE', 0.8, 1.3, hw + 0.03, 1.2, 0.3, '#1f2a5c', '#ffffff')
  }
  sbox(g, 5.8, 0.75, hw * 2 - 0.6, null, 0, 1.0, 0, { mat: navy }) // hull
  sbox(g, 6.4, 0.22, hw * 2 + 0.3, null, 0, 1.75, 0, { mat: white }) // the white deck over the tracks
  sbox(g, 0.9, 0.3, hw * 2 - 0.4, null, 2.6, 1.97, 0, { mat: white })
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.06, 0.18, 0.4), WHITE_LAMP, 3.2, 1.72, s * 1.2, false)
    put(g, new BoxGeometry(0.06, 0.12, 0.16), s < 0 ? RED : BLUE, 3.2, 1.55, s * 0.6, false)
  }
  // Turret: navy with a white front, gold shield badge, long gun with a white sleeve.
  const turret = new Group()
  turret.position.set(-0.4, 1.97, 0)
  sbox(turret, 2.6, 1.0, 2.2, null, 0, 0, 0, { mat: navy })
  sbox(turret, 0.7, 0.9, 2.0, null, 1.5, 0.05, 0, { mat: white })
  for (const s of [-1, 1]) {
    const badge = put(turret, new ConeGeometry(0.2, 0.42, 5), plain('#ffd23a', { metalness: 0.5, roughness: 0.3 }), 0.4, 0.5, s * 1.11, false)
    badge.rotation.x = Math.PI
  }
  put(turret, new CylinderGeometry(0.3, 0.3, 0.8, 14), plain('#f2f4fa'), 2.15, 0.5, 0).rotation.z = Math.PI / 2
  put(turret, new CylinderGeometry(0.15, 0.17, 3.4, 14), plain('#1a1c24', { roughness: 0.5 }), 3.9, 0.5, 0).rotation.z = Math.PI / 2
  put(turret, new CylinderGeometry(0.21, 0.21, 0.36, 12), plain('#1a1c24'), 5.5, 0.5, 0).rotation.z = Math.PI / 2
  lightBar(turret, -0.6, 1.0, 1.4, mk)
  put(turret, new CylinderGeometry(0.36, 0.4, 0.18, 14), paint(NAVY), -0.2, 1.0, 0.6) // hatch
  g.add(turret)
  carFittings(g, -3.2, 3.2, 1.45, hw - 0.4, mk)
  if (mk >= 4) underglow(g, 6.4, hw * 2)
  Object.assign(g.userData, { zzz: 4.6, sound: 'tank', headlights: [[3.22, 1.72, -1.2], [3.22, 1.72, 1.2]] })
  return g
}

// --- Swamp: the police helicopter ----------------------------------------------------------------
export function policeHeli(mk = 0) {
  startFlashing()
  const g = new Group()
  const navy = paint(NAVY)
  const white = paint('#f2f4fa')
  const dark = new MeshStandardMaterial({ color: '#1c2c5a', roughness: 0.08, metalness: 0.4 })
  // Fuselage: navy belly, white upper, a rounded white nose with big dark windows.
  sbox(g, 2.6, 0.75, 1.5, null, 0, 0.55, 0, { mat: navyStud() })
  sbox(g, 2.4, 0.85, 1.46, null, -0.1, 1.3, 0, { mat: whiteStud() })
  const nose = put(g, new SphereGeometry(0.78, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), white, 1.3, 1.05, 0)
  nose.rotation.z = -Math.PI / 2
  nose.scale.set(1, 1.15, 0.95)
  const chin = put(g, new SphereGeometry(0.76, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), navy, 1.3, 1.0, 0)
  chin.rotation.z = -Math.PI / 2
  chin.scale.set(0.6, 1.1, 0.95)
  // Windscreen and cabin windows.
  const wind = put(g, new SphereGeometry(0.8, 16, 10, -0.9, 1.8, 0.25, 0.9), dark, 1.3, 1.05, 0, false)
  wind.rotation.z = -Math.PI / 2
  wind.scale.set(1.02, 1.17, 0.97)
  for (const s of [-1, 1]) put(g, new BoxGeometry(1.2, 0.5, 0.04), dark, 0.2, 1.45, s * 0.74, false)
  sidePlate(g, 'POLICE', -0.2, 0.9, 0.75, 1.0, 0.24, '#1f2a5c', '#ffffff', true)
  put(g, new BoxGeometry(1.6, 0.4, 1.1), white, -0.4, 2.2, 0) // engine cowling
  put(g, new BoxGeometry(0.5, 0.3, 0.7), plain('#2a2d36'), -1.0, 2.2, 0) // exhaust
  // Tail boom, fin, stabiliser, tail rotor.
  const boom = put(g, new CylinderGeometry(0.14, 0.32, 3.6, 12), navy, -2.9, 1.55, 0)
  boom.rotation.z = Math.PI / 2
  put(g, new BoxGeometry(0.7, 1.1, 0.08), white, -4.6, 2.0, 0) // fin
  put(g, new BoxGeometry(0.5, 0.06, 1.1), navy, -4.3, 1.55, 0) // stabiliser
  put(g, new BoxGeometry(0.1, 0.3, 0.06), RED, -4.95, 2.5, 0, false)
  const tail = new Group()
  tail.position.set(-4.75, 2.0, 0.14)
  const tb = blades(2, 0.9, 0.08, plain('#14151b'))
  tb.rotation.x = Math.PI / 2
  tail.add(tb)
  g.add(tail)
  // Skids.
  for (const s of [-1, 1]) {
    tube(g, [-1.4, 0.06, s * 0.85], [1.4, 0.06, s * 0.85], 0.05, plain('#14151b'))
    tube(g, [1.4, 0.06, s * 0.85], [1.6, 0.22, s * 0.85], 0.05, plain('#14151b'))
    for (const x of [-0.8, 0.7]) tube(g, [x, 0.06, s * 0.85], [x, 0.55, s * 0.55], 0.04, navy)
  }
  // Main rotor: mast, hub, four long blades.
  put(g, new CylinderGeometry(0.08, 0.1, 0.5, 10), metal('#5a606e'), -0.1, 2.6, 0)
  const rotor = new Group()
  rotor.position.set(-0.1, 2.88, 0)
  rotor.add(blades(4, 7.4, 0.26, plain('#14151b', { roughness: 0.6 })))
  put(rotor, new CylinderGeometry(0.22, 0.22, 0.14, 12), metal('#8a93a6'), 0, 0, 0)
  g.add(rotor)
  lightBar(g, 0.4, 2.0, 0.9, mk)
  put(g, new BoxGeometry(0.2, 0.1, 0.3), WHITE_LAMP, 1.0, 0.25, 0, false) // searchlight
  driver(g, 0.9, 0.9, 0.35)
  g.scale.setScalar(1.35)
  Object.assign(g.userData, {
    zzz: 5.4,
    sound: 'heli',
    fly: 3.6,
    spinners: [{ obj: rotor, axis: 'y', rate: 26 }, { obj: tail, axis: 'z', rate: 44 }],
    headlights: [[1.05, 0.25, 0]],
    lamps: [[0.4, 2.25, -0.3], [0.4, 2.25, 0.3]],
  })
  return g
}

// --- Candy: the police monster truck ------------------------------------------------------------
function monsterWheel(g, x, y, z, r, w) {
  const t = put(g, new CylinderGeometry(r, r, w, 24), tyre(), x, y, z)
  t.rotation.x = Math.PI / 2
  const lug = plain('#101116', { roughness: 0.95 })
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const b = put(g, new BoxGeometry(0.28, 0.16, w + 0.04), lug, x + Math.cos(a) * r, y + Math.sin(a) * r, z, false)
    b.rotation.z = a
  }
  const side = Math.sign(z) || 1
  put(g, new CylinderGeometry(r * 0.52, r * 0.52, 0.04, 20), plain('#e8eef4', { roughness: 0.4 }), x, y, z + side * (w / 2 + 0.01), false).rotation.x = Math.PI / 2
  put(g, new CylinderGeometry(r * 0.22, r * 0.22, 0.06, 12), plain('#1a1c24'), x, y, z + side * (w / 2 + 0.03), false).rotation.x = Math.PI / 2
}
export function monsterTruck(mk = 0) {
  startFlashing()
  const g = new Group()
  const hw = 1.05
  const R = 1.1
  const lift = 1.75 // the body's underside
  for (const x of [-1.7, 1.75]) for (const s of [-1, 1]) monsterWheel(g, x, R, s * 1.55, R, 0.95)
  // Axles, frame, yellow shocks.
  for (const x of [-1.7, 1.75]) put(g, new BoxGeometry(0.22, 0.22, 3.0), plain('#1a1c24'), x, R, 0)
  sbox(g, 4.4, 0.3, 1.2, '#1a1c24', 0, lift - 0.35, 0, { studs: false })
  for (const x of [-1.7, 1.75]) for (const s of [-1, 1]) tube(g, [x, R + 0.1, s * 0.75], [x + 0.25 * Math.sign(x), lift + 0.05, s * 0.65], 0.09, plain('#ffd21a', { roughness: 0.4 }))
  // Body: black lower and hood, white doors with POLICE, black roof, black bed.
  const black = blackStud()
  const white = whiteStud()
  sbox(g, 4.6, 0.55, hw * 2, null, 0, lift, 0, { mat: black })
  sbox(g, 2.3, 0.85, hw * 2 + 0.04, null, 0.15, lift + 0.2, 0, { mat: white }) // white doors
  sidePlate(g, 'POLICE', 0.15, lift + 0.62, hw + 0.03, 1.5, 0.34, '#f2f4fa', '#1c1d24')
  sbox(g, 1.3, 0.55, hw * 2, null, 1.65, lift + 0.5, 0, { mat: black }) // hood
  sbox(g, 1.7, 0.2, hw * 2, null, -1.45, lift + 0.5, 0, { mat: black }) // bed floor
  for (const s of [-1, 1]) sbox(g, 1.7, 0.45, 0.12, null, -1.45, lift + 0.5, s * (hw - 0.06), { mat: black }) // bed sides
  sbox(g, 0.12, 0.45, hw * 2, null, -2.25, lift + 0.5, 0, { mat: black })
  sbox(g, 1.6, 0.75, hw * 2 - 0.1, null, 0.0, lift + 1.05, 0, { mat: glassMat() }) // cab glass
  for (const x of [0.78, -0.78]) for (const s of [-1, 1]) sbox(g, 0.1, 0.75, 0.08, null, x, lift + 1.05, s * (hw - 0.09), { mat: black })
  sbox(g, 1.7, 0.14, hw * 2, null, -0.02, lift + 1.8, 0, { mat: black }) // roof
  const ws = put(g, new BoxGeometry(0.06, 0.8, hw * 2 - 0.2), glassMat(), 0.9, lift + 1.4, 0, false)
  ws.rotation.z = 0.35
  put(g, new BoxGeometry(0.08, 0.45, 1.5), plain('#0e0f14'), 2.31, lift + 0.55, 0) // grille
  for (let i = 0; i < 4; i++) put(g, new BoxGeometry(0.09, 0.04, 1.4), metal(), 2.32, lift + 0.4 + i * 0.1, 0, false)
  for (const s of [-1, 1]) {
    put(g, new BoxGeometry(0.06, 0.2, 0.3), WHITE_LAMP, 2.32, lift + 0.85, s * 0.8, false)
    tube(g, [-0.85, lift + 0.6, s * 0.95], [-0.85, lift + 2.3, s * 0.95], 0.08, metal('#dfe5ee')) // exhaust stacks
  }
  put(g, new BoxGeometry(0.3, 0.3, hw * 2 + 0.2), plain('#1a1c24'), 2.4, lift + 0.1, 0) // bumper
  lightBar(g, 0.0, lift + 1.94, 1.5, mk)
  carFittings(g, -2.3, 2.33, lift + 0.3, hw, mk)
  mirrors(g, 0.85, lift + 1.1, hw, black)
  driver(g, 0.1, lift + 0.6, 0.45)
  if (mk >= 4) underglow(g, 4.6, 3)
  Object.assign(g.userData, { zzz: 5.6, sound: 'monster', headlights: [[2.34, lift + 0.85, -0.8], [2.34, lift + 0.85, 0.8]] })
  return g
}

// --- Crystal: the flying police car on four ducted fans -----------------------------------------
export function flyingCar(mk = 0) {
  startFlashing()
  const g = new Group()
  const hw = 1.0
  const lift = 0.55
  sbox(g, 4.4, 0.45, hw * 2, null, 0, lift, 0, { mat: navyStud() }) // navy belly
  sbox(g, 4.3, 0.5, hw * 2 + 0.02, null, 0, lift + 0.45, 0, { mat: whiteStud() })
  sidePlate(g, 'POLICE', -0.1, lift + 0.7, hw + 0.01, 1.4, 0.32, '#1f2a5c', '#ffffff', true)
  sbox(g, 1.3, 0.25, hw * 2, null, 1.5, lift + 0.95, 0, { mat: whiteStud() }) // hood
  sbox(g, 2.0, 0.7, hw * 2 - 0.12, null, -0.35, lift + 0.95, 0, { mat: glassMat() }) // cabin glass
  for (const x of [0.62, -0.35, -1.32]) for (const s of [-1, 1]) sbox(g, 0.1, 0.7, 0.07, null, x, lift + 0.95, s * (hw - 0.08), { mat: whiteStud() })
  sbox(g, 2.1, 0.12, hw * 2 - 0.05, null, -0.35, lift + 1.65, 0, { mat: studMat('#1c1d24') }) // roof
  const tailFin = sbox(g, 0.9, 0.9, 0.12, null, -1.9, lift + 0.95, 0, { mat: navyStud() })
  tailFin.rotation.z = 0.3
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.06, 0.16, 0.36), WHITE_LAMP, 2.21, lift + 0.6, s * 0.7, false)
  carFittings(g, -2.2, 2.21, lift + 0.55, hw, mk)
  lightBar(g, -0.3, lift + 1.77, 1.4, mk)
  // Four ducted fans on struts: white rings with a blue stripe, spinning blades inside.
  const spinners = []
  const ring = paint('#f2f4fa')
  const stripe = neon('#2a9cff', 1.6)
  for (const x of [-1.6, 1.6]) {
    for (const s of [-1, 1]) {
      const fx = x
      const fz = s * 1.75
      put(g, new TorusGeometry(0.85, 0.2, 10, 28), ring, fx, lift + 0.25, fz).rotation.x = Math.PI / 2
      put(g, new TorusGeometry(0.85, 0.05, 6, 28), stripe, fx, lift + 0.17, fz, false).rotation.x = Math.PI / 2
      put(g, new CylinderGeometry(0.16, 0.16, 0.2, 10), plain('#1a1c24'), fx, lift + 0.25, fz)
      put(g, new BoxGeometry(0.2, 0.12, 1.0), paint(NAVY), fx, lift + 0.3, s * 1.2) // strut
      const fan = new Group()
      fan.position.set(fx, lift + 0.25, fz)
      fan.add(blades(3, 1.5, 0.22, plain('#1a1c24', { roughness: 0.6 })))
      g.add(fan)
      spinners.push({ obj: fan, axis: 'y', rate: s * (x > 0 ? 34 : -34) })
    }
  }
  driver(g, 0.3, lift + 0.6, 0.4)
  if (mk >= 4) underglow(g, 4.4, hw * 2 + 2)
  Object.assign(g.userData, { zzz: 3.6, sound: 'fan', hover: true, fly: 1.3, spinners, headlights: [[2.23, lift + 0.6, -0.7], [2.23, lift + 0.6, 0.7]] })
  return g
}

// --- Cosmic / Angel: the police saucer ------------------------------------------------------------
export function policeSaucer(mk = 0) {
  startFlashing()
  const g = new Group()
  const hull = paint(mk >= 4 ? '#f4f0e0' : '#c8ced8')
  const trim = mk >= 4 ? plain('#ffd23a', { metalness: 0.6, roughness: 0.3 }) : paint(NAVY)
  const y = 1.3
  const top = put(g, new CylinderGeometry(1.4, 3.0, 0.6, 32), hull, 0, y + 0.3, 0)
  top.castShadow = true
  put(g, new CylinderGeometry(3.0, 1.8, 0.45, 32), trim, 0, y - 0.22, 0)
  put(g, new CylinderGeometry(3.08, 3.08, 0.1, 32), trim, 0, y, 0)
  const dome = put(g, new SphereGeometry(1.25, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: '#bfe8ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }), 0, y + 0.6, 0, false)
  dome.scale.y = 0.85
  // A ring of red and blue lamps that turns.
  const ring = new Group()
  ring.position.set(0, y, 0)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    put(ring, new SphereGeometry(0.14, 8, 6), i % 2 ? BLUE : RED, Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1, false)
  }
  g.add(ring)
  // Underside: three landing legs and the tractor-beam emitter.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5
    tube(g, [Math.cos(a) * 1.2, y - 0.3, Math.sin(a) * 1.2], [Math.cos(a) * 1.8, 0.05, Math.sin(a) * 1.8], 0.06, metal('#5a606e'))
    put(g, new CylinderGeometry(0.22, 0.26, 0.08, 10), metal('#3a3f4c'), Math.cos(a) * 1.8, 0.04, Math.sin(a) * 1.8)
  }
  put(g, new CircleGeometry(0.9, 20), neon('#7df9ff', 2.4), 0, y - 0.46, 0, false).rotation.x = Math.PI / 2
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.08, 0.12, 0.4), WHITE_LAMP, 2.95, y + 0.05, s * 0.5, false)
  sidePlate(g, 'POLICE', 0, y + 0.3, 2.1, 1.6, 0.34, '#1f2a5c', '#ffffff', true)
  // The pilot under the dome.
  sbox(g, 0.4, 0.4, 0.6, '#4aa6ec', -0.1, y + 0.55, 0, { studs: false, shadows: false })
  const head = sbox(g, 0.36, 0.36, 0.36, '#f0c497', -0.05, y + 0.95, 0, { studs: false, shadows: false })
  head.rotation.z = -0.4
  if (mk >= 4) underglow(g, 6, 6)
  Object.assign(g.userData, {
    zzz: 4.0,
    sound: 'ufo',
    hover: true,
    fly: 1.6,
    spinners: [{ obj: ring, axis: 'y', rate: 3 }],
    lamps: [[1.0, y + 0.9, -0.8], [1.0, y + 0.9, 0.8]],
    headlights: [[3.0, y + 0.05, -0.5], [3.0, y + 0.05, 0.5]],
  })
  return g
}

// Every guard the zones can name: the police.js fleet plus these.
export const FLEET = { ...POLICE, swatArmor, riotTruck, jungleTank, policeHeli, monsterTruck, flyingCar, policeSaucer }
export const fleetVehicle = (kind, mk = 0) => finishGuard(FLEET[kind](mk))
