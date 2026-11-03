import './windows.css'
import './fuse.css'
import { FUSE_TIERS, STALLS } from './config.js'
import { createPrompt, createWindow, el } from './shopwin.js'
import { bikeArt } from './bikeart.js'
import { addBike, ownedCount, takeBike } from './sellshop.js'
import { registerStore } from './stores.js'

// The Fuse Machine, at the Fuse Machine stall (hold E in its glowing disc). Five
// tiers, each "three bikes = one better bike": the tiles of the bikes you own are
// lit, "n/3" counts them, and FUSE spends one of each and adds the result to your
// bikes (and the Bike Index). A tier stays locked, under a padlock, until the one
// before it has been fused. Progress is kept in localStorage.

const KEY = 'sab-fuse'
const LOCK = '<svg class="fz-lock" viewBox="0 0 100 120" aria-hidden="true"><path d="M26 52V38a24 24 0 0 1 48 0v14" fill="none" stroke="#1a2236" stroke-width="20" stroke-linecap="round"/><path d="M26 52V38a24 24 0 0 1 48 0v14" fill="none" stroke="#9fc4e8" stroke-width="11" stroke-linecap="round"/><rect x="8" y="48" width="84" height="66" rx="16" fill="#ffb61a" stroke="#1a2236" stroke-width="7"/><path d="M16 60c0-4 3-6 7-6h26l-8 52H24c-5 0-8-3-8-8z" fill="#fff" opacity=".28"/><circle cx="50" cy="74" r="9" fill="#8a3a0a" stroke="#1a2236" stroke-width="3"/><path d="M45 78h10l3 18H42z" fill="#8a3a0a" stroke="#1a2236" stroke-width="3" stroke-linejoin="round"/></svg>'

function load() {
  try {
    const n = JSON.parse(localStorage.getItem(KEY))
    if (Number.isInteger(n) && n >= 0) return n
  } catch {
    // No storage: start fresh.
  }
  return 0
}

export function createFuse({ hud, camera }) {
  let done = load() // tiers fused so far
  registerStore({
    snapshot: () => ({ fuse: done }),
    hydrate(doc) {
      if (!Number.isInteger(doc.fuse)) return
      done = Math.min(FUSE_TIERS.length, Math.max(done, doc.fuse)) // never takes a tier back
      render()
    },
  })
  const win = createWindow(hud, { title: 'Fuse Machine', banner: { text: 'Fuse Machine!', tone: 'blue', tuck: true }, cls: 'fz' })
  const list = el('div', 'fz-list')
  win.body.append(list)

  const cards = FUSE_TIERS.map((t, i) => {
    const card = el('div', 'fz-card')
    const title = el('div', 'fz-title ot')
    title.textContent = `Tier ${i + 1} Fuse - ${t.result}`
    const row = el('div', 'fz-row')
    const tile = (name, cls = '') => {
      const e = el('div', `fz-tile ${cls}`, `${bikeArt(name)}<span class="nm ot"></span>`)
      const nm = e.querySelector('.nm')
      nm.textContent = name
      if (name.length > 12) nm.classList.add('long')
      return e
    }
    const ins = t.from.map((name) => tile(name))
    row.append(...ins, el('span', 'eq'), tile(t.result, 'out'))
    const count = el('div', 'fz-count ot')
    const btn = hud.button('fz-btn sw-green', '<span class="ot">FUSE</span>', () => fuse(i, btn))
    const foot = el('div', 'fz-foot')
    foot.append(count, btn)
    const lock = el('div', 'fz-locked', `${LOCK}<span class="ot">Complete Tier ${i}</span>`)
    card.append(title, row, foot, lock)
    list.append(card)
    return { t, card, ins, count, btn, lock }
  })

  function fuse(i, btn) {
    const c = cards[i]
    if (i > done) return hud.say(`Complete Tier ${i} first`)
    if (i < done) return hud.say('Already fused')
    if (!c.t.from.every((n) => ownedCount(n) > 0)) {
      btn.classList.remove('sw-no')
      void btn.offsetWidth // restart the animation
      btn.classList.add('sw-no')
      return hud.say('You need all 3 bikes!')
    }
    for (const n of c.t.from) takeBike(n)
    addBike(c.t.result)
    done = i + 1
    try {
      localStorage.setItem(KEY, String(done))
    } catch {
      // Not saved this time.
    }
    hud.say(`Fused a ${c.t.result}!`)
    render()
  }

  function render() {
    cards.forEach(({ t, card, ins, count, btn, lock }, i) => {
      const locked = i > done
      const have = t.from.map((n) => ownedCount(n) > 0)
      ins.forEach((tile, k) => tile.classList.toggle('have', have[k]))
      card.classList.toggle('locked', locked)
      count.textContent = i < done ? 'Fused' : `${have.filter(Boolean).length}/3`
      btn.querySelector('.ot').textContent = locked ? 'LOCKED' : i < done ? 'DONE' : 'FUSE'
      btn.className = `fz-btn ${i < done ? 'sw-grey' : 'sw-green'}${locked ? ' off' : ''}`
      lock.hidden = !locked
    })
  }
  win.onOpen = () => {
    list.scrollTop = 0
    render()
  }
  render()

  return createPrompt(hud, camera, { stall: STALLS.fuse, object: 'Fuse Machine', action: 'Fuse Bikes', win })
}
