import { BoxGeometry, Group, MeshBasicMaterial, PlaneGeometry } from 'three'
import { LAYOUT, PALETTE } from './config.js'
import { bake, bakeStatic } from './bake.js'
import { neon, put } from './propkit.js'
import { canvasTexture, plain } from './kit.js'
import { roadSlab } from './lobby.js'

// The start of the lane north: the junction stub of road with its chevrons
// and crossing stripes, SAFE ZONE painted across its end and the red line
// where the zones start (lane.js builds those).
const L = LAYOUT
const P = PALETTE

// SAFE ZONE in heavy italic capitals (white, dark outline, a dark drop shadow
// for depth) between two blue shield badges.
function safeZoneTexture() {
  return canvasTexture(1280, 192, (ctx, w, h) => {
    for (const x of [100, w - 100]) {
      ctx.save()
      ctx.translate(x, h / 2)
      ctx.rotate(x < w / 2 ? -0.22 : 0.22)
      ctx.beginPath()
      ctx.ellipse(0, 0, 94, 56, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(0, 0, 82, 46, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = '#1f62d8'
      ctx.fillRect(-100, -60, 200, 120)
      ctx.fillStyle = '#3aa6f2'
      ctx.beginPath()
      ctx.moveTo(-100, -60); ctx.lineTo(20, -60); ctx.lineTo(-30, 60); ctx.lineTo(-100, 60)
      ctx.fill()
      ctx.restore()
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'italic 900 150px "Arial Black", Fredoka, sans-serif'
    const tx = w / 2
    const ty = h / 2 + 4
    ctx.lineJoin = 'round'
    ctx.fillStyle = '#2b2b3d' // drop shadow
    ctx.strokeStyle = '#2b2b3d'
    ctx.lineWidth = 16
    ctx.strokeText('SAFE ZONE', tx, ty + 12)
    ctx.fillText('SAFE ZONE', tx, ty + 12)
    ctx.strokeStyle = '#1e1e2c'
    ctx.lineWidth = 12
    ctx.strokeText('SAFE ZONE', tx, ty)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('SAFE ZONE', tx, ty)
  })
}

export function buildValley(scene) {
  const root = new Group()
  const flat = new Group()
  scene.add(root)
  const hw = L.valley.halfWidth
  const southZ = L.safeZoneZ

  // --- The road stub north, markings and the safe-zone line ---
  const j = L.junction
  const roadNorth = j.northZ
  const roadSouth = L.road.z - L.road.halfWidth
  roadSlab(flat, 0, (roadNorth + roadSouth) / 2, j.halfWidth * 2, roadSouth - roadNorth)
  const curb = plain(P.curb, { roughness: 0.6 })
  for (const s of [-1, 1]) put(flat, new BoxGeometry(L.road.curb, 0.06, roadSouth - roadNorth - L.road.curb), curb, s * (j.halfWidth + L.road.curb / 2), 0.03, (roadNorth + roadSouth - L.road.curb) / 2, false)
  const white = plain('#ffffff', { roughness: 0.5 })
  for (let i = 0; i < 6; i++) put(flat, new BoxGeometry(1.1, 0.02, 1.2), white, -4.6 + i * 1.84, 0.05, roadNorth + 0.9, false)
  for (const cz of [-10.2, -7.6]) {
    for (const s of [-1, 1]) {
      const bar = put(flat, new BoxGeometry(2.4, 0.02, 0.3), white, -1.4 + s * 0.95, 0.05, cz + 0.5, false)
      bar.rotation.y = s * 0.5
    }
  }
  for (const cz of [-10.4, -7.4]) {
    const dash = put(flat, new BoxGeometry(0.28, 0.02, 1.8), white, 2.6 - (cz + 9) * 0.25, 0.05, cz, false)
    dash.rotation.y = 0.35
  }
  const safe = put(root, new PlaneGeometry(24, 3.6), new MeshBasicMaterial({ map: safeZoneTexture(), transparent: true, depthWrite: false }), 0, 0.06, southZ + 1.85, false)
  safe.rotation.x = -Math.PI / 2
  safe.material.color.setScalar(0.95)
  put(root, new BoxGeometry(hw * 2, 0.1, 0.5), neon(P.safeLine, 2.4), 0, 0.06, southZ, false)
  const redGlow = put(root, new PlaneGeometry(hw * 2, 1.2), new MeshBasicMaterial({ color: '#ff4060', transparent: true, opacity: 0.18, depthWrite: false }), 0, 0.07, southZ, false)
  redGlow.rotation.x = -Math.PI / 2

  const baked = bake(flat, false)
  root.add(baked)
  bakeStatic(root)
  return root
}
