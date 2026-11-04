import './base.css'
import { Vector3 } from 'three'
import { BASE, LAYOUT as L, TRAINING } from './config.js'
import { player } from './player.js'
import { onKey } from './input.js'
import { bikeTag } from './kit.js'
import { heistSfx as sfx, sfx as uiSfx } from './audio.js'
import { bikeArt, bikeValue, CATALOG } from './bikeart.js'
import { discover } from './bikeindex.js'
import { onHandSale } from './sellshop.js'
import { ICON } from './shopwin.js'
import { shortNumber } from './hud.js'
import { plotWidth } from './lobby.js'
import { capacityOf } from './plots.js'
import { registerStore } from './stores.js'

// The bike you got away with, and your base (the plot the game server gave you, plots.js).
//  - Over the SAFE ZONE line you get off and walk it home by the handlebars:
//    it rolls beside you on your right, its rarity / name / income tag over it,
//    and it sits in hotbar slot 3. You can't ride, train or steal meanwhile.
//  - At the SELL! stall the hold sells it for its value (sellshop.onHandSale).
//  - Anywhere on your plot (or up on its decks), "E Place Bike" under you parks it in the next
//    free slot, ground first then floor by floor (BASE.floors), where it earns its income: $N/s
//    more into your cash. plots.js draws it, for you and for everyone else in the room.
//  - The Upgrade Base sign at the plot's north-west corner builds the next floor (up to
//    BASE.floors.length): walk up to it and tap the button (or E).
//  - Standing on your plot, the top banner reads "You earn $X/12h Offline!".

const COARSE = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0

const info = (name) => CATALOG.get(name) ?? { rarity: 'Common', income: 4 }
const money = (n) => `$${shortNumber(n)}`
const MAX_FLOORS = BASE.floors.length

// holder: a group that follows the player (position + facing), for the walked bike.
export function createBase({ hud, camera, holder }) {
  let held = null // { name, model, tag, rarity, income, value }
  const placed = [] // names of the bikes parked in your base, in slot order (saved)
  let floors = 1 // floors built (saved)
  let plot = null // your plot (lobby.js plots[i]), set by setPlot
  let version = 0 // bumped on every change: main.js shows it to the others
  const changed = () => version++

  // The plot's pads (plus a little margin) count as your base, at any height.
  const onPlot = (p) => {
    if (!plot) return false
    const half = plotWidth() / 2 + BASE.margin
    return Math.abs(p.x - plot.cx) < half && p.z > L.plotZ - BASE.margin && p.z < L.plotZ + L.plotRows * L.plotRowDepth + BASE.margin
  }
  const full = () => placed.length >= capacityOf(floors)

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

  // The Upgrade Base button, shown by the sign (the treadmill's button's look).
  const upgrade = hud.button('hud-upgrade', '<span class="t ot"></span><span class="p ot"></span>', () => buyFloor())
  const upT = upgrade.querySelector('.t')
  const upP = upgrade.querySelector('.p')
  hud.mount(upgrade)
  let nearSign = false
  let shownUpgrade = ''

  const signLines = () =>
    floors >= MAX_FLOORS
      ? ['Upgrade Base', 'Max Floors', `${capacityOf(floors) + 1} Bikes`]
      : ['Upgrade Base', `Floor ${floors} > ${floors + 1}`, money(BASE.floors[floors].price)]
  const paintSign = () => plot?.baseSign.setLines(signLines())

  function buyFloor() {
    if (floors >= MAX_FLOORS) return hud.say('Your base has every floor!')
    const price = BASE.floors[floors].price
    if (!hud.spend(price)) {
      hud.say(`Need ${money(price)}`)
      uiSfx('deny')
      return
    }
    floors++
    changed()
    paintSign()
    hud.say(`Floor ${floors} built: room for ${capacityOf(floors) - capacityOf(floors - 1)} more bikes!`)
    uiSfx('upgrade')
  }

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

  // Ride the held bike itself: its model moves under the avatar (rig), and back beside you on foot.
  let mountedRig = null
  function setRiding(on, rig, scale) {
    if (!held) return
    if (on && !mountedRig) {
      mountedRig = rig
      held.model.removeFromParent()
      held.model.position.set(0, 0, 0)
      held.model.rotation.set(0, -Math.PI / 2, 0)
      held.model.scale.setScalar(scale)
      rig.add(held.model)
      player.rideKind = held.model.userData.wheels ? 'pedal' : 'motor'
    } else if (!on && mountedRig) unmount()
  }
  function unmount() {
    mountedRig = null
    if (!held) return
    held.model.removeFromParent()
    held.model.position.set(BASE.hold.x, 0, BASE.hold.z)
    held.model.rotation.set(0, -Math.PI / 2, 0)
    held.model.scale.setScalar(BASE.hold.scale)
    holder.add(held.model)
    player.rideKind = 'pedal'
  }

  function letGo() {
    mountedRig = null
    held.model.removeFromParent()
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
    const { name, value } = held
    letGo()
    hud.earn(value)
    hud.say(`Sold ${name} for ${money(value)}!`)
    sfx('pop')
  }

  // --- Placing in your base ------------------------------------------------------------------
  function tryPlace() {
    if (!held || !onPlot(player.position)) return
    if (full()) {
      hud.say(floors < MAX_FLOORS ? 'Your base is full! Build another floor' : 'Your base is full!')
      return
    }
    const { name, income } = held
    letGo()
    placed.push(name)
    changed()
    hud.addIncome(income)
    hud.say(`${name} placed: +${money(income)}/s`)
    sfx('pop')
  }

  // Saved: the parked bikes' names and the floors. The hud saves the income they earn, so loading
  // them back only stands them up again (no income added twice).
  registerStore({
    snapshot: () => ({ placed: [...placed], floors }),
    hydrate(doc) {
      if (Number.isInteger(doc.floors)) floors = Math.max(floors, Math.min(MAX_FLOORS, doc.floors))
      if (Array.isArray(doc.placed) && !placed.length) {
        // A reconnect keeps the live base.
        for (const name of doc.placed) if (CATALOG.has(name) && !full()) placed.push(name)
      }
      changed()
      paintSign()
    },
  })
  onKey('KeyE', () => {
    if (held) tryPlace()
    else if (nearSign) buyFloor()
  })

  // --- Per frame -----------------------------------------------------------------------------
  return {
    hold,
    setRiding,
    get heldModel() {
      return held?.model ?? null
    },
    get version() {
      return version
    },
    get floors() {
      return floors
    },
    get placed() {
      return placed
    },
    // Your plot (lobby.js plots[i]): where you place and upgrade from now on.
    setPlot(next) {
      plot = next
      paintSign()
    },
    update(dt) {
      const p = player.position
      const home = onPlot(p)
      hud.offline(home ? money(hud.income * BASE.offlineHours * 3600 * BASE.offlineShare) : null)

      if (held && !mountedRig) {
        // The wheels roll as you walk.
        const speed = Math.hypot(player.velocity.x, player.velocity.z)
        for (const w of held.model.userData.wheels ?? []) w.rotation.z -= (speed * dt) / (0.42 * BASE.hold.scale)
      }

      // The Upgrade Base button by your sign (on foot, empty-handed).
      nearSign = !!plot && !held && !player.training && Math.hypot(p.x - plot.baseSign.x, p.z - plot.baseSign.z) < TRAINING.upgradeRange && p.y < 2
      upgrade.classList.toggle('show', nearSign)
      if (nearSign) {
        const max = floors >= MAX_FLOORS
        const price = max ? 0 : BASE.floors[floors].price
        const key = `${floors}|${hud.cash >= price}`
        if (key !== shownUpgrade) {
          shownUpgrade = key
          upT.textContent = max ? 'Base Max Floors' : `Upgrade Base Floor ${floors} > ${floors + 1}`
          upP.textContent = max ? `${capacityOf(floors) + 1} Bikes` : money(price)
          upgrade.classList.toggle('max', max)
          upgrade.classList.toggle('poor', !max && hud.cash < price)
        }
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
