import './windows.css'
import { DAILY_REWARDS } from './config.js'
import { createWindow, el, ICON, short } from './shopwin.js'
import { bikeArt } from './bikeart.js'
import { addBike } from './sellshop.js'
import { registerStore } from './stores.js'

// Daily Rewards, from the HUD button: seven days, a new one unlocking
// DAILY_REWARDS.every s after the last claim (days 1-6 small, day 7 the big
// tile). Claimed days get a green check; tap the glowing day to claim it.
// Cash goes to your cash, bikes join your bikes. Progress is kept in
// localStorage, so it survives a reload.

const KEY = 'sab-daily'
const CALENDAR = '<svg class="dr-cal" viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="12" width="88" height="82" rx="14" fill="#fff" stroke="#1a2236" stroke-width="5"/><path d="M6 26a14 14 0 0 1 14-14h60a14 14 0 0 1 14 14v8H6z" fill="#ff3a4a" stroke="#1a2236" stroke-width="5" stroke-linejoin="round"/><rect x="24" y="4" width="10" height="20" rx="5" fill="#9aa3b4" stroke="#1a2236" stroke-width="4"/><rect x="66" y="4" width="10" height="20" rx="5" fill="#9aa3b4" stroke="#1a2236" stroke-width="4"/><text x="50" y="80" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="44" fill="#1a1230">31</text></svg>'
const CHECK = '<svg class="dr-check" viewBox="0 0 100 80" aria-hidden="true"><path d="M8 42l26 24L92 10" fill="none" stroke="#0a3a10" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 42l26 24L92 10" fill="none" stroke="#3fe04a" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && Number.isFinite(s.claimed) && Number.isFinite(s.last)) return s
  } catch {
    // No storage (private window): start fresh.
  }
  return { claimed: 0, last: 0 }
}
function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Not saved this time; the claim still counts for this session.
  }
}

const hms = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000))
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

export function createDaily({ hud }) {
  const state = load()
  registerStore({
    snapshot: () => ({ dailyClaimed: state.claimed, dailyLast: state.last }),
    hydrate(doc) {
      if (!Number.isFinite(doc.dailyClaimed) || !Number.isFinite(doc.dailyLast)) return
      state.claimed = doc.dailyClaimed
      state.last = doc.dailyLast
      save(state)
      render()
    },
  })
  const win = createWindow(hud, { title: 'Daily Rewards', icon: CALENDAR, cls: 'dr' })
  const grid = el('div', 'dr-grid')
  const foot = el('div', 'dr-foot ot')
  win.body.append(grid, foot)

  const wait = () => (state.claimed === 0 ? 0 : state.last + DAILY_REWARDS.every * 1000 - Date.now())
  // Days claimed this week as shown (a finished week starts over once the next day unlocks).
  const shown = () => (state.claimed >= 7 && wait() <= 0 ? 0 : state.claimed)

  const tiles = DAILY_REWARDS.days.map((d, i) => {
    const big = i === 6
    const tile = hud.button(`dr-tile${big ? ' big' : ''}`, '', () => claim(i))
    const label = `<span class="day ot">Day ${i + 1}</span>`
    const op = d.op ? '<span class="op ot">OP!</span>' : ''
    const pic = d.bike ? bikeArt(d.bike) : ICON.cash
    const what = d.bike ?? short(d.cash)
    tile.innerHTML = `${label}${op}<span class="pic">${pic}</span><span class="what ot"></span>${CHECK}`
    tile.querySelector('.what').textContent = what
    grid.append(tile)
    return tile
  })

  function claim(i) {
    const n = shown()
    if (i < n) return hud.say(`Day ${i + 1} already claimed`)
    if (i > n || wait() > 0) return hud.say(`Day ${n + 1} unlocks in ${hms(wait())}`)
    const d = DAILY_REWARDS.days[i]
    if (d.bike) {
      addBike(d.bike)
      hud.say(`${d.bike} added to your bikes!`)
    } else {
      hud.earn(d.cash)
      hud.say(`+${short(d.cash)}!`)
    }
    state.claimed = n + 1
    state.last = Date.now()
    save(state)
    render()
  }

  function render() {
    const n = shown()
    const ready = wait() <= 0
    tiles.forEach((t, i) => {
      t.classList.toggle('claimed', i < n)
      t.classList.toggle('ready', i === n && ready)
      t.classList.toggle('next', i === n)
    })
    if (n >= 7) foot.textContent = `New week unlocks in ${hms(wait())}`
    else foot.textContent = ready ? `Day ${n + 1} is ready! Tap it to claim` : `Day ${n + 1} unlocks in ${hms(wait())}`
  }

  let timer = 0
  win.onOpen = () => {
    render()
    timer = setInterval(render, 1000)
  }
  win.onClose = () => clearInterval(timer)
  hud.onDaily(() => (win.isOpen ? win.close() : win.open()))
  render()
  return win
}
