import './hud.css'
import { ANNOUNCE, HUD_START, LAYOUT, SLOW_MODE_SCALE, TIMERS } from './config.js'
import { onKey } from './input.js'
import { player } from './player.js'
import { onReservedAreas } from './bloxity.js'
import { eventStatus, mmss, raceStatus } from './timers.js'
import { isMuted, setMuted } from './audio.js'

// The lobby HUD: Battle Pass / Shop / Index / Slow Mode down the left, gems and
// cash bottom left, the two-slot hotbar bottom centre, and on the right Daily
// Rewards, the Starter Pack, x2 Speed with its boost timer, and the event and
// race countdowns. Out past the SAFE ZONE line, Ride My Bike (and its gear
// button) sits above the hotbar. Shop windows are not built yet: their buttons
// answer with a toast.

const ICONS = {
  bell: `<svg viewBox="0 0 80 90"><defs><linearGradient id="hb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#f29a00"/></linearGradient></defs>
    <path d="M40 6c4 0 6 3 6 6 14 4 20 16 20 30v16l8 10v6H6v-6l8-10V42c0-14 6-26 20-30 0-3 2-6 6-6z" fill="url(#hb)" stroke="#6b2a00" stroke-width="4"/>
    <circle cx="40" cy="80" r="8" fill="#f2a000" stroke="#6b2a00" stroke-width="4"/><path d="M24 30c3-8 8-11 14-12" stroke="#fff7c0" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  cart: `<svg viewBox="0 0 64 56"><path d="M4 6h10l7 30h30l7-22H18" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><circle cx="24" cy="47" r="5" fill="#fff"/><circle cx="48" cy="47" r="5" fill="#fff"/></svg>`,
  book: `<svg viewBox="0 0 64 56"><path d="M10 8h34l10 8v34H20l-10-8z" fill="#fff" stroke="#1a1230" stroke-width="4" stroke-linejoin="round"/><path d="M20 16h26M20 26h26M20 36h18" stroke="#1a1230" stroke-width="4"/><path d="M10 8v34l10 8V16z" fill="#d9e6ff" stroke="#1a1230" stroke-width="4" stroke-linejoin="round"/></svg>`,
  bikeGem: `<svg viewBox="0 0 90 70"><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff0ff"/><stop offset=".5" stop-color="#2a9cff"/><stop offset="1" stop-color="#0a3aa8"/></linearGradient></defs>
    <circle cx="18" cy="48" r="14" fill="#123" stroke="#7fd8ff" stroke-width="5"/><circle cx="70" cy="48" r="14" fill="#123" stroke="#7fd8ff" stroke-width="5"/>
    <path d="M14 40l14-18 22-4 14 8 12-6 8 10-14 10H40L30 46z" fill="url(#hg)" stroke="#0a2060" stroke-width="3" stroke-linejoin="round"/><path d="M30 20l10-12 12 10" fill="#5fd0ff" stroke="#0a2060" stroke-width="3"/></svg>`,
  cash: `<svg viewBox="0 0 86 70"><path d="M8 30l38-18 34 14-38 20z" fill="#7fe05a" stroke="#0d3a10" stroke-width="4" stroke-linejoin="round"/><path d="M8 30v16l34 18V46z" fill="#2fa83a" stroke="#0d3a10" stroke-width="4" stroke-linejoin="round"/><path d="M42 46v18l38-20V26z" fill="#ffc21a" stroke="#0d3a10" stroke-width="4" stroke-linejoin="round"/><path d="M28 20l34 14" stroke="#ffe066" stroke-width="7"/></svg>`,
  bat: `<svg viewBox="0 0 66 66"><path d="M58 6c3 3 2 7-1 10L22 50l-6-6L50 9c3-3 6-4 8-3z" fill="#f1d38a" stroke="#6b4a1a" stroke-width="3"/><path d="M16 44l6 6-8 9c-2 2-5 2-7 0s-2-5 0-7z" fill="#c9a060" stroke="#6b4a1a" stroke-width="3"/></svg>`,
  wire: `<svg viewBox="0 0 66 66"><g fill="none" stroke="#d4d9e2" stroke-width="3"><ellipse cx="33" cy="36" rx="24" ry="14"/><ellipse cx="33" cy="32" rx="22" ry="12"/><ellipse cx="33" cy="28" rx="20" ry="10"/></g><g stroke="#9aa3b2" stroke-width="3"><path d="M12 30l-4-4M54 30l4-4M20 44l-3 5M46 44l3 5M33 18v-6"/></g></svg>`,
  starter: `<svg viewBox="0 0 150 150"><defs><radialGradient id="hs"><stop offset="0" stop-color="#5fe4ff"/><stop offset="1" stop-color="#1a4fd0"/></radialGradient></defs>
    <circle cx="75" cy="75" r="70" fill="url(#hs)" stroke="#0b1a3a" stroke-width="6"/>
    <g transform="translate(66 24)"><path d="M0 22l40-18 28 12-40 20z" fill="#7fe05a" stroke="#0d3a10" stroke-width="3"/><path d="M0 22v14l28 14V36z" fill="#2fa83a" stroke="#0d3a10" stroke-width="3"/><path d="M28 36v14l40-20V16z" fill="#ffc21a" stroke="#0d3a10" stroke-width="3"/></g>
    <circle cx="44" cy="104" r="20" fill="#222" stroke="#fff" stroke-width="5"/><circle cx="108" cy="110" r="16" fill="#222" stroke="#fff" stroke-width="5"/>
    <path d="M36 90l22-26 30-6 22 14-6 22H62z" fill="#f4f6ff" stroke="#0b1a3a" stroke-width="4" stroke-linejoin="round"/><path d="M60 72l26-6 14 10-30 8z" fill="#ff3cb4"/></svg>`,
  shield: `<svg viewBox="0 0 78 92"><path d="M39 4l32 10v28c0 22-14 38-32 46C21 80 7 64 7 42V14z" fill="#ff9d1a" stroke="#7a2a00" stroke-width="4"/><path d="M39 12l24 8v22c0 16-10 28-24 36z" fill="#ffd21a"/></svg>`,
  boost: `<svg viewBox="0 0 58 50"><circle cx="12" cy="36" r="9" fill="#123" stroke="#7fd8ff" stroke-width="4"/><circle cx="46" cy="36" r="9" fill="#123" stroke="#7fd8ff" stroke-width="4"/><path d="M8 30l10-14 16-2 10 6 8-4 4 8-10 6H26z" fill="#2a9cff" stroke="#0a2060" stroke-width="3"/></svg>`,
  pumpkin: `<svg viewBox="0 0 60 60"><path d="M30 8c2-6 8-6 10-4-4 1-6 4-7 8" fill="#3f8a22"/><ellipse cx="30" cy="36" rx="26" ry="20" fill="#ff7a12" stroke="#7a2a00" stroke-width="3"/><path d="M30 16v40M18 18c-6 10-6 26 0 36M42 18c6 10 6 26 0 36" stroke="#d9580a" stroke-width="3" fill="none"/>
    <path d="M17 30l6-6 5 7zM43 30l-6-6-5 7z" fill="#4a1a00"/><path d="M16 40c8 8 20 8 28 0l-4 8h-20z" fill="#4a1a00"/></svg>`,
  gear: `<svg viewBox="0 0 64 64"><path d="M27 4h10l2 8 6 3 7-4 7 7-4 7 3 6 8 2v10l-8 2-3 6 4 7-7 7-7-4-6 3-2 8H27l-2-8-6-3-7 4-7-7 4-7-3-6-8-2V27l8-2 3-6-4-7 7-7 7 4 6-3z" fill="#3d8cff" stroke="#123a8a" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="32" r="10" fill="#6f7a90" stroke="#123a8a" stroke-width="3"/></svg>`,
  speaker: `<svg viewBox="0 0 48 48"><path d="M8 18h8l10-8v28l-10-8H8z" fill="#fff" stroke="#1a1230" stroke-width="3" stroke-linejoin="round"/><path class="waves" d="M31 17c3 3 3 11 0 14M36 12c6 6 6 18 0 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path class="cross" d="M32 18l12 12M44 18L32 30" stroke="#ff4a5a" stroke-width="4" stroke-linecap="round"/></svg>`,
  flag: `<svg viewBox="0 0 60 60"><path d="M10 6v52" stroke="#555" stroke-width="5"/><path d="M12 8h40v28H12z" fill="#fff" stroke="#222" stroke-width="2"/>
    <g fill="#111"><rect x="12" y="8" width="8" height="7"/><rect x="28" y="8" width="8" height="7"/><rect x="44" y="8" width="8" height="7"/><rect x="20" y="15" width="8" height="7"/><rect x="36" y="15" width="8" height="7"/><rect x="12" y="22" width="8" height="7"/><rect x="28" y="22" width="8" height="7"/><rect x="44" y="22" width="8" height="7"/><rect x="20" y="29" width="8" height="7"/><rect x="36" y="29" width="8" height="7"/></g></svg>`,
}

function el(tag, cls, html = '') {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  e.innerHTML = html
  return e
}

function shortMoney(n) {
  if (n < 1000) return `$${Math.floor(n)}`
  const units = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]]
  for (const [u, v] of units) {
    if (n >= v) {
      const x = n / v
      return `$${x >= 100 ? Math.floor(x) : (Math.floor(x * 10) / 10).toString()}${u}`
    }
  }
  return `$${n}`
}

export function createHud() {
  const root = el('div', 'hud')
  let toastTimer = 0
  const toast = el('div', 'hud-toast ot')
  const say = (text) => {
    toast.textContent = text
    toast.classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1600)
  }
  const btn = (cls, html, fn) => {
    const b = el('button', cls, html)
    b.type = 'button'
    b.addEventListener('pointerdown', (e) => e.stopPropagation()) // keep taps off the look/joystick zones
    b.addEventListener('click', fn)
    return b
  }

  // Left column.
  const left = el('div', 'hud-left')
  left.append(
    btn('hud-bp', `${ICONS.bell.replace('<svg', '<svg class="bell"')}<div class="banner ot">Battle Pass</div><div class="tag ot">Discount</div>`, () => say('Battle Pass coming soon')),
    btn('hud-big hud-shop', `${ICONS.cart}<span class="ot">Shop</span><span class="hud-badge ot">!</span>`, () => say('Shop coming soon')),
    btn('hud-big hud-index', `${ICONS.book}<span class="ot">Index</span><span class="hud-badge ot">!</span>`, () => say('Index coming soon')),
  )
  const slow = btn('hud-slow', `<span class="sw"><span class="knob"></span></span><span class="txt ot">Slow Mode</span>`, () => {
    slow.classList.toggle('on')
    player.speedScale = slow.classList.contains('on') ? SLOW_MODE_SCALE : 1
  })
  left.append(slow)

  // Money.
  const money = el('div', 'hud-money')
  const gemRow = el('div', 'row', `<div class="ico">${ICONS.bikeGem}<span class="plus">+</span></div><span class="hud-gems ot"></span>`)
  const cashRow = el('div', 'row', `<div class="ico">${ICONS.cash}</div><span class="hud-cash ot"></span>`)
  money.append(gemRow, cashRow)
  const gemsEl = gemRow.querySelector('.hud-gems')
  const cashEl = cashRow.querySelector('.hud-cash')

  // Hotbar.
  const hotbar = el('div', 'hud-hotbar')
  const slots = [
    btn('hud-slot', `<span class="n ot">1</span>${ICONS.bat}<span class="nm ot">Bat</span>`, () => select(0)),
    btn('hud-slot', `<span class="n ot">2</span>${ICONS.wire}<span class="cnt">x2</span><span class="nm ot">Barbed Wire</span>`, () => select(1)),
  ]
  let selected = -1
  const select = (i) => {
    selected = selected === i ? -1 : i
    slots.forEach((s, k) => s.classList.toggle('sel', k === selected))
  }
  hotbar.append(...slots)
  onKey('Digit1', () => select(0))
  onKey('Digit2', () => select(1))

  // Right side.
  const daily = btn('hud-daily', 'Daily Rewards', () => say('Daily Rewards coming soon'))
  const sound = btn('hud-sound', ICONS.speaker, () => toggleSound())
  const toggleSound = () => {
    setMuted(!isMuted())
    sound.classList.toggle('muted', isMuted())
    say(isMuted() ? 'Sound off' : 'Sound on')
  }
  sound.classList.toggle('muted', isMuted())
  onKey('KeyM', toggleSound)
  const topRight = el('div', 'hud-topright')
  topRight.append(sound, daily)
  const starter = btn('hud-starter', `<div class="rays"></div>${ICONS.starter}<span class="ot">Starter Pack</span>`, () => say('Starter Pack coming soon'))
  const x2 = btn('hud-x2', `${ICONS.shield.replace('<svg', '<svg class="shield"')}<div class="t1 ot">x2 Speed</div><div class="t2 ot">Only 2 <i></i></div>`, () => say('x2 Speed coming soon'))
  const boost = el('div', 'hud-boost', `${ICONS.boost}<span class="x ot">x2</span><div class="tm ot"></div>`)
  const boostEl = boost.querySelector('.tm')
  const timers = el('div', 'hud-timers')
  const eventRow = el('div', 'row', `${ICONS.pumpkin}<span class="ot"></span>`)
  const raceRow = el('div', 'row', `${ICONS.flag}<span class="ot"></span>`)
  timers.append(eventRow, raceRow)
  const eventEl = eventRow.querySelector('span')
  const raceEl = raceRow.querySelector('span')

  // Ride My Bike: only out in the lane, past the SAFE ZONE line.
  const ride = el('div', 'hud-ride')
  const rideBtn = btn('hud-ride-go', '<span class="ot">Ride My Bike</span>', () => {
    player.riding = !player.riding
    rideLabel.textContent = player.riding ? 'Get Off Bike' : 'Ride My Bike'
  })
  const rideLabel = rideBtn.querySelector('span')
  ride.append(rideBtn, btn('hud-ride-gear', ICONS.gear, () => say('Bike settings coming soon')))

  // Announcement banner ("A Secret Phantom GT Just Spawned in Angel Biome!").
  const banner = el('div', 'hud-announce ot')
  let nextAnnounce = ANNOUNCE.first
  let announceLeft = 0
  let announceK = 0

  // Zone title card (on entering a zone) and the small zone label up top.
  const card = el('div', 'hud-zonecard')
  const pill = el('div', 'hud-zonepill ot')
  let cardTimer = 0

  root.append(left, money, hotbar, ride, topRight, starter, x2, boost, timers, banner, pill, card, toast)
  document.body.appendChild(root)

  // Keep the left column under Boxity's toolbar + chat in the top-left corner.
  // On short screens there is no room under them, so the column goes beside the chat instead.
  onReservedAreas((areas) => {
    const corner = areas.filter((a) => a.left < window.innerWidth * 0.3)
    const bottom = corner.reduce((m, a) => Math.max(m, a.top + a.height), 0)
    root.style.setProperty('--reserved-top', `${bottom}px`)
    if (window.innerHeight - bottom < 320) {
      const toolbar = corner.find((a) => a.id === 'toolbar')
      const chat = corner.find((a) => a.id === 'chat')
      root.style.setProperty('--col-top', `${(toolbar ? toolbar.top + toolbar.height : 0) + 8}px`)
      root.style.setProperty('--col-left', `${(chat ? chat.left + chat.width : 0) + 12}px`)
    } else {
      root.style.removeProperty('--col-top')
      root.style.removeProperty('--col-left')
    }
  })

  // --- State ---
  let cash = HUD_START.cash
  let boostLeft = TIMERS.boost
  let shownCash = ''
  let tick = 1 // draw on the first update
  gemsEl.textContent = HUD_START.gems

  let rideShown = null
  let clock = 0
  return {
    // A zone of the lane: { k, name, rec, guard, color }.
    enterZone(z) {
      card.innerHTML = ''
      const k = el('div', 'k ot')
      k.textContent = `ZONE ${z.k}`
      const n = el('div', 'n ot')
      n.textContent = z.name
      n.style.color = z.color
      const info = el('div', 'i ot')
      info.textContent = `Recommended ${z.rec} · Guarded by ${z.guard}`
      card.append(k, n, info)
      card.classList.remove('show')
      void card.offsetWidth // restart the animation
      card.classList.add('show')
      clearTimeout(cardTimer)
      cardTimer = setTimeout(() => card.classList.remove('show'), 3600)
      pill.textContent = `Zone ${z.k} · ${z.name}`
      pill.classList.add('show')
    },
    leaveLane() {
      pill.classList.remove('show')
    },
    update(dt) {
      clock += dt
      if (clock >= nextAnnounce) {
        nextAnnounce = clock + ANNOUNCE.every
        announceLeft = ANNOUNCE.show
        const m = ANNOUNCE.messages[announceK++ % ANNOUNCE.messages.length]
        banner.innerHTML = ''
        const bike = el('span', 'bike')
        bike.textContent = m.bike
        banner.append(m.pre, bike, m.post)
        banner.classList.add('show')
      }
      if (announceLeft > 0) {
        announceLeft -= dt
        if (announceLeft <= 0) banner.classList.remove('show')
      }
      // Every frame: the safe zone (up to the far edge of the red line) takes you off your bike.
      const outside = player.position.z < LAYOUT.safeZoneZ - 0.6
      if (!outside && player.riding) {
        player.riding = false
        rideLabel.textContent = 'Ride My Bike'
      }
      if (outside !== rideShown) {
        rideShown = outside
        ride.classList.toggle('show', outside)
      }
      boostLeft = Math.max(0, boostLeft - dt)
      cash += HUD_START.income * dt
      tick += dt
      if (tick < 0.2) return // the DOM only needs a few updates a second
      tick = 0
      const c = shortMoney(cash)
      if (c !== shownCash) {
        shownCash = c
        cashEl.textContent = c
      }
      boost.style.display = boostLeft > 0 ? '' : 'none'
      boostEl.textContent = `${Math.floor(boostLeft / 60)}:${String(Math.floor(boostLeft % 60)).padStart(2, '0')}`
      const e = eventStatus()
      eventEl.textContent = `${e.open ? 'Closes' : 'Event'} in ${mmss(e.left)}`
      const r = raceStatus()
      raceEl.textContent = r.now ? 'Race is NOW!' : `Race in ${mmss(r.left)}`
      raceEl.classList.toggle('now', r.now)
    },
  }
}
