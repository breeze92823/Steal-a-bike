// The other players in the room, drawn in the lobby and the lane: each is their Bloxity avatar
// (skin, hat, proportions: the server relays the look JSON, net.js avatarJson), on foot, riding
// their bike (state 1), or walking a bike by the handlebars (state 2), with a name tag over their
// head. Eased toward the pose the server last relayed (net.js roster) plus speed x heading for the
// time since (dead reckoning), so fast riders glide instead of stepping. Diffed against the roster
// every frame, so joins / leaves / look changes need no events. Nearest first, capped (fewer on
// touch), skipped beyond NET.remoteFade, bike tags and shadows only up close (draw calls).
import { Group } from 'three'
import { BASE, COARSE_POINTER, NET, RIDE } from './config.js'
import { net, roster } from './net.js'
import { bicycle } from './kit.js'
import { bikeModel } from './bikes3d.js'
import { CATALOG } from './bikeart.js'
import { label } from './propkit.js'
import { createBubble } from './bubble.js'
import { playEmote } from './avatar/emotes.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'

const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const MAX = COARSE_POINTER ? NET.maxRemotesTouch : NET.maxRemotes

class Remote {
  constructor(scene) {
    this.scene = scene
    this.group = new Group()
    this.group.visible = false
    scene.add(this.group)
    this.ride = new Group() // avatar + the bike they sit on
    this.group.add(this.ride)
    this.avatar = null
    this.animator = null
    this.avatarJson = null // what the current rig was built from
    this.generation = 0
    this.bike = null // the model currently shown
    this.bikeKey = ''
    this.label = null
    this.name = ''
    this.bubble = createBubble(this.group, 3.95) // the Bloxity chat line over the name
    this.emote = null // the roster's `emote` last seen; null until then, so an old one doesn't play
    this.placed = false
    this.base = { x: 0, y: 0, z: 0, yaw: 0, speed: 0, at: 0, key: '' }
    this.lastY = 0
    this.vy = 0
    this.setAvatar(buildDefaultCharacter())
  }

  setAvatar(next) {
    if (this.avatar) this.ride.remove(this.avatar)
    disposeAnimator(this.animator)
    this.avatar = next
    next.traverse((o) => o.isMesh && (o.castShadow = false)) // shadow passes add up in a full room
    this.ride.add(next)
    this.animator = makeAnimator(next)
  }

  // A signed-in player's look arrives as JSON { equipped, proportions, skin }; "" = default.
  async syncAvatar(json) {
    if (json === this.avatarJson) return
    this.avatarJson = json
    const mine = ++this.generation
    if (!json) return this.setAvatar(buildDefaultCharacter())
    let look = null
    try {
      look = JSON.parse(json)
    } catch {
      return
    }
    try {
      const group = await loadBaseCharacter()
      if (mine !== this.generation) return
      await attachEquippedAccessories(group, look?.equipped, { skinTextureUrl: look?.skin || undefined })
      if (mine !== this.generation) return
      applyProportions(group, look?.proportions)
      this.setAvatar(group)
    } catch (err) {
      console.warn('[remote] avatar failed to load', err)
    }
  }

  // The bike under them (riding) or beside them (walking it): rebuilt only when it changes.
  syncBike(p) {
    const key = p.state === 0 ? '' : `${p.state}|${p.bike}`
    if (key === this.bikeKey) return
    this.bikeKey = key
    if (this.bike) {
      this.bike.removeFromParent()
      this.bike = null
    }
    if (p.state === 0) return
    const bike = p.state === 2 && CATALOG.has(p.bike) ? bikeModel(p.bike) : bicycle()
    bike.traverse((o) => o.isMesh && (o.castShadow = false))
    if (p.state === 1) {
      bike.rotation.y = -Math.PI / 2 // the kit's +X front to the avatar's forward (+Z)
      bike.scale.setScalar(RIDE.bikeScale)
      this.ride.add(bike)
    } else {
      bike.position.set(BASE.hold.x, 0, BASE.hold.z)
      bike.rotation.y = -Math.PI / 2
      bike.scale.setScalar(BASE.hold.scale)
      this.group.add(bike)
    }
    this.bike = bike
  }

  syncName(p) {
    const name = p.username || 'Player'
    if (name === this.name) return
    this.name = name
    if (this.label) {
      this.group.remove(this.label)
      this.label.material.map?.dispose()
      this.label.material.dispose()
    }
    this.label = label(name, 0.5, { color: '#ffffff', outline: '#1a0a14', font: '700 64px Fredoka, sans-serif', outlineWidth: 10 })
    this.label.position.y = 3.3
    this.group.add(this.label)
  }

  update(p, dt, now, near) {
    this.syncName(p)
    this.syncAvatar(p.avatar)
    this.syncBike(p)
    this.label.visible = near
    this.bubble.update(dt)
    if (p.emote !== this.emote) {
      if (this.emote !== null && p.emote) playEmote(() => this.animator, p.emote.split('#')[0])
      this.emote = p.emote
    }

    // A new pose resets the dead-reckoning base.
    const b = this.base
    const key = `${p.x}|${p.y}|${p.z}|${p.yaw}|${p.speed}`
    if (key !== b.key) Object.assign(b, { key, x: p.x, y: p.y, z: p.z, yaw: p.yaw, speed: p.speed, at: now })
    const ahead = Math.min((now - b.at) / 1000, NET.predictMax) * b.speed
    const tx = b.x + Math.sin(b.yaw) * ahead
    const tz = b.z + Math.cos(b.yaw) * ahead
    const g = this.group
    const far = Math.hypot(tx - g.position.x, tz - g.position.z) > 30
    const k = this.placed && !far ? 1 - Math.exp(-NET.remoteLerp * dt) : 1
    g.position.x += (tx - g.position.x) * k
    g.position.y += (b.y - g.position.y) * k
    g.position.z += (tz - g.position.z) * k
    g.rotation.y += angleDelta(g.rotation.y, b.yaw) * k
    this.vy = this.placed && dt > 0 ? this.vy + ((g.position.y - this.lastY) / dt - this.vy) * Math.min(1, dt * 10) : 0
    this.lastY = g.position.y
    this.placed = true

    const wheels = this.bike?.userData.wheels
    if (wheels && b.speed > 0.1) for (const w of wheels) w.rotation.z -= (b.speed * dt) / (0.42 * (p.state === 1 ? RIDE.bikeScale : BASE.hold.scale))
    this.animator?.update(dt, {
      grounded: Math.abs(this.vy) < 0.5,
      speed: b.speed,
      verticalVelocity: this.vy,
      turn: 0,
      riding: p.state === 1,
      seatLift: RIDE.seatLift,
      holding: p.state === 2,
    })
  }

  hide() {
    this.group.visible = false
    this.placed = false // snap into place when it comes back
  }

  dispose() {
    this.generation++ // an avatar still loading is dropped
    this.bubble.clear()
    this.scene.remove(this.group)
    disposeAnimator(this.animator)
    this.ride.remove(this.avatar) // rig geometry is shared with every other character
    if (this.label) {
      this.label.material.map?.dispose()
      this.label.material.dispose()
    }
  }
}

export function createRemotePlayers(scene) {
  const remotes = new Map() // sessionId -> Remote
  const list = [] // reused each frame: [{ id, p, d }]

  function clear() {
    for (const r of remotes.values()) r.dispose()
    remotes.clear()
  }

  return {
    get count() {
      return remotes.size
    },
    // A chat line from the Bloxity account `uid`: shown over that player's head.
    say(uid, text, seconds) {
      const players = roster()
      players?.forEach((p, id) => {
        if (p.uid && p.uid === uid) remotes.get(id)?.bubble.say(text, seconds)
      })
    },
    // viewer: this player's drawn position.
    update(dt, viewer) {
      const players = roster()
      if (!players) return remotes.size && clear()
      const mine = net.sessionId
      list.length = 0
      players.forEach((p, id) => {
        if (id === mine) return
        list.push({ id, p, d: Math.hypot(p.x - viewer.x, p.z - viewer.z) })
      })
      list.sort((a, b) => a.d - b.d)
      const now = performance.now()
      const keep = new Set()
      for (let i = 0; i < Math.min(MAX, list.length); i++) {
        const { id, p, d } = list[i]
        keep.add(id)
        let r = remotes.get(id)
        if (!r) remotes.set(id, (r = new Remote(scene)))
        if (d > NET.remoteFade) {
          if (r.group.visible || r.placed) r.hide()
          continue
        }
        r.group.visible = true
        r.update(p, dt, now, d < NET.detailRange)
      }
      for (const [id, r] of remotes) {
        if (keep.has(id)) continue
        r.dispose()
        remotes.delete(id)
      }
    },
  }
}
