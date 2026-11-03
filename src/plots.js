import { BoxGeometry, Group } from 'three'
import { BASE, LAYOUT as L, PALETTE as P, TRAINING } from './config.js'
import { bake } from './bake.js'
import { label, neon, put, solidBox } from './propkit.js'
import { bicycle, bikeTag, plain, sbox } from './kit.js'
import { addFixedBoxFor, removeCollider } from './physics.js'
import { bikeModel } from './bikes3d.js'
import { CATALOG } from './bikeart.js'
import { shortNumber } from './hud.js'
import { columnX, plotWidth, rowZ } from './lobby.js'
import { net, roster } from './net.js'

// The hub's plots as players' bases. The game server gives every player in the room one plot
// (roster `plot`); each plot shows its owner's base from the roster (`floors`, `placed`,
// `treadmill`) and yours from your own state, so everyone sees everyone's bikes:
//  - floors: the ground, then up to two steel decks (BASE.floors, BASE.deck) on pillars, with a
//    ramp up the outside of the plot (west to the first deck, east to the second); decks and ramps
//    have colliders, so you can walk up and look round anyone's base.
//  - the Club Tourer every base starts with, then the parked bikes, slot by slot, floor by floor,
//    each with its rarity / name / income tag (others' only within BASE.detailRange); on yours a
//    "+$N" rises from every bike each second.
//  - the owner's name over it ("Unclaimed" when nobody in the room has it), and on others' plots
//    their treadmill level / floors on the two signs (yours are your upgrade buttons).
// A plot is rebuilt only when what stands on it changes (one baked mesh per material for its
// decks and one for its bikes).

const money = (n) => `$${shortNumber(n)}`
const info = (name) => CATALOG.get(name) ?? { rarity: 'Common', income: 4 }
const RISE = { every: 1, rise: 1.0, duration: 1.1 }
const CASH_STYLE = { color: '#5dff4a', outline: '#0d3a10', outlineWidth: 10 }
const NAME_STYLE = { color: '#ffffff', outline: '#2a2244' }

// Where slot i of a base stands: [floor, column, row], filling the ground first. null when the
// floors built have no room for it.
export function slotOf(i, floors) {
  for (let f = 0; f < floors; f++) {
    const slots = BASE.floors[f].slots
    if (i < slots.length) return [f, ...slots[i]]
    i -= slots.length
  }
  return null
}
// How many bikes `floors` floors hold (the Club Tourer not counted).
export const capacityOf = (floors) => BASE.floors.slice(0, floors).reduce((n, f) => n + f.slots.length, 0)

class PlotView {
  constructor(scene, plot) {
    this.plot = plot
    this.group = new Group()
    this.tags = new Group() // bike tags: hidden far from someone else's base
    this.group.add(this.tags)
    scene.add(this.group)
    this.colliders = []
    this.pops = [] // your bikes' rising "+$N": { sprite, x, y, z, age }
    this.key = null
    this.mine = false
    this.clock = 0
  }

  clear() {
    for (const c of this.colliders) removeCollider(c)
    this.colliders.length = 0
    this.pops.length = 0
    const dispose = (o) => {
      if (o.isSprite) {
        o.material.map?.dispose()
        o.material.dispose()
      } else if (o.isMesh) o.geometry.dispose() // baked here: the geometry is this plot's own
    }
    for (const child of [...this.group.children]) {
      if (child === this.tags) continue
      child.traverse(dispose)
      this.group.remove(child)
    }
    for (const t of [...this.tags.children]) {
      t.traverse(dispose)
      this.tags.remove(t)
    }
  }

  // state: { owner (name, '' = nobody), mine, floors, placed: [names], treadmill }
  render(state) {
    this.clear()
    this.mine = state.mine
    const { cx, treadmill, baseSign } = this.plot
    treadmill.sign.mark.visible = state.mine
    baseSign.mark.visible = state.mine
    treadmill.rate.sprite.visible = !!state.owner
    const depth = L.plotRows * L.plotRowDepth
    if (!state.owner) {
      const tag = label('Unclaimed', 1.0, NAME_STYLE)
      tag.position.set(cx, 2.4, L.plotZ + 6)
      this.group.add(tag)
      treadmill.sign.setLines(['Treadmill', 'Unclaimed'])
      baseSign.setLines(['Base', 'Unclaimed'])
      return
    }
    const floors = Math.max(1, Math.min(BASE.floors.length, state.floors | 0))
    if (floors > 1) this.decks(floors)
    this.bikes(state.placed, floors)
    const top = (floors - 1) * BASE.deck
    const name = label(state.mine ? 'Your Base' : `${state.owner}'s Base`, 1.0, NAME_STYLE)
    name.position.set(cx, top + (floors > 1 ? 3.2 : 2.4), L.plotZ + depth / 2)
    this.group.add(name)
    if (!state.mine) {
      // Yours are your buttons (training.js, base.js); others' say how far they got.
      const lvl = Math.max(1, Math.min(TRAINING.rates.length, state.treadmill | 0))
      const owner = state.owner.length > 14 ? `${state.owner.slice(0, 13)}...` : state.owner
      treadmill.sign.setLines([owner, `Treadmill Lv ${lvl}`])
      treadmill.rate.set(`+${shortNumber(TRAINING.rates[lvl - 1])}/s`)
      baseSign.setLines([owner, `Floor ${floors}/${BASE.floors.length}`])
    }
  }

  // Decks 1..floors-1 over the plot: steel slab with pads and path like the ground, pillars,
  // railings with a neon top rail, and a ramp up the outside from the floor below.
  decks(floors) {
    const { cx } = this.plot
    const w = plotWidth()
    const depth = L.plotRows * L.plotRowDepth
    const zc = L.plotZ + depth / 2
    const top = (floors - 1) * BASE.deck
    const g = new Group()
    const steel = plain(P.steel, { roughness: 0.5, metalness: 0.3 })
    const yellow = neon('#ffe11a', 2.4)
    for (const px of [-w / 2 + 0.3, 0, w / 2 - 0.3]) {
      for (const pz of [-depth / 2 + 0.3, 0, depth / 2 - 0.3]) {
        put(g, new BoxGeometry(0.45, top, 0.45), steel, cx + px, top / 2, zc + pz)
        this.colliders.push(solidBox(0.23, top / 2, 0.23, cx + px, top / 2, zc + pz))
      }
    }
    const R = BASE.ramp
    for (let k = 1; k < floors; k++) {
      const y = k * BASE.deck
      put(g, new BoxGeometry(w + 0.4, 0.35, depth + 0.4), steel, cx, y - 0.18, zc)
      sbox(g, w, 0.06, depth, P.pad, cx, y, zc, { shadows: false })
      sbox(g, L.plotColumns[2], 0.07, depth, P.path, columnX(cx, 2), y, zc, { shadows: false })
      this.colliders.push(solidBox(w / 2 + 0.2, 0.2, depth / 2 + 0.2, cx, y - 0.1, zc))
      for (const s of [-1, 1]) {
        put(g, new BoxGeometry(w, 0.12, 0.12), steel, cx, y + 0.9, zc + s * depth / 2)
        put(g, new BoxGeometry(0.12, 0.12, depth), steel, cx + s * w / 2, y + 0.9, zc)
      }
      put(g, new BoxGeometry(w + 0.2, 0.1, 0.1), yellow, cx, y + 1.0, zc - depth / 2 - 0.05, false)
      put(g, new BoxGeometry(0.1, 0.1, depth), yellow, cx - w / 2 - 0.05, y + 1.0, zc, false)
      put(g, new BoxGeometry(0.1, 0.1, depth), yellow, cx + w / 2 + 0.05, y + 1.0, zc, false)
      // The ramp: outside the plot (west to deck 1, east to deck 2), its foot at the north end.
      const side = k % 2 ? -1 : 1
      const len = Math.hypot(R.run, BASE.deck)
      const ramp = put(g, new BoxGeometry(R.width, 0.25, len), steel, cx + side * (w / 2 + R.width / 2), y - BASE.deck / 2, L.plotZ + R.from + R.run / 2)
      ramp.rotation.x = -Math.atan2(BASE.deck, R.run) // south end up
      ramp.updateMatrix()
      this.colliders.push(addFixedBoxFor(ramp))
      const rail = put(g, new BoxGeometry(0.1, 0.1, len), yellow, ramp.position.x + side * (R.width / 2), ramp.position.y + 0.9, ramp.position.z, false)
      rail.rotation.x = ramp.rotation.x
    }
    this.group.add(bake(g, true))
  }

  // The Club Tourer and the parked bikes (one baked mesh per material), their tags, your "+$N".
  bikes(placed, floors) {
    const { cx } = this.plot
    const g = new Group()
    const stand = (model, name, rarity, income, f, c, r) => {
      const x = columnX(cx, c)
      const z = rowZ(r)
      const y = BASE.floors[f].y
      model.position.set(x, y, z)
      model.rotation.set(0, Math.PI * 0.75, 0)
      g.add(model)
      const tag = bikeTag(rarity, name, `${money(income)}/s`, 1.25)
      tag.position.set(x, y + 2.66, z)
      this.tags.add(tag)
      if (this.mine) {
        const s = label(`\u{1F4B5} +${money(income)}`, 0.7, CASH_STYLE)
        s.visible = false
        this.group.add(s)
        this.pops.push({ sprite: s, x, y: y + 1.36, z, age: -1 })
      }
    }
    stand(bicycle(), 'Club Tourer', 'Common', 8, 0, 3, 0)
    placed.forEach((name, i) => {
      const at = slotOf(i, floors)
      if (!at) return
      const c = info(name)
      stand(CATALOG.has(name) ? bikeModel(name) : bicycle(), name, c.rarity, c.income, ...at)
    })
    this.group.add(bake(g, true))
  }

  update(dt, viewer) {
    if (!this.mine) {
      const d = Math.hypot(viewer.x - this.plot.cx, viewer.z - (L.plotZ + 9))
      this.tags.visible = d < BASE.detailRange
      return
    }
    // "+$N" over each of your bikes every RISE.every s, staggered a little.
    this.clock += dt
    const fire = this.clock >= RISE.every
    if (fire) this.clock = 0
    this.pops.forEach((p, i) => {
      if (fire) p.age = -i * 0.03
      if (p.age === -1 && !fire) return
      p.age += dt
      if (p.age < 0) return
      const f = p.age / RISE.duration
      if (f >= 1) {
        p.sprite.visible = false
        p.age = -1
        return
      }
      p.sprite.visible = true
      p.sprite.position.set(p.x, p.y + f * RISE.rise, p.z)
      p.sprite.material.opacity = f < 0.15 ? f / 0.15 : 1 - Math.max(0, (f - 0.6) / 0.4)
    })
  }
}

// lobbyPlots: buildLobby's `plots`. mine(): { name, floors, placed, treadmill } of this player.
// onMine(plot, index) runs when this player's plot changes (first assignment, a new room).
export function createPlots(scene, lobbyPlots, { mine, onMine }) {
  const views = lobbyPlots.map((p) => new PlotView(scene, p))
  let myIndex = -1
  let poll = 0

  // This player's plot: the server's pick once connected, LAYOUT.myPlot until then.
  const myPlot = () => {
    const me = net.connected ? net.room?.state?.players?.get(net.sessionId) : null
    return me && me.plot >= 0 && me.plot < views.length ? me.plot : L.myPlot
  }

  function refresh() {
    const i = myPlot()
    if (i !== myIndex) {
      myIndex = i
      onMine(lobbyPlots[i], i)
    }
    const owners = new Array(views.length).fill(null)
    roster()?.forEach((p, id) => {
      if (id !== net.sessionId && p.plot >= 0 && p.plot < views.length && p.plot !== i) owners[p.plot] = p
    })
    const m = mine()
    views.forEach((v, k) => {
      const state =
        k === i
          ? { owner: m.name || 'Player', mine: true, floors: m.floors, placed: m.placed, treadmill: m.treadmill }
          : owners[k]
            ? { owner: owners[k].username || 'Player', mine: false, floors: owners[k].floors, placed: owners[k].placed ? owners[k].placed.split('|') : [], treadmill: owners[k].treadmill }
            : { owner: '', mine: false, floors: 1, placed: [], treadmill: 1 }
      const key = `${state.mine}|${state.owner}|${state.floors}|${state.treadmill}|${state.placed.join('|')}`
      if (key === v.key) return
      v.key = key
      v.render(state)
    })
  }

  return {
    get index() {
      return myIndex
    },
    // A change to your own base shows at once (others' come in through the roster).
    refresh,
    update(dt, viewer) {
      poll -= dt
      if (poll <= 0) {
        poll = 0.25
        refresh()
      }
      for (const v of views) v.update(dt, viewer)
    },
  }
}
