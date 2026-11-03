import './base.css'
import { Group, Vector3 } from 'three'
import { BASE, LAYOUT as L } from './config.js'
import { player } from './player.js'
import { onKey } from './input.js'
import { bikeTag } from './kit.js'
import { risingText } from './fx.js'
import { heistSfx as sfx } from './audio.js'
import { bikeArt, bikeValue, CATALOG } from './bikeart.js'
import { discover } from './bikeindex.js'
import { onHandSale } from './sellshop.js'
import { ICON } from './shopwin.js'
import { shortNumber } from './hud.js'
import { columnX, plotWidth, rowZ } from './lobby.js'
import { bikeModel } from './bikes3d.js'
import { registerStore } from './stores.js'

// The bike you got away with, and your base.
//  - Over the SAFE ZONE line you get off and walk it home by the handlebars:
//    it rolls beside you on your right, its rarity / name / income tag over it,
//    and it sits in hotbar slot 3. You can't ride, train or steal meanwhile.
//  - At the SELL! stall the hold sells it for its value (sellshop.onHandSale).
//  - On your plot, "E Place Bike" under you parks it in the next free slot
//    (BASE.slots), where it earns its income: its tag, "+$N" rising every
//    second, and $N/s more into your cash.
//  - Standing on your plot, the top banner reads "You earn $X/12h Offline!".

const COARSE = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0

const info = (name) => CATALOG.get(name) ?? { rarity: 'Common', income: 4 }
const money = (n) => `$${shortNumber(n)}`

// holder: a group that follows the player (position + facing), for the walked bike.
export function createBase({ scene, hud, camera, holder, plotX }) {
  const parked = new Group()
  scene.add(parked)
  let used = 1 // the Club Tourer already stands in your plot
  let next = 0 // index into BASE.slots
  let held = null // { name, model, tag, rarity, income, value }
  const placed = [] // names of the bikes parked in your base, in slot order (saved)

  // The plot's pads (plus a little margin) count as your base.
  const x0 = plotX - plotWidth() / 2 - BASE.margin
  const x1 = plotX + plotWidth() / 2 + BASE.margin
  const z0 = L.plotZ - BASE.margin
  const z1 = L.plotZ + L.plotRows * L.plotRowDepth + BASE.margin
  const onPlot = (p) => p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1

  // "E Place Bike" under your feet (tap it on touch).
  const prompt = document.createElement('button')
  prompt.type = 'button'
  prompt.className = 'base-prompt'
  prompt.innerHTML = `<span class="key">${COARSE ? ICON.hand : '<i>E</i>'}</span><span class="txt"></span>`
  const promptTxt = prompt.querySelector('.txt')
  prompt.addEventListener('pointerdown', (e) => {
    e.stopPropagation() // keep the tap off the look/joystick zones
    e.preventDefault()
    tryPlace()
  })
  hud.mount(prompt)
  let promptOn = false
  const v = new Vector3()

  // --- Holding -------------------------------------------------------------------------------
  // `model` is the bike you rode in on (heist.js), handed over as it is; `value` what it sells for.
  function hold(name, model, value = bikeValue(name)) {
    const c = info(name)
    model.removeFromParent()
    model.position.set(BASE.hold.x, 0, BASE.hold.z)
    model.rotation.set(0, -Math.PI / 2, 0) // the kit's +X front to your forward (+Z)
    model.scale.setScalar(BASE.hold.scale)
    holder.add(model)
    const tag = bikeTag(c.rarity, name, `${money(c.income)}/s`, BASE.hold.tagHeight)
    tag.position.set(BASE.hold.tagX, BASE.hold.tagY, BASE.hold.z)
    holder.add(tag)
    held = { name, model, tag, rarity: c.rarity, income: c.income, value }
    player.holding = name
    hud.setHeld(name, bikeArt(name))
    discover(name) // it counts as found in the Bike Index
  }

  function letGo() {
    held.tag.removeFromParent()
    held.tag.material.map.dispose()
    held.tag.material.dispose()
    held = null
    player.holding = null
    hud.setHeld(null)
  }

  // --- Selling (the SELL! stall's hold) ------------------------------------------------------
  onHandSale(() => (held ? { object: held.name, action: `Sell for ${money(held.value)}`, run: sell } : null))
  function sell() {
    const { name, value, model } = held
    model.removeFromParent()
    letGo()
    hud.earn(value)
    hud.say(`Sold ${name} for ${money(value)}!`)
    sfx('pop')
  }

  // --- Placing in your base ------------------------------------------------------------------
  const full = () => used >= BASE.capacity || next >= BASE.slots.length
  function tryPlace() {
    if (!held || !onPlot(player.position)) return
    if (full()) {
      hud.say('Your base is full!')
      return
    }
    const { name, model, rarity, income } = held
    letGo()
    model.removeFromParent()
    park(name, model, rarity, income)
    hud.addIncome(income)
    hud.say(`${name} placed: +${money(income)}/s`)
  }

  // Stands a bike on the next free pad with its tag and rising cash (also how a saved base is rebuilt).
  function park(name, model, rarity, income) {
    const [c, r] = BASE.slots[next++]
    used++
    placed.push(name)
    const x = columnX(plotX, c)
    const z = rowZ(r)
    model.position.set(x, 0.24, z)
    model.rotation.set(0, Math.PI * 0.75, 0) // as the Club Tourer stands
    model.scale.setScalar(1)
    parked.add(model)
    const tag = bikeTag(rarity, name, `${money(income)}/s`, 1.25)
    tag.position.set(x, 2.9, z)
    parked.add(tag)
    risingText(parked, x, 1.6, z, `💵 +${money(income)}`, { every: 1, rise: 1.0, height: 0.7, opts: { color: '#5dff4a', outline: '#0d3a10', outlineWidth: 10 } })
    sfx('pop', { x, y: 0, z })
  }

  // Saved: the parked bikes' names. The hud saves the income they earn, so loading one back
  // only stands it up again (no income added twice).
  registerStore({
    snapshot: () => ({ placed: [...placed] }),
    hydrate(doc) {
      if (!Array.isArray(doc.placed) || placed.length) return // a reconnect keeps the live base
      for (const name of doc.placed) {
        if (full() || !CATALOG.has(name)) continue
        const c = info(name)
        park(name, bikeModel(name), c.rarity, c.income)
      }
    },
  })
  onKey('KeyE', tryPlace)

  // --- Per frame -----------------------------------------------------------------------------
  return {
    hold,
    update(dt) {
      const p = player.position
      const home = onPlot(p)
      hud.offline(home ? money(hud.income * BASE.offlineHours * 3600 * BASE.offlineShare) : null)

      if (held) {
        // The wheels roll as you walk.
        const speed = Math.hypot(player.velocity.x, player.velocity.z)
        for (const w of held.model.userData.wheels ?? []) w.rotation.z -= (speed * dt) / (0.42 * BASE.hold.scale)
      }

      const want = !!held && home && !player.training
      if (want !== promptOn) {
        promptOn = want
        prompt.classList.toggle('show', want)
      }
      if (!want) return
      const t = full() ? 'Base Full' : 'Place Bike'
      if (promptTxt.textContent !== t) promptTxt.textContent = t
      prompt.classList.toggle('full', full())
      const r = player.renderPosition
      v.set(r.x, r.y - 0.15, r.z).project(camera)
      prompt.style.transform = `translate(${Math.round(((v.x + 1) / 2) * window.innerWidth)}px, ${Math.round(((1 - v.y) / 2) * window.innerHeight)}px) translate(-50%, 0)`
    },
  }
}
