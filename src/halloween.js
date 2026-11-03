import './windows.css'
import { HALLOWEEN_SHOP, STALLS } from './config.js'
import { createPrompt, createWindow, el, ICON, short } from './shopwin.js'
import { bikeArt } from './bikeart.js'
import { addBike } from './sellshop.js'

// The Halloween Shop, at the Halloween! stall (hold E in its glowing disc):
// spend candy corn on the two limited bikes (they join your bikes) or on
// 5-minute boosts. The window shows your corn up top.

let corn = HALLOWEEN_SHOP.corn
let redraw = () => {}
const boosts = {} // name -> ms timestamp it runs out

export function addCorn(n) {
  corn += n
  redraw()
}
// Whether a boost ('1.5x Training', '1.5x Income') is running.
export const boostActive = (name) => (boosts[name] ?? 0) > Date.now()

export function createHalloweenShop({ hud, camera }) {
  const win = createWindow(hud, { title: 'Halloween Shop', cls: 'hw' })
  const count = el('div', 'hw-corn ot')
  const grid = el('div', 'hw-grid')
  win.body.append(count, grid)

  for (const it of HALLOWEEN_SHOP.items) {
    const card = el('div', `hw-card ${it.tone}`)
    const name = el('div', 'nm ot')
    const sub = el('div', 'sub ot')
    // Capitals, but "1.5x" and "$25K/s" keep their small x and s.
    if (it.bike) {
      name.textContent = it.bike.toUpperCase()
      sub.textContent = `${it.income} • LIMITED`
      card.append(name, sub, el('div', 'pic', bikeArt(it.bike)))
    } else {
      card.classList.add('boost')
      name.textContent = it.boost.toUpperCase().replace(/(\d)X/, '$1x')
      sub.textContent = `${it.minutes} MINUTES`
      card.append(name, sub)
    }
    const buy = hud.button('hw-buy sw-green', `${ICON.corn}<span class="ot">${short(it.corn, false)}</span>`, () => {
      if (corn < it.corn) {
        buy.classList.remove('sw-no')
        void buy.offsetWidth // restart the animation
        buy.classList.add('sw-no')
        hud.say('Not enough corn!')
        return
      }
      corn -= it.corn
      if (it.bike) {
        addBike(it.bike)
        hud.say(`${it.bike} added to your bikes!`)
      } else {
        boosts[it.boost] = Math.max(Date.now(), boosts[it.boost] ?? 0) + it.minutes * 60000
        hud.say(`${it.boost} for ${it.minutes} minutes!`)
      }
      render()
    })
    card.append(buy)
    grid.append(card)
  }

  function render() {
    count.textContent = `Your Corn: ${short(corn, false)}`
  }
  redraw = render
  render()

  return createPrompt(hud, camera, { stall: STALLS.halloween, object: 'Halloween Shop', win })
}
