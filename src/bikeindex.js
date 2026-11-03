import './windows.css'
import { INDEX_REWARD, INDEX_START, INDEX_WORLDS, RARITIES } from './config.js'
import { createWindow, el, ICON, short } from './shopwin.js'
import { bikeArt, CATALOG, worldScene } from './bikeart.js'
import { BIKE_ICON } from './hud.js'
import { registerStore } from './stores.js'

// The Bike Index, from the HUD's Index button. Every world in a scrolling list:
// its poster down the left, its bikes as rarity-coloured tiles (a black
// silhouette and ??? until discovered) and an "n/m discovered" bar. Tap a tile
// to see it on the right with its rarity, income and discovery reward (cash +
// speed); CLAIM! takes it, CLAIM ALL takes every waiting one. A bike is
// discovered when it joins your bikes (sellshop.addBike) or through discover().

const found = new Set()
const claimed = new Set()
let redraw = () => {}

export function discover(name) {
  if (!CATALOG.has(name) || found.has(name)) return
  found.add(name)
  redraw()
}
for (const n of INDEX_START) discover(n)

registerStore({
  snapshot: () => ({ found: [...found], claimed: [...claimed] }),
  hydrate(doc) {
    for (const n of doc.found ?? []) if (CATALOG.has(n)) found.add(n) // only ever grows: a bike seen is never forgotten
    for (const n of doc.claimed ?? []) if (CATALOG.has(n)) claimed.add(n)
    redraw()
  },
})

const reward = (c) => ({ cash: Math.round(c.income * INDEX_REWARD.cashSeconds), speed: RARITIES[c.rarity].speed })
const BOOK = '<svg viewBox="0 0 74 104" aria-hidden="true"><path d="M8 6h52a6 6 0 0 1 6 6v74H14a6 6 0 0 0-6 6z" fill="#3a8cff" stroke="#0a1a3a" stroke-width="5" stroke-linejoin="round"/><path d="M8 92a6 6 0 0 1 6-6h52v12H14a6 6 0 0 1-6-6z" fill="#fff" stroke="#0a1a3a" stroke-width="5"/><path d="M20 26h34M20 38h34" stroke="#bfe0ff" stroke-width="5" stroke-linecap="round"/><path d="M22 86v16l7-6 7 6V86" fill="#ffd21a" stroke="#0a1a3a" stroke-width="4" stroke-linejoin="round"/></svg>'

export function createBikeIndex({ hud }) {
  const win = createWindow(hud, { title: 'Bike Index', cls: 'ix', solo: true })
  const list = el('div', 'ix-list')
  const all = hud.button('ix-all', `<span class="book">${BOOK}</span><span class="bar"><span class="ot"></span></span>`, claimAll)
  const left = el('div', 'ix-left')
  left.append(list, all)

  const view = el('div', 'ix-view')
  const rewards = el('div', 'ix-rewards', '<div class="hd ot">Rewards:</div><div class="items"></div>')
  const claimBtn = hud.button('ix-claim sw-green', '<span class="ot">CLAIM!</span>', () => claim(selected))
  rewards.append(claimBtn)
  const right = el('div', 'ix-right')
  right.append(view, rewards)
  win.body.append(left, right)

  // World sections.
  const tiles = new Map() // name -> tile
  const bars = []
  for (const w of INDEX_WORLDS) {
    const sec = el('div', 'ix-world')
    const poster = el('div', 'ix-poster', worldScene(w.scene))
    const nm = el('div', 'nm ot')
    nm.textContent = w.name
    poster.append(nm)
    const grid = el('div', 'ix-tiles')
    for (const [name] of w.bikes) {
      const c = CATALOG.get(name)
      const t = hud.button(`ix-tile r-${c.rarity}`, `<span class="nm ot"></span>${bikeArt(name)}<span class="rr ot">${c.rarity}</span>`, () => select(name))
      t.style.setProperty('--bg', `linear-gradient(180deg, ${RARITIES[c.rarity].bg.join(', ')})`)
      t.style.touchAction = 'pan-y' // a swipe that starts on a tile still scrolls the list
      tiles.set(name, t)
      grid.append(t)
    }
    const bar = el('div', 'ix-bar', `<span class="fill"></span><span class="txt ot"></span>${bikeArt(w.bikes[0][0])}`)
    grid.append(bar)
    bars.push({ w, bar })
    sec.append(poster, grid)
    list.append(sec)
  }

  let selected = INDEX_START[0]
  function select(name) {
    selected = name
    render()
  }

  function claim(name) {
    if (!found.has(name) || claimed.has(name)) return
    const r = reward(CATALOG.get(name))
    claimed.add(name)
    hud.earn(r.cash)
    hud.addSpeed(r.speed)
    hud.say(`+${short(r.cash)} and +${r.speed} speed!`)
    render()
  }
  function claimAll() {
    const waiting = [...found].filter((n) => !claimed.has(n))
    if (!waiting.length) return hud.say('Nothing to claim')
    let cash = 0
    let speed = 0
    for (const n of waiting) {
      const r = reward(CATALOG.get(n))
      cash += r.cash
      speed += r.speed
      claimed.add(n)
    }
    hud.earn(cash)
    hud.addSpeed(speed)
    hud.say(`+${short(cash)} and +${speed} speed!`)
    render()
  }

  function render() {
    for (const [name, t] of tiles) {
      const known = found.has(name)
      t.classList.toggle('locked', !known)
      t.classList.toggle('waiting', known && !claimed.has(name))
      t.classList.toggle('sel', name === selected)
      const nm = t.querySelector('.nm')
      nm.textContent = known ? name : '???'
      nm.classList.toggle('long', known && name.length > 7)
    }
    for (const { w, bar } of bars) {
      const n = w.bikes.filter(([name]) => found.has(name)).length
      bar.querySelector('.fill').style.width = `${(n / w.bikes.length) * 100}%`
      bar.querySelector('.txt').textContent = `${n}/${w.bikes.length} discovered`
    }
    const waiting = [...found].filter((n) => !claimed.has(n)).length
    all.querySelector('.bar .ot').textContent = waiting ? `CLAIM ALL (${waiting})!` : 'ALL CLAIMED'
    all.classList.toggle('off', !waiting)

    const c = CATALOG.get(selected)
    const known = found.has(selected)
    const r = reward(c)
    view.className = `ix-view${known ? '' : ' locked'}`
    view.innerHTML = `${bikeArt(selected)}<div class="nm ot"></div><div class="rr ot">${c.rarity}</div><div class="inc ot">${known ? `${short(c.income)}/s` : '$???/s'}</div>`
    view.querySelector('.nm').textContent = known ? selected : '???'
    rewards.querySelector('.items').innerHTML = `<div class="it">${ICON.cash}<span class="ot">${short(r.cash)}</span></div><div class="it">${BIKE_ICON}<span class="ot">+${r.speed}</span></div>`
    const done = claimed.has(selected)
    claimBtn.className = `ix-claim ${known && !done ? 'sw-green' : 'sw-grey'}`
    claimBtn.querySelector('.ot').textContent = !known ? 'LOCKED' : done ? 'CLAIMED' : 'CLAIM!'
  }
  redraw = render
  render()

  win.onOpen = render
  hud.onIndex(() => (win.isOpen ? win.close() : win.open()))
  return win
}
