import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, RingGeometry, Shape, ShapeGeometry, SphereGeometry, TorusGeometry } from 'three'
import { EXCLUSIVE, GIFT, LEADERBOARD, PALETTE } from './config.js'
import { bikeModel } from './bikes3d.js'
import { bikePrice, CATALOG } from './bikeart.js'
import { net, onLeaderboard } from './net.js'
import { shortNumber } from './hud.js'
import { bake, bakeStatic } from './bake.js'
import { label, neon, put, solidBox, solidPole } from './propkit.js'
import { canvasTexture, hay, lampPost, liveLabel, outlinedText, plain, pumpkin, sbox, studMat, voxelTree } from './kit.js'
import { bob, onFrame, sparkles } from './fx.js'

// The strip north of the road: the shops and machines. West to east: lamp and
// tree planter, the SELL! stall with its glowing ring, the Fuse Machine at the valley mouth;
// across the junction the Trails stall and its glowing pool, the FREE GIFT! chest, the MOST CASH board, the Exclusive bike in its bubble, another
// planter and lamp. Everything faces south, toward the road.
const P = PALETTE
const STALL_BRICK = '#cf9a86'

// --- Pieces -------------------------------------------------------------------------------
function stripes(a, b, n = 8) {
  const t = canvasTexture(256, 64, (ctx, w, h) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? b : a
      ctx.fillRect((i * w) / n, 0, w / n, h)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)' // stud rows
    for (let y = 8; y < h; y += 16) for (let x = 4; x < w; x += 16) ctx.fillRect(x, y, 9, 3)
  })
  return t
}

function checkerFlag() {
  return canvasTexture(64, 48, (ctx, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#111' : '#fff'
      ctx.fillRect(x * 13, y * 12, 13, 12)
    }
  })
}

// Glowing disc on the ground with a bright white rim (sell zone, shop zone, gift spot).
function glowDisc(root, x, z, r, color, bright = 1.4) {
  const disc = put(root, new CircleGeometry(r, 48), neon(color, bright), x, 0.035, z, false)
  disc.rotation.x = -Math.PI / 2
  const rim = put(root, new RingGeometry(r - 0.18, r + 0.12, 64), neon('#ffffff', 3.2), x, 0.04, z, false)
  rim.rotation.x = -Math.PI / 2
  const halo = put(root, new RingGeometry(r + 0.1, r + 0.6, 64), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false }), x, 0.04, z, false)
  halo.rotation.x = -Math.PI / 2
}

// The yellow blocky shopkeeper behind a counter.
function shopkeeper(g, x, y, z) {
  sbox(g, 0.9, 0.9, 0.5, '#1f6dff', x, y, z, { studs: false })
  sbox(g, 0.6, 0.6, 0.6, '#ffd21a', x, y + 0.9, z, { studs: false })
  put(g, new BoxGeometry(0.08, 0.12, 0.02), plain('#111'), x - 0.12, y + 1.3, z + 0.31, false)
  put(g, new BoxGeometry(0.08, 0.12, 0.02), plain('#111'), x + 0.12, y + 1.3, z + 0.31, false)
}

// Market stall: brick counter and posts, striped awning sloping to the front.
function stall(root, x, z, { a, b, sign, signColor, flag = false, crates = ['#ffd21a', '#2a8cff'] }) {
  const g = new Group()
  const brick = studMat(STALL_BRICK)
  const w = 6.4
  const dep = 4
  sbox(g, w, 0.5, dep, null, 0, 0, 0, { mat: brick })
  sbox(g, w, 1.1, 0.9, null, 0, 0.5, dep / 2 - 0.45, { mat: brick }) // front counter
  for (const s of [-1, 1]) {
    sbox(g, 0.9, 1.1, dep - 0.9, null, s * (w / 2 - 0.45), 0.5, -0.45, { mat: brick })
    sbox(g, 0.5, 3.4, 0.5, null, s * (w / 2 - 0.25), 0.5, dep / 2 - 0.25, { mat: brick })
    sbox(g, 0.5, 3.9, 0.5, null, s * (w / 2 - 0.25), 0.5, -dep / 2 + 0.25, { mat: brick })
  }
  sbox(g, w, 0.4, 0.5, null, 0, 3.9, dep / 2 - 0.25, { mat: brick })
  sbox(g, w, 0.4, 0.5, null, 0, 4.4, -dep / 2 + 0.25, { mat: brick })
  // Awning: striped slope + scalloped front edge.
  const awn = new MeshStandardMaterial({ map: stripes(a, b), roughness: 0.7 })
  const slope = put(g, new BoxGeometry(w + 0.6, 0.25, dep + 0.4), awn, 0, 4.55, 0.1)
  slope.rotation.x = 0.14
  for (let i = 0; i < 8; i++) {
    const sx = -w / 2 - 0.3 + (i + 0.5) * ((w + 0.6) / 8)
    sbox(g, (w + 0.6) / 8, 0.6, 0.3, i % 2 ? b : a, sx, 3.55, dep / 2 + 0.25, { studs: false })
  }
  // Goods + keeper.
  sbox(g, 0.9, 0.7, 0.7, crates[0], -0.6, 1.6, dep / 2 - 0.45)
  sbox(g, 0.8, 0.8, 0.7, crates[1], 0.5, 1.6, dep / 2 - 0.45)
  shopkeeper(g, 0, 0.5, -0.3)
  g.position.set(x, 0, z)
  root.add(bake(g, true))
  solidBox(w / 2, 1, dep / 2, x, 1, z)
  if (flag) {
    const pole = put(root, new BoxGeometry(0.12, 2.2, 0.12), plain('#ddd'), x + w / 2 - 0.4, 5.6, z - 1, false)
    pole.castShadow = true
    const f = put(root, new PlaneGeometry(1.4, 1), new MeshStandardMaterial({ map: checkerFlag(), side: 2 }), x + w / 2 + 0.3, 6.2, z - 1, false)
    f.userData.dynamic = true
    onFrame((dt, t) => (f.rotation.y = Math.sin(t * 2.2) * 0.25))
  }
  if (sign) {
    const s = label(sign, 1.7, { color: signColor, outline: '#ffffff', outlineWidth: 12 })
    s.position.set(x, 6.3, z + 1.4)
    root.add(s)
  }
}

function fuseScreen() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0d2a6e'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#4fd8ff'
    ctx.lineWidth = 10
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6
      ctx.lineTo(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 12
    for (const a of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
      ctx.beginPath()
      ctx.moveTo(128, 128)
      ctx.lineTo(128 + Math.cos(a) * 46, 128 + Math.sin(a) * 46)
      ctx.stroke()
    }
    ctx.fillStyle = '#4fd8ff'
    for (const [x, d] of [[22, 1], [234, -1]]) {
      ctx.beginPath()
      ctx.moveTo(x, 128)
      ctx.lineTo(x + d * 14, 112)
      ctx.lineTo(x + d * 14, 144)
      ctx.fill()
    }
  })
}

function fuseMachine(root, x, z) {
  const g = new Group()
  const blue = studMat('#2f7fe6')
  const light = studMat('#8fd0ff')
  sbox(g, 5, 0.5, 3.6, null, 0, 0, 0, { mat: studMat('#3a6fc0') })
  sbox(g, 3.8, 3.4, 3, null, 0, 0.5, 0, { mat: blue })
  sbox(g, 3.2, 2.6, 0.2, null, 0, 0.8, 1.5, { mat: light }) // screen bezel
  // Dome stack on top.
  const dome = (r, h, y, mat) => put(g, new CylinderGeometry(r, r, h, 20), mat, 0, y, 0)
  dome(1.6, 0.45, 4.15, plain('#8fd0ff'))
  dome(1.3, 0.45, 4.6, plain('#2f7fe6'))
  dome(0.9, 0.35, 5.0, plain('#e8f6ff'))
  put(g, new TorusGeometry(1.45, 0.08, 6, 24), neon('#5fe4ff', 3), 0, 4.4, 0, false).rotation.x = Math.PI / 2
  // Vent stack (right) and a side console (left).
  for (let i = 0; i < 6; i++) put(g, new CylinderGeometry(0.75, 0.75, 0.22, 14), plain(i % 2 ? '#9aa6b8' : '#c9d3e0'), 2.3, 0.7 + i * 0.4, -0.2)
  sbox(g, 1.1, 1.3, 1.6, null, -2.4, 0.5, 0.5, { mat: light })
  put(g, new BoxGeometry(0.7, 0.3, 0.05), neon('#5fe4ff', 2.5), -2.4, 1.4, 1.32, false)
  const tex = fuseScreen()
  const screen = put(g, new PlaneGeometry(2.8, 2.3), new MeshBasicMaterial({ map: tex }), 0, 2.15, 1.62, false)
  const t = label('FUSE', 0.32, { color: '#ffffff', outline: '#0b1a3a', outlineWidth: 6 })
  t.position.set(0, 3.55, 1.7)
  g.add(t)
  g.position.set(x, 0, z)
  g.rotation.y = 0.2
  root.add(g)
  onFrame((dt, time) => screen.material.color.setScalar(1.2 + Math.sin(time * 2.5) * 0.35))
  solidBox(2.5, 2.5, 1.8, x, 2.5, z, 0.2)
  const s = label('Fuse Machine!', 1.35, { color: '#2a8cff', outline: '#0b1a3a' })
  s.position.set(x, 6.4, z)
  root.add(s)
  sparkles(root, x, 4.6, z, { count: 14, radius: 1.4, height: 2, color: '#7fe8ff', size: 0.3, speed: 0.6 })
}

// The MOST CASH board: the server's global top 50 by cash (net.js `leaderboard`, refreshed every
// 60 s), LEADERBOARD.rows at a time, paging through them every LEADERBOARD.pageEvery s. Offline
// (no server / still loading) it says so instead of showing made-up players.
const BOARD = { w: 512, h: 720, tex: null, rows: null, rank: null, page: 0, shown: '' }

function drawBoard(ctx, w, h) {
  ctx.fillStyle = '#10163a'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#25e6ff'
  ctx.lineWidth = 22
  ctx.strokeRect(11, 11, w - 22, h - 22)
  outlinedText(ctx, 'MOST CASH', w / 2, 74, { size: 58, color: '#5dff4a', width: 0 })
  const rows = BOARD.rows
  const pages = rows ? Math.max(1, Math.ceil(rows.length / LEADERBOARD.rows)) : 1
  outlinedText(ctx, `GLOBAL TOP 50 • PAGE ${Math.min(BOARD.page, pages - 1) + 1}/${pages}`, w / 2, 120, { size: 22, color: '#5fe4ff', width: 0 })
  if (!rows || !rows.length) {
    outlinedText(ctx, rows ? 'No scores yet' : net.connected ? 'Loading...' : 'Server offline', w / 2, 360, { size: 34, color: '#e9eefc', width: 0 })
  } else {
    const start = Math.min(BOARD.page, pages - 1) * LEADERBOARD.rows
    for (let i = 0; i < LEADERBOARD.rows; i++) {
      const r = rows[start + i]
      if (!r) break
      const y = 150 + i * 50
      ctx.fillStyle = i % 2 ? '#e9eefc' : '#ffffff'
      ctx.fillRect(40, y, w - 80, 44)
      outlinedText(ctx, `${start + i + 1}`, 64, y + 23, { size: 24, color: '#ff8a1c', width: 0 })
      outlinedText(ctx, r.name.length > 16 ? `${r.name.slice(0, 15)}...` : r.name, 92, y + 23, { size: 26, color: '#1b1f3a', width: 0, align: 'left' })
      outlinedText(ctx, `$${shortNumber(r.value)}`, w - 56, y + 23, { size: 24, color: '#1aa83a', width: 0, align: 'right' })
    }
  }
  outlinedText(ctx, BOARD.rank ? `Your rank: #${BOARD.rank}` : 'Current cash • refreshes every 60s', w / 2, 680, { size: 22, color: '#ffffff', width: 0 })
}

function repaintBoard() {
  if (!BOARD.tex) return
  const key = `${BOARD.page}|${net.connected}|${BOARD.rank}|${BOARD.rows ? JSON.stringify(BOARD.rows.slice(BOARD.page * LEADERBOARD.rows, (BOARD.page + 1) * LEADERBOARD.rows)) : ''}`
  if (key === BOARD.shown) return
  BOARD.shown = key
  drawBoard(BOARD.tex.image.getContext('2d'), BOARD.w, BOARD.h)
  BOARD.tex.needsUpdate = true
}

function leaderboardTexture() {
  BOARD.tex = canvasTexture(BOARD.w, BOARD.h, drawBoard)
  onLeaderboard((data) => {
    BOARD.rows = data?.boards?.cash ?? []
    BOARD.rank = data?.ranks?.cash ?? null
    BOARD.page = 0
    repaintBoard()
  })
  let t = 0
  onFrame((dt) => {
    t += dt
    if (t < LEADERBOARD.pageEvery) return
    t = 0
    if (BOARD.rows?.length > LEADERBOARD.rows) BOARD.page = (BOARD.page + 1) % Math.ceil(BOARD.rows.length / LEADERBOARD.rows)
    repaintBoard() // also picks up the server going on/offline
  })
  return BOARD.tex
}

function leaderboard(root, x, z, yaw) {
  const g = new Group()
  sbox(g, 5.4, 0.6, 1.6, '#8fd8ff', 0, 0, 0)
  for (const s of [-1, 1]) put(g, new BoxGeometry(0.3, 2.2, 0.3), plain('#203060'), s * 1.6, 1.6, 0)
  const board = put(g, new PlaneGeometry(4.6, 6.5), new MeshBasicMaterial({ map: leaderboardTexture() }), 0, 5.6, 0.12, false)
  board.material.color.setScalar(1.1)
  put(g, new BoxGeometry(4.8, 6.7, 0.2), plain('#0c1230'), 0, 5.6, 0)
  g.position.set(x, 0, z)
  g.rotation.y = yaw
  root.add(g)
  solidBox(2.7, 3, 0.8, x, 3, z, yaw)
}

// Treasure chest on a glowing yellow disc.
function giftChest(root, x, z) {
  glowDisc(root, x, z, 2.4, '#ffe23a', 1.6)
  const g = new Group()
  sbox(g, 1.9, 1.0, 1.3, '#ff7a1a', 0, 0, 0)
  sbox(g, 1.95, 0.55, 1.35, '#e0401f', 0, 1.0, 0)
  for (const s of [-0.6, 0.6]) sbox(g, 0.18, 1.6, 1.4, '#ffd21a', s, 0, 0, { studs: false })
  sbox(g, 0.35, 0.4, 0.1, '#ffd21a', 0, 0.75, 0.68, { studs: false })
  g.position.set(x, 0.05, z)
  g.rotation.y = -0.35
  const chest = bake(g, true)
  root.add(chest)
  bob(chest, 0.06, 2.5)
  solidBox(1, 0.8, 0.7, x, 0.8, z, -0.35)
  sparkles(root, x, 0.2, z, { count: 18, radius: 2, height: 2.5, color: '#fff27a', size: 0.32, speed: 0.7 })
  const t1 = label('FREE GIFT!', 1.5, { color: '#7dff3a', outline: '#0b3a10' })
  t1.position.set(x - 0.5, 4.2, z)
  const t2 = label(`WATCH AN AD • +${GIFT.speed} SPEED`, 0.55, { color: '#ffffff', outline: '#1b1b2a', outlineWidth: 8 })
  t2.position.set(x - 0.5, 3.45, z)
  root.add(t1, t2)
}

// Round podium (two tiers, glowing rims) with a slowly turning bike.
function podium(root, x, z, { lower, upper, rim, bike }) {
  const g = new Group()
  put(g, new CylinderGeometry(2.6, 2.7, 0.35, 32), plain(lower), 0, 0.18, 0)
  put(g, new CylinderGeometry(2.1, 2.1, 0.35, 32), plain(upper), 0, 0.52, 0)
  for (const [r, y] of [[2.62, 0.36], [2.12, 0.7]]) {
    const ring = put(g, new TorusGeometry(r, 0.06, 6, 48), neon(rim, 3), 0, y, 0, false)
    ring.rotation.x = Math.PI / 2
  }
  g.position.set(x, 0, z)
  root.add(g)
  solidPole(2.6, 0.7, x, z)
  const turn = new Group()
  turn.add(bake(bike, true))
  turn.position.set(x, 0.7, z)
  turn.userData.dynamic = true
  root.add(turn)
  onFrame((dt) => (turn.rotation.y += dt * 0.45))
  return turn
}

function planter(root, x, z, seed) {
  const g = new Group()
  sbox(g, 7, 0.55, 3.6, '#c48352', 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const fx = -3 + i
    put(g, new BoxGeometry(0.06, 0.4, 0.06), plain('#3a9a2a'), fx, 0.75, 1.3, false)
    put(g, new BoxGeometry(0.22, 0.18, 0.22), plain('#ff8a1a'), fx, 1.0, 1.3, false)
  }
  const tree = voxelTree(P.leavesOrange, 0.75, seed)
  tree.position.set(1, 0.55, -0.4)
  g.add(tree)
  g.position.set(x, 0, z)
  root.add(bake(g, true))
  solidBox(3.5, 0.28, 1.8, x, 0.28, z)
}

// The pool by the Trails stall: lego water with a glowing white rim.
function roundedRect(w, h, r) {
  const s = new Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}
function glowPool(root, x, z, w, d) {
  const rim = put(root, new ShapeGeometry(roundedRect(w + 0.7, d + 0.7, 2.2), 12), neon('#ffffff', 3), x, 0.03, z, false)
  rim.rotation.x = -Math.PI / 2
  const halo = put(root, new ShapeGeometry(roundedRect(w + 2, d + 2, 2.8), 12), new MeshBasicMaterial({ color: '#bff6ff', transparent: true, opacity: 0.22, depthWrite: false }), x, 0.025, z, false)
  halo.rotation.x = -Math.PI / 2
  const tex = studMat('#3fd2ff').map.clone()
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(1 / 2, 1 / 2) // ShapeGeometry UVs are metres; 2 m per tile
  tex.needsUpdate = true
  const water = put(root, new ShapeGeometry(roundedRect(w, d, 1.8), 12), neon('#14b4ff', 1.15, { map: tex }), x, 0.05, z, false)
  water.rotation.x = -Math.PI / 2
  onFrame((dt, t) => {
    tex.offset.x = Math.sin(t * 0.6) * 0.08
    tex.offset.y = t * 0.03
    water.material.color.copy(water.material.userData.base).multiplyScalar(1.15 + Math.sin(t * 1.7) * 0.12)
  })
  sparkles(root, x, 0.1, z, { count: 22, radius: Math.min(w, d) / 2, height: 1.4, color: '#bff8ff', size: 0.28, speed: 0.45 })
}

// The Exclusive bike: in a glass bubble with spinning rings; the name on top cycles.
function exclusivePodium(root, x, z) {
  const turn = podium(root, x, z, { lower: '#cfd2ff', upper: '#ffffff', rim: '#5fe4ff', bike: new Group() })
  // The three real bikes take turns on the podium (the name labels cycle with them).
  const bikes = EXCLUSIVE.order.map((n) => {
    const b = bake(bikeModel(n), true)
    b.visible = false
    turn.add(b)
    return b
  })
  const bubble = put(root, new SphereGeometry(1.9, 32, 20), new MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }), x, 2.2, z, false)
  bubble.renderOrder = 2
  const rings = []
  for (const tilt of [0.35, -0.5]) {
    const r = put(root, new TorusGeometry(1.95, 0.035, 6, 48), neon('#ffffff', 2.4), x, 2.2, z, false)
    r.rotation.set(tilt, 0, tilt * 0.6)
    r.userData.dynamic = true
    rings.push(r)
  }
  onFrame((dt) => {
    rings[0].rotation.y += dt * 0.7
    rings[1].rotation.y -= dt * 0.5
  })
  const names = EXCLUSIVE.order.map((n) => [n, `$${shortNumber(CATALOG.get(n).income)}/s`, `$${shortNumber(bikePrice(n))}`])
  const nameL = liveLabel(names[0][0], 0.6, { color: '#3fd2ff', outline: '#0b1a3a' })
  const exL = label('Exclusive', 0.4, { color: '#ff4fd8', outline: '#2a0a2a', outlineWidth: 8 })
  const incL = liveLabel(names[0][1], 0.45, { color: '#ffd21a', outline: '#2a1a00', outlineWidth: 8 })
  const priceL = liveLabel('Loading price...', 0.42, { color: '#ffffff', outline: '#111', outlineWidth: 8 })
  nameL.sprite.position.set(x, 5.25, z)
  exL.position.set(x, 4.75, z)
  incL.sprite.position.set(x, 4.35, z)
  priceL.sprite.position.set(x, 3.95, z)
  root.add(nameL.sprite, exL, incL.sprite, priceL.sprite)
  let shown = -1
  onFrame((dt, t) => {
    const i = Math.floor(t / 6) % names.length
    if (i !== shown) {
      shown = i
      nameL.set(names[i][0])
      incL.set(names[i][1])
      priceL.set(names[i][2])
      bikes.forEach((b, k) => (b.visible = k === i))
    }
  })
}

function trailsStall(root, x, z) {
  stall(root, x, z, { a: '#2ec5ff', b: '#ffffff', flag: true, crates: ['#2ec5ff', '#ffffff'] })
  const t = label('TRAILS', 2.6, { color: '#20b4ff', outline: '#0b2a6a', outlineWidth: 16 })
  t.position.set(x - 1, 7.2, z)
  root.add(t)
  glowPool(root, x - 0.5, z + 6.2, 9.5, 5.2)
}

// --- Build ---------------------------------------------------------------------------------
export function buildMarket(scene) {
  const root = new Group()
  scene.add(root)

  // West side.
  const westLamp = lampPost()
  westLamp.position.set(-59, 0, -6.2)
  root.add(westLamp)
  planter(root, -63, -14, 41)
  const post = new Group()
  put(post, new BoxGeometry(0.15, 1.4, 0.15), plain('#3a3a40'), 0, 0.7, 0)
  put(post, new BoxGeometry(0.5, 0.4, 0.35), plain('#f2f2f2'), 0, 1.5, 0)
  post.position.set(-36.5, 0, -8.5)
  root.add(post)
  stall(root, -30, -12, { a: '#ff2a3a', b: '#ffffff', sign: 'SELL!', signColor: '#ff2a3a', flag: true })
  glowDisc(root, -30, -7.4, 2.9, '#ff4a6a', 1.3)
  fuseMachine(root, -15.5, -11)
  glowDisc(root, -15.5, -7.4, 2.9, '#3fb0ff', 1.3)
  for (const [x, z, s, f] of [[-61, -5.8, 1.5, false], [-59.8, -5.2, 1.1, false], [-21.5, -6.6, 1.2, false], [-9.5, -8.5, 1.3, false], [-18, -7.2, 0.9, false]]) {
    const p = pumpkin(s, f)
    p.position.set(x, 0, z)
    p.rotation.y = x * 0.37
    root.add(p)
  }
  hay(root, -11.5, -11.5, 2)
  hay(root, -20, -10, 3)

  // East side.
  for (const [x, z, s] of [[27.6, -13, 1.6], [27.2, -10.8, 1.2], [9.5, -12.5, 1.5], [8.4, -10.8, 1.0]]) {
    const p = pumpkin(s, false)
    p.position.set(x, 0, z)
    p.rotation.y = x * 0.5
    root.add(p)
  }
  trailsStall(root, 33, -13.2)
  hay(root, 24, -8, 4)
  giftChest(root, 41.5, -8.8)
  leaderboard(root, 46.5, -13, -0.25)
  exclusivePodium(root, 55, -11)
  planter(root, 61.5, -14, 43)
  const eastLamp = lampPost()
  eastLamp.position.set(63.5, 0, -6.2)
  root.add(eastLamp)
  const jack = pumpkin(1.3, true)
  jack.position.set(67, 0, -6.8)
  root.add(jack)
  bakeStatic(root)
  return root

}
