import './exclusive.css'
import { EXCLUSIVE, RARITIES, STALLS } from './config.js'
import { createPrompt, createWindow, el, short } from './shopwin.js'
import { bikeArt, bikePrice, bikeValue, CATALOG } from './bikeart.js'

// The Exclusive bikes on the market podium. Stand in the ring around it and hold E
// (shopwin.js prompt): Bloom, Volt and Abyss with their income and cash price. Buying
// hands you the bike by the handlebars (`give`, main.js -> base.hold), exactly like a
// stolen one: walk it home and "E Place Bike" parks it in your base, or sell it at the
// SELL! stall. It counts as found in the Bike Index.

// hud: the HUD; camera: floats the prompt; give(name, value): the bike into your hands, true if taken.
export function createExclusive({ hud, camera, give }) {
  const win = createWindow(hud, { title: 'Exclusive Bikes', banner: { text: 'EXCLUSIVE', tone: 'pink' }, cls: 'ex' })
  const row = el('div', 'ex-row')
  win.body.append(row)

  for (const name of EXCLUSIVE.order) {
    const c = CATALOG.get(name)
    const card = el('div', 'ex-card')
    card.style.setProperty('--bg', `linear-gradient(180deg, ${RARITIES[c.rarity].bg.join(', ')})`)
    const nm = el('div', 'nm ot')
    nm.textContent = name
    const buy = hud.button('ex-buy sw-green', `<span class="ot">${short(bikePrice(name))}</span>`, () => {
      if (hud.cash < bikePrice(name)) {
        buy.classList.remove('sw-no')
        void buy.offsetWidth // restart the animation
        buy.classList.add('sw-no')
        return hud.say('Not enough cash!')
      }
      if (!give(name, bikeValue(name))) return
      hud.spend(bikePrice(name))
      hud.say(`Bought ${name}! Walk it to your base`)
      win.close()
    })
    card.append(nm, el('div', 'rr ot', c.rarity), el('div', 'pic', bikeArt(name)), el('div', 'inc ot', `${short(c.income)}/s`), buy)
    row.append(card)
  }

  return createPrompt(hud, camera, { stall: STALLS.exclusive, object: 'Exclusive Bikes', win })
}
