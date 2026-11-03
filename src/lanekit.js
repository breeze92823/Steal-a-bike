import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { LAYOUT, PALETTE } from './config.js'
import { put, solidBox } from './propkit.js'
import { mulberry32 } from './textures.js'
import { canvasTexture, meterBox, meterPlane, outlinedText, plain, sbox, studMat } from './kit.js'
import { parkingBay } from './vehicles.js'
import { sparkles } from './fx.js'

// Pieces every zone of the north lane is built from: studded floor slabs
// (each zone sits at its own height), patches, pixel puddles, grass clumps,
// cacti, snowy pines, snow chunks, the guard posts' dashed bays and their
// "Recommended" price signs.
const hw = LAYOUT.valley.halfWidth

// --- Ground ---------------------------------------------------------------------------------
// A studded floor slab across the lane from z0 to z1 (z0 > z1), top at `top`,
// with its collider. `lip` darkens the slab's south/north faces (the step you see).
export function floor(root, z0, z1, hex, top = 0, { lip = null } = {}) {
  const len = z0 - z1
  const m = put(root, meterBox(hw * 2 + 2, 1, len), studMat(hex), 0, top - 0.48, (z0 + z1) / 2, false)
  m.receiveShadow = true
  solidBox(hw + 1, 0.5, len / 2, 0, top - 0.48, (z0 + z1) / 2)
  if (lip) {
    for (const z of [z0 + 0.01, z1 - 0.01]) put(root, meterBox(hw * 2 + 2, 1, 0.02, 1), studMat(lip), 0, top - 0.48, z, false)
  }
  return m
}

// Flat studded decal (a lighter patch) lying on a floor whose top is at y.
const decalMats = new Map()
export function patch(root, x, z, w, d, hex, y = 0) {
  let mat = decalMats.get(hex)
  if (!mat) {
    mat = studMat(hex).clone()
    mat.polygonOffset = true
    mat.polygonOffsetFactor = -1
    mat.polygonOffsetUnits = -2
    decalMats.set(hex, mat)
  }
  const m = put(root, meterPlane(w, d), mat, x, y + 0.024, z, false)
  m.receiveShadow = true
  return m
}

// Pixel-blob puddle with a rim. WATER: blue with a lime rim and two lily pads
// with white flowers; ICE: pale cyan with a white rim (the snow zone).
export const WATER = { water: '#3acdf2', fleck: '#46d6f7', rim: '#a4e25a', lilies: true }
export const ICE = { water: '#8fe2fb', fleck: '#a6eafc', rim: '#e9f8ff', lilies: false }
function puddleTexture(cols, rows, seed, look) {
  const rand = mulberry32(seed)
  const cell = 16
  const inside = (c, r) => {
    const dx = (c + 0.5 - cols / 2) / (cols / 2)
    const dy = (r + 0.5 - rows / 2) / (rows / 2)
    const wob = Math.sin(c * 1.7 + seed) * 0.12 + Math.cos(r * 2.3 + seed) * 0.1
    return dx * dx + dy * dy < 0.78 + wob
  }
  return canvasTexture(cols * cell, rows * cell, (ctx) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let near = false
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(c + dc, r + dr)) near = true
        if (inside(c, r)) ctx.fillStyle = rand() < 0.15 ? look.fleck : look.water
        else if (near) ctx.fillStyle = look.rim
        else continue
        ctx.fillRect(c * cell, r * cell, cell, cell)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(c * cell, r * cell, cell, 2)
      }
    }
  })
}
export function puddle(root, x, z, w, d, seed, { y = 0, look = WATER } = {}) {
  const mat = new MeshBasicMaterial({ map: puddleTexture(Math.round(w * 2.4), Math.round(d * 2.4), seed, look), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
  mat.color.setScalar(0.96)
  const m = put(root, new PlaneGeometry(w, d), mat, x, y + 0.03, z, false)
  m.rotation.x = -Math.PI / 2
  if (look.lilies) {
    const rand = mulberry32(seed + 7)
    const pad = plain('#6fd84a', { roughness: 0.7 })
    const flower = plain('#ffffff', { roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.25 })
    for (let i = 0; i < 2; i++) {
      const px = x + (i - 0.5) * w * 0.32 + (rand() - 0.5) * 0.4
      const pz = z + (rand() - 0.5) * d * 0.3
      put(root, new BoxGeometry(0.75, 0.04, 0.5), pad, px, y + 0.05, pz, false)
      put(root, new BoxGeometry(0.3, 0.18, 0.26), flower, px, y + 0.14, pz, false)
    }
  }
  sparkles(root, x, y + 0.05, z, { count: 6, radius: Math.min(w, d) * 0.4, height: 0.5, color: '#e8fdff', size: 0.25, speed: 0.25, seed })
}

// Stepped grass clump (three blocks stepping down), sometimes with a pink flower.
export function clump(root, x, y, z, rotY, s, flower) {
  const g = new Group()
  const mat = studMat('#3dbd2e')
  sbox(g, 0.32, 0.9, 0.42, null, -0.32, 0, 0, { mat, tile: 0.6, shadows: false })
  sbox(g, 0.32, 0.62, 0.42, null, 0, 0, 0, { mat, tile: 0.6, shadows: false })
  sbox(g, 0.32, 0.38, 0.42, null, 0.32, 0, 0, { mat, tile: 0.6, shadows: false })
  if (flower) sbox(g, 0.34, 0.16, 0.44, '#ff8fb4', -0.32, 0.9, 0, { studs: false, shadows: false })
  g.position.set(x, y, z)
  g.rotation.y = rotY
  g.scale.setScalar(s)
  root.add(g)
}

// Lego cactus with one or two arms, on a sand block.
export function cactus(root, x, y, z, h, seed) {
  const rand = mulberry32(seed)
  const g = new Group()
  sbox(g, 1.4, 0.9, 1.4, '#d9b867', 0, 0, 0, { tile: 1 })
  const green = studMat('#3fb53a')
  sbox(g, 0.62, h, 0.62, null, 0, 0.9, 0, { mat: green, tile: 1 })
  const arms = rand() < 0.5 ? [-1, 1] : [rand() < 0.5 ? -1 : 1]
  for (const s of arms) {
    const ay = 0.9 + h * (0.35 + rand() * 0.25)
    sbox(g, 0.5, 0.42, 0.42, null, s * 0.55, ay, 0, { mat: green, tile: 1 })
    sbox(g, 0.42, h * 0.38, 0.42, null, s * 0.72, ay, 0, { mat: green, tile: 1 })
  }
  g.position.set(x, y, z)
  g.rotation.y = rand() * Math.PI
  root.add(g)
}

// Snow-capped pine.
export function snowyPine(scale, seed) {
  const rand = mulberry32(seed)
  const g = new Group()
  sbox(g, 0.6, 2.2, 0.6, PALETTE.trunk, 0, 0, 0)
  const teal = studMat('#3db3c4')
  const snow = studMat('#f2fbff')
  let y = 1.6
  for (const w of [3.4, 2.6, 1.8]) {
    sbox(g, w, 0.9, w, null, (rand() - 0.5) * 0.3, y, (rand() - 0.5) * 0.3, { mat: teal, tile: 1 })
    sbox(g, w * 0.86, 0.3, w * 0.86, null, 0, y + 0.9, 0, { mat: snow, tile: 1 })
    y += 1.2
  }
  g.scale.setScalar(scale)
  return g
}

// A lump of packed snow.
export function snowChunk(root, x, y, z, s, seed) {
  const rand = mulberry32(seed)
  const mat = studMat('#f4fbff')
  sbox(root, s, s * (0.6 + rand() * 0.5), s * (0.8 + rand() * 0.4), null, x, y, z, { mat, tile: 1, rotY: rand() * Math.PI })
}

// --- Guard posts ------------------------------------------------------------------------------
// Adds `obj` at (x, y, z) facing `yaw` (the kit's +X front turned to yaw; SOUTH = toward the plaza).
export const SOUTH = -Math.PI / 2
export function place(root, obj, x, y, z, yaw) {
  obj.position.set(x, y, z)
  obj.rotation.y = yaw
  root.add(obj)
  return obj
}

// A vehicle standing in a dashed bay.
export function parked(root, obj, x, y, z, yaw, bayW = 1.8, bayD = 1.0) {
  place(root, obj, x, y, z, yaw)
  const bay = parkingBay(bayW, bayD)
  bay.position.set(x, y + 0.04, z)
  bay.rotation.set(-Math.PI / 2, 0, yaw)
  root.add(bay)
}

// The wooden sign at each post: the bike-gem icon and the recommended amount
// in green, "Recommended" under it. The face looks along +X.
function gemIcon(ctx, x, y, r) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#123'
  ctx.strokeStyle = '#7fd8ff'
  ctx.lineWidth = r * 0.22
  for (const wx of [-r * 0.62, r * 0.62]) {
    ctx.beginPath()
    ctx.arc(wx, r * 0.35, r * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = '#2a9cff'
  ctx.strokeStyle = '#0a2060'
  ctx.lineWidth = r * 0.12
  ctx.beginPath()
  ctx.moveTo(-r * 0.9, r * 0.1); ctx.lineTo(-r * 0.3, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.4); ctx.lineTo(r * 0.95, 0); ctx.lineTo(r * 0.3, r * 0.35); ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
export function postSign(amount) {
  const g = new Group()
  const wood = plain('#7a4a24', { roughness: 0.9 })
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.16, 1.0, 0.16), wood, 0, 0.5, s * 0.6)
  const tex = canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#8a5a2c'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.14)'
    for (let y = 38; y < h; y += 40) ctx.fillRect(0, y, w, 4)
    ctx.strokeStyle = '#5a3416'
    ctx.lineWidth = 8
    ctx.strokeRect(4, 4, w - 8, h - 8)
    gemIcon(ctx, 74, 64, 26)
    outlinedText(ctx, amount, 160, 66, { size: 62, color: '#7dff3a', outline: '#123a10', width: 8 })
    ctx.save()
    ctx.translate(w / 2, 122)
    ctx.rotate(-0.06)
    outlinedText(ctx, 'Recommended', 0, 0, { size: 30, color: '#a6ff4a', outline: '#1d3a10', width: 6, weight: 600 })
    ctx.restore()
  })
  put(g, new BoxGeometry(0.12, 0.9, 1.45), wood, 0, 1.25, 0)
  const face = new Mesh(new PlaneGeometry(1.42, 0.88), new MeshBasicMaterial({ map: tex }))
  face.material.color.setScalar(0.92)
  face.position.set(0.065, 1.25, 0)
  face.rotation.y = Math.PI / 2
  g.add(face)
  g.rotation.z = 0.06 // leans a little
  return g
}
