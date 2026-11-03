import './windows.css'
import { SELL_START, STALLS } from './config.js'
import { createPrompt, createWindow, el, ICON, short } from './shopwin.js'
import { bikeArt, bikeValue } from './bikeart.js'
import { discover } from './bikeindex.js'
import { registerStore } from './stores.js'

// Sell Bikes, at the SELL! stall (hold E in its glowing disc). Your bikes as
// tiles, each picked (green border) to sell; tap one to leave it out. The bar
// shows the total of the picked bikes and Sell turns them into cash. Bikes come
// from SELL_START, Daily Rewards and the Halloween shop (addBike). Walking in
// with a stolen bike in your hands, the hold sells that one (onHandSale).

let bikes = [] // { name, value, on }
let redraw = () => {}

// Adds a bike (by name) to the bikes you can sell; it counts as discovered in the Bike Index.
export function addBike(name) {
  bikes.push({ name, value: bikeValue(name), on: true })
  discover(name)
  redraw()
}
for (const n of SELL_START) addBike(n)

// Saved: one name per bike you own (duplicates count: the Fuse Machine needs three of one).
registerStore({
  snapshot: () => ({ bikes: bikes.map((b) => b.name) }),
  hydrate(doc) {
    if (!Array.isArray(doc.bikes)) return
    bikes = doc.bikes.map((name) => ({ name, value: bikeValue(name), on: true }))
    for (const b of bikes) discover(b.name)
    redraw()
  },
})

// For the Fuse Machine: how many of a bike you own, and spending one.
export const ownedCount = (name) => bikes.filter((b) => b.name === name).length
export function takeBike(name) {
  const i = bikes.findIndex((b) => b.name === name)
  if (i >= 0) bikes.splice(i, 1)
  redraw()
}

export function createSellShop({ hud, camera }) {
  const win = createWindow(hud, { title: 'Sell Bikes', banner: { text: 'SELL!', tone: 'pink', tuck: true }, cls: 'sell' })
  const grid = el('div', 'sell-grid')
  const bar = el('div', 'sell-bar', `<span class="lbl ot">Total Value:</span>${ICON.cash}<span class="tot ot"></span>`)
  const tot = bar.querySelector('.tot')
  const go = hud.button('sell-go sw-green', '<span class="ot">Sell</span>', sell)
  bar.append(go)
  win.body.append(grid, bar)

  function total() {
    return bikes.reduce((s, b) => s + (b.on ? b.value : 0), 0)
  }

  function render() {
    grid.innerHTML = ''
    if (!bikes.length) grid.append(el('div', 'sell-empty ot', 'No bikes to sell'))
    for (const b of bikes) {
      const tile = hud.button(`sell-tile${b.on ? ' on' : ''}`, `<span class="nm ot"></span>${bikeArt(b.name)}<span class="v ot">${short(b.value)}</span>`, () => {
        b.on = !b.on
        render()
      })
      tile.querySelector('.nm').textContent = b.name
      grid.append(tile)
    }
    tot.textContent = short(total())
    go.classList.toggle('off', total() === 0)
  }
  redraw = render
  render()

  function sell() {
    const n = total()
    if (!n) {
      go.classList.remove('sw-no')
      void go.offsetWidth // restart the animation
      go.classList.add('sw-no')
      hud.say(bikes.length ? 'Pick a bike to sell' : 'No bikes to sell')
      return
    }
    bikes = bikes.filter((b) => !b.on)
    hud.earn(n)
    hud.say(`Sold for ${short(n)}!`)
    render()
  }

  // Holding a stolen bike (base.js): the stall's hold sells that bike instead of opening the window.
  return createPrompt(hud, camera, { stall: STALLS.sell, object: 'Sell Bikes', win, alt: () => handSale?.() })
}

let handSale = null
// fn() returns { object, action, run } while you hold a bike to sell, else null.
export function onHandSale(fn) {
  handSale = fn
}
