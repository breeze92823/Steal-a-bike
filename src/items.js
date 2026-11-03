import { AdditiveBlending, BoxGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, Sprite, SpriteMaterial, TorusGeometry, Vector3 } from 'three'
import { COARSE_POINTER, ITEMS, LANE, LAYOUT } from './config.js'
import { player } from './player.js'
import { onKey } from './input.js'
import { heistSfx as sfx } from './audio.js'
import { paintSoftDot } from './textures.js'
import { ITEM_ICONS } from './hud.js'

// Chase items: a hotbar of up to ITEMS.slots stacks (ITEMS.stack each at most).
//  - Pick one with 1-5 or by tapping its slot, then click the world (or F; the
//    USE button over the hotbar on touch) while you ride off with a stolen bike.
//  - Bat: swing it at the guard on your tail. In reach, he is knocked out (Zs
//    over him) and his vehicle bounces back and rolls to a stop for a while.
//    Each bat breaks on its swing, hit or miss.
//  - Barbed Wire: a coil dropped across the lane behind you; driving into it
//    shreds his tyres: he crawls for a few seconds.
//  - Oil Slick: a puddle behind you; he spins out.
//  - Smoke Bomb: a cloud around you; he loses you and wanders off to one side.
//  - Nitro: your bike goes faster for a few seconds (main.js reads `boost`).
// Fliers high above the lane pass over wire and oil. While a guard chases you,
// item crates drop on the lane ahead; ride through one to pick it up.
// The inventory is saved in localStorage `sab-items`.

const KEY = 'sab-items'
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const rand = (a, b) => a + Math.random() * (b - a)

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (Array.isArray(raw)) return raw.filter((s, i) => ITEMS.kinds[s?.id] && s.count > 0 && raw.findIndex((o) => o?.id === s.id) === i).slice(0, ITEMS.slots).map((s) => ({ id: s.id, count: Math.min(ITEMS.stack, s.count | 0) }))
  } catch {}
  return ITEMS.start.map(([id, count]) => ({ id, count }))
}

// The lane's half width at z (narrower through zone 4's ice gate).
function laneHalf(z) {
  const gz = LANE.zone4.endZ
  const gate = z < gz + 4 && z > gz - LANE.gate.depth - 4 // the wall is thick: keep crates clear of its faces
  return gate ? LANE.gate.halfWidth : LAYOUT.valley.halfWidth
}

// Item art for the crates: the hotbar SVG drawn into a canvas (filled in once the image loads).
const iconTex = {}
function iconTexture(id) {
  if (iconTex[id]) return iconTex[id]
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  const img = new Image()
  img.onload = () => {
    const ctx = c.getContext('2d')
    ctx.fillStyle = 'rgba(20, 24, 40, 0.78)'
    ctx.beginPath()
    ctx.arc(64, 64, 60, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#ffe066'
    ctx.stroke()
    ctx.drawImage(img, 22, 22, 84, 84)
    t.needsUpdate = true
  }
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ITEM_ICONS[id].replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))}`
  return (iconTex[id] = t)
}

export function createItems({ scene, hud, heist, lane, rig, canvas }) {
  const touch = COARSE_POINTER || navigator.maxTouchPoints > 0
  const inv = load()
  let selected = -1
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(inv))
    } catch {}
  }
  const refresh = () => hud.setItems(inv, selected)
  refresh()

  const select = (i) => {
    if (i >= inv.length) return
    selected = selected === i ? -1 : i
    refresh()
  }
  hud.onItemSlot(select)
  for (let i = 0; i < ITEMS.slots; i++) onKey(`Digit${i + 1}`, () => select(i))

  // Adds one of `id`: onto its stack (one slot per item), else into a free slot.
  // Returns the slot, or -1 when it is at ITEMS.stack already or the bar is full.
  function add(id) {
    let i = inv.findIndex((s) => s.id === id)
    if (i >= 0 && inv[i].count >= ITEMS.stack) return -1
    if (i < 0) {
      if (inv.length >= ITEMS.slots) return -1
      inv.push({ id, count: 0 })
      i = inv.length - 1
    }
    inv[i].count++
    save()
    refresh()
    hud.bumpItem(i)
    return i
  }
  function spend(i) {
    if (--inv[i].count <= 0) {
      inv.splice(i, 1)
      if (selected === i) selected = -1
      else if (selected > i) selected--
    }
    save()
    refresh()
  }

  // --- The bat in your hand (shown while it is picked in a chase) ----------------------------
  // In the avatar's frame (+Z forward, -X right): a pivot at the right hand, the bat up along +Y.
  const bat = new Group()
  bat.position.set(-0.42, 1.5, 0.15)
  const wood = new MeshStandardMaterial({ color: '#e0bd7c', roughness: 0.55 })
  const barrel = new Mesh(new CylinderGeometry(0.07, 0.032, 0.86, 12), wood)
  barrel.position.y = 0.45
  const grip = new Mesh(new CylinderGeometry(0.036, 0.036, 0.2, 10), new MeshStandardMaterial({ color: '#2a2d36', roughness: 0.8 }))
  grip.position.y = 0.02
  const knob = new Mesh(new CylinderGeometry(0.05, 0.05, 0.03, 10), wood)
  knob.position.y = -0.09
  bat.add(barrel, grip, knob)
  bat.visible = false
  rig.add(bat)
  const splinterAt = new Vector3()
  let swing = -1 // s into a swing, -1 = none
  let batBreak = false // this swing snaps the bat at the end of its strike

  // --- Traps on the lane ------------------------------------------------------------------------
  const steel = new MeshStandardMaterial({ color: '#c9d0da', roughness: 0.3, metalness: 0.85 })
  const stakeMat = new MeshStandardMaterial({ color: '#5a4024', roughness: 0.9 })
  const coilGeo = new TorusGeometry(0.36, 0.022, 5, 20)
  const stakeGeo = new BoxGeometry(0.08, 0.9, 0.08)
  const oilMat = new MeshStandardMaterial({ color: '#07070c', roughness: 0.04, metalness: 0.7, transparent: true, opacity: 0.95, polygonOffset: true, polygonOffsetFactor: -3 })
  const sheenMat = new MeshBasicMaterial({ color: '#8a5aff', transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
  const oilGeo = new CircleGeometry(1, 28)
  const traps = [] // { kind, obj, t, life }

  // Behind you, on the floor.
  function behind() {
    const d = ITEMS.drop
    const x = player.position.x - Math.sin(player.facing) * d
    const z = player.position.z - Math.cos(player.facing) * d
    return { x: clamp(x, -laneHalf(z) + 1, laneHalf(z) - 1), y: lane.zoneAt(z)?.y ?? player.position.y, z }
  }

  function dropWire() {
    const K = ITEMS.kinds.wire
    const at = behind()
    const g = new Group()
    // Concertina wire: overlapping loops strung across the lane, a stake at each end.
    const n = Math.round(K.width / 0.2)
    for (let i = 0; i < n; i++) {
      const m = new Mesh(coilGeo, steel)
      m.position.set(-K.width / 2 + (i + 0.5) * (K.width / n), 0.36, Math.sin(i * 1.7) * 0.06)
      m.rotation.y = Math.PI / 2 + Math.sin(i * 2.3) * 0.35
      m.rotation.x = Math.sin(i * 1.3) * 0.2
      g.add(m)
    }
    for (const s of [-1, 1]) {
      const st = new Mesh(stakeGeo, stakeMat)
      st.position.set((s * K.width) / 2, 0.42, 0)
      g.add(st)
    }
    g.position.set(at.x, at.y, at.z)
    g.rotation.y = player.facing
    g.scale.setScalar(0.01)
    scene.add(g)
    traps.push({ kind: 'wire', obj: g, t: 0, life: K.life, r: K.width / 2 })
    sfx('drop')
  }

  function dropOil() {
    const K = ITEMS.kinds.oil
    const at = behind()
    const g = new Group()
    const pool = new Mesh(oilGeo, oilMat)
    pool.rotation.x = -Math.PI / 2
    pool.scale.set(K.radius, K.radius * 0.8, 1)
    const sheen = new Mesh(oilGeo, sheenMat)
    sheen.rotation.x = -Math.PI / 2
    sheen.position.set(0.3, 0.005, -0.2)
    sheen.scale.set(K.radius * 0.5, K.radius * 0.35, 1)
    g.add(pool, sheen)
    g.position.set(at.x, at.y + 0.03, at.z)
    g.rotation.y = player.facing
    g.scale.setScalar(0.01)
    scene.add(g)
    traps.push({ kind: 'oil', obj: g, t: 0, life: K.life, r: K.radius })
    sfx('drop')
    for (let i = 0; i < 4; i++) heist.puff(at.x, at.y + 0.1, at.z, { color: '#1a1a22', size: 0.8, spread: 1.2, up: 0.6, life: 0.5 })
  }

  function clearTraps() {
    for (const tr of traps) tr.obj.removeFromParent()
    traps.length = 0
  }

  // --- Using the picked item ----------------------------------------------------------------------
  let boostT = 0
  let smokeT = 0
  function use() {
    if (selected < 0 || !inv[selected]) return
    const id = inv[selected].id
    const K = ITEMS.kinds[id]
    if (!heist.carrying || heist.knocked) return hud.say(`Use the ${K.name} while the police chase you`)
    const g = heist.chaser
    const p = player.position
    if (id === 'bat') {
      // One swing per bat: it snaps on the swing, hit or miss.
      if (swing >= 0) return
      if (!g) return hud.say('Nobody to hit yet!')
      if (g.stun > 0 && !g.spinOut) return hud.say('He is already out cold')
      swing = 0
      sfx('swing')
      const o = g.obj.position
      const gap = Math.hypot(o.x - p.x, o.z - p.z) - Math.min(g.obj.userData.length, 6) / 2
      if (gap > K.reach || Math.abs(o.y - p.y) > 4.5) {
        sfx('whiff')
        hud.say('Missed! The bat broke')
      } else {
        heist.stun(g, K.stun, { knock: K.knock })
        sfx('bonk', o)
        for (let i = 0; i < 10; i++) heist.puff(o.x, o.y + g.obj.userData.height * 0.6, o.z, { color: i % 2 ? '#ffffff' : '#ffe066', size: 0.8, spread: 1.6, up: 2.4, life: 0.6, opacity: 0.9 })
        hud.say('BONK! The bat broke')
      }
      batBreak = true
    } else if (id === 'wire') dropWire()
    else if (id === 'oil') dropOil()
    else if (id === 'smoke') {
      if (!g) return hud.say('Nobody is chasing you yet')
      heist.blind(g, K.blindFor)
      smokeT = 1.4
      sfx('smoke', p)
      hud.say('He lost you in the smoke!')
    } else if (id === 'nitro') {
      boostT = ITEMS.kinds.nitro.time
      sfx('nitro')
    }
    spend(selected)
  }
  hud.onItemUse(use)
  onKey('KeyF', use)
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 0 && e.pointerType === 'mouse' && heist.carrying && selected >= 0) use()
  })

  // --- Crates dropping on the lane during a chase ------------------------------------------------
  const P = ITEMS.pickups
  const kinds = Object.keys(P.weights)
  const total = kinds.reduce((s, k) => s + P.weights[k], 0)
  const pickKind = () => {
    let r = Math.random() * total
    for (const k of kinds) if ((r -= P.weights[k]) < 0) return k
    return kinds[0]
  }
  const glowTex = new CanvasTexture(paintSoftDot(128))
  glowTex.colorSpace = SRGBColorSpace
  const crateGeo = new BoxGeometry(0.8, 0.8, 0.8)
  const bandGeo = new BoxGeometry(0.84, 0.16, 0.84)
  const beamGeo = new CylinderGeometry(0.32, 0.32, 7, 12, 1, true)
  const crateMat = new MeshStandardMaterial({ color: '#2a8cff', emissive: '#0a3aa8', emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.2 })
  const bandMat = new MeshStandardMaterial({ color: '#ffd21a', emissive: '#7a4a00', emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.5 })
  const crates = []
  for (let i = 0; i < P.max + 1; i++) {
    const g = new Group()
    const spin = new Group()
    spin.position.y = 0.9
    const box = new Mesh(crateGeo, crateMat)
    const band = new Mesh(bandGeo, bandMat)
    const band2 = new Mesh(bandGeo, bandMat)
    band2.rotation.z = Math.PI / 2
    spin.add(box, band, band2)
    const icon = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false }))
    icon.scale.setScalar(1.1)
    icon.position.y = 2.1
    const halo = new Sprite(new SpriteMaterial({ map: glowTex, color: '#7fd8ff', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.8 }))
    halo.scale.setScalar(2.6)
    halo.position.y = 0.9
    const beam = new Mesh(beamGeo, new MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }))
    beam.position.y = 3.5
    g.add(spin, icon, halo, beam)
    g.visible = false
    g.userData = { spin, icon, id: null, live: false, phase: Math.random() * 6 }
    scene.add(g)
    crates.push(g)
  }
  let nextCrate = rand(...P.every)

  function spawnCrate() {
    const c = crates.find((k) => !k.userData.live)
    if (!c) return
    const p = player.position
    const z = p.z + rand(...P.ahead)
    if (z > LAYOUT.safeZoneZ - 4) return // nearly home: no room ahead
    const hw = laneHalf(z) - 2
    const x = clamp(p.x + rand(-P.spread, P.spread), -hw, hw)
    const id = pickKind()
    c.userData.id = id
    c.userData.live = true
    c.userData.icon.material.map = iconTexture(id)
    c.userData.icon.material.needsUpdate = true
    c.position.set(x, lane.zoneAt(z)?.y ?? 0, z)
    c.visible = true
  }
  function hideCrate(c) {
    c.userData.live = false
    c.visible = false
  }

  // --- Per frame --------------------------------------------------------------------------------
  function update(dt, t) {
    const p = player.position
    const chasing = heist.carrying
    const g = heist.chaser

    // The bat: up over your shoulder while picked, a swing back at whoever is behind you.
    const holdBat = chasing && inv[selected]?.id === 'bat'
    bat.visible = holdBat || swing >= 0
    if (swing >= 0) {
      swing += dt
      const f = swing < 0.16 ? swing / 0.16 : Math.max(0, 1 - (swing - 0.16) / 0.3)
      bat.rotation.set(0.5 - f * 2.7, 0, 0.35 + f * 0.5)
      if (batBreak && swing > 0.16) {
        // Snapped: wood splinters fly off and the bat is gone.
        batBreak = false
        swing = -1
        barrel.getWorldPosition(splinterAt)
        sfx('snag', splinterAt)
        for (let i = 0; i < 9; i++) heist.puff(splinterAt.x, splinterAt.y, splinterAt.z, { color: i % 3 ? '#e0bd7c' : '#8a6a3a', size: 0.35, spread: 0.9, up: 2, life: 0.5, opacity: 0.95 })
      }
      if (swing > 0.46) swing = -1
    } else bat.rotation.set(0.5, 0, 0.35)

    // The USE hint over the hotbar.
    const item = chasing && selected >= 0 ? ITEMS.kinds[inv[selected].id] : null
    hud.useHint(item ? (touch ? `USE ${item.name.toUpperCase()}` : `CLICK / F: USE ${item.name.toUpperCase()}`) : null)

    // Traps grow in, catch the guard driving through them, and fade away.
    for (let i = traps.length - 1; i >= 0; i--) {
      const tr = traps[i]
      tr.t += dt
      const o = tr.obj
      const grow = Math.min(1, tr.t / 0.25)
      const fade = Math.min(1, (tr.life - tr.t) / 0.5)
      o.scale.setScalar(Math.max(0.01, Math.min(grow, fade)))
      let hit = false
      if (g && g.stun <= 0) {
        const v = g.obj.position
        const low = v.y - o.position.y < ITEMS.maxGroundHeight
        hit = low && Math.hypot(v.x - o.position.x, v.z - o.position.z) < tr.r + g.obj.userData.width / 2
      }
      if (hit) {
        const v = g.obj.position
        if (tr.kind === 'wire') {
          const K = ITEMS.kinds.wire
          heist.slow(g, K.slowFor, K.slow)
          g.speed *= K.tyre
          sfx('snag', v)
          for (let k = 0; k < 10; k++) heist.puff(v.x, v.y + 0.3, v.z, { color: k % 2 ? '#ffd27a' : '#ffffff', size: 0.5, spread: g.obj.userData.width, up: 1.8, life: 0.45, opacity: 0.9 })
          hud.say('Tyres shredded!')
        } else {
          heist.stun(g, ITEMS.kinds.oil.spinFor, { spin: true })
          sfx('skid', v)
          hud.say('Spin out!')
        }
      }
      if (hit || tr.t >= tr.life || !chasing) {
        o.removeFromParent()
        traps.splice(i, 1)
      }
    }

    // Smoke billows round you; nitro flames out of the back.
    if (smokeT > 0) {
      smokeT -= dt
      if (Math.random() < dt * 30) heist.puff(p.x - Math.sin(player.facing) * 2, p.y + 0.6, p.z - Math.cos(player.facing) * 2, { color: '#a8aeb8', size: 3.2, spread: 5, up: 1.2, life: 1.6, opacity: 0.75 })
    }
    if (boostT > 0) {
      boostT -= dt
      if (!chasing) boostT = 0
      if (Math.random() < dt * 40) heist.puff(p.x - Math.sin(player.facing) * 1.1, p.y + 0.45, p.z - Math.cos(player.facing) * 1.1, { color: Math.random() < 0.5 ? '#ff8a12' : '#5fd0ff', size: 0.55, spread: 0.3, up: 0.4, life: 0.3, opacity: 0.95 })
    }

    // Crates: drop ahead of you while he chases, spin, get picked up as you ride through.
    if (chasing && g) {
      nextCrate -= dt
      if (nextCrate <= 0) {
        nextCrate = rand(...P.every)
        if (crates.filter((c) => c.userData.live).length < P.max) spawnCrate()
      }
    }
    for (const c of crates) {
      const u = c.userData
      if (!u.live) continue
      if (!chasing || p.z - c.position.z > 14) {
        hideCrate(c)
        continue
      }
      u.spin.rotation.y += dt * 2.2
      u.spin.position.y = 0.9 + Math.sin(t * 3 + u.phase) * 0.15
      if (Math.hypot(p.x - c.position.x, p.z - c.position.z) < P.reach && Math.abs(p.y - c.position.y) < 2.5) {
        hideCrate(c)
        const name = ITEMS.kinds[u.id].name
        if (add(u.id) < 0) hud.say(inv.some((s) => s.id === u.id) ? `${name} is maxed (x${ITEMS.stack})` : `Inventory full! (${name})`)
        else {
          sfx('pickup')
          hud.say(`+1 ${name}`)
        }
        for (let k = 0; k < 8; k++) heist.puff(c.position.x, c.position.y + 0.9, c.position.z, { color: k % 2 ? '#7fd8ff' : '#ffe066', size: 0.7, spread: 1.2, up: 2, life: 0.5, opacity: 0.9 })
      }
    }
    if (!chasing && traps.length) clearTraps()
  }

  return {
    update,
    add, // add(id): one more of an item (rewards, shops); the slot, or -1 when full
    get inventory() {
      return inv
    },
    // Your riding speed multiplier (Nitro).
    get boost() {
      return boostT > 0 ? ITEMS.kinds.nitro.boost : 1
    },
  }
}
