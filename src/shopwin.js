import './shopwin.css'
import { Vector3 } from 'three'
import { PROMPT } from './config.js'
import { isHeld } from './input.js'
import { player } from './player.js'

// The shop window shell every market window shares (Trail Shop, Sell Bikes,
// Halloween Shop, Daily Rewards): a blur over the world, an optional big title
// above, the cyan lego header with its title and red X, and a body each window
// fills. One window is open at a time; Esc, X or (for stall windows) E or
// walking away closes it. Plus the hold-to-interact prompt that floats over a
// stall: "Trail Shop / Interact" with E (a hand on touch) ringed by the hold.

let current = null // the open window
let backdrop = null

// Esc closes the window instead of opening the portal menu (capture: before input.js).
window.addEventListener(
  'keydown',
  (e) => {
    if (!current || e.code !== 'Escape') return
    e.stopImmediatePropagation()
    current.close()
  },
  true,
)

export const anyWindowOpen = () => !!current

export function el(tag, cls, html = '') {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  e.innerHTML = html
  return e
}

// 2500 -> $2.5K (prices keep one decimal; `sign` false drops the $).
export function short(n, sign = true) {
  const s = sign ? '$' : ''
  if (n < 1000) return `${s}${Math.floor(n)}`
  for (const [u, v] of [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]]) {
    if (n >= v) return `${s}${Math.round((n / v) * 10) / 10}${u}`
  }
  return `${s}${n}`
}

export const ICON = {
  cash: '<svg class="i-cash" viewBox="0 0 86 70"><path d="M8 30l38-18 34 14-38 20z" fill="#7fe05a" stroke="#0d3a10" stroke-width="4" stroke-linejoin="round"/><path d="M8 30v16l34 18V46z" fill="#2fa83a" stroke="#0d3a10" stroke-width="4" stroke-linejoin="round"/><path d="M42 46v18l38-20V26z" fill="#ffc21a" stroke="#0d3a10" stroke-width="4" stroke-linejoin="round"/><path d="M28 20l34 14" stroke="#ffe066" stroke-width="7"/></svg>',
  gem: '<svg class="i-gem" viewBox="0 0 40 40"><path d="M20 3l15 8.5v17L20 37 5 28.5v-17z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><rect x="14" y="14" width="12" height="12" rx="2" fill="#fff"/></svg>',
  corn: '<svg class="i-corn" viewBox="0 0 40 46"><path d="M8 40c-3-2-3-5-1-8L22 5c2-3 6-3 7 1l6 30c1 3-1 6-4 6z" fill="#ffd21a" stroke="#5a2a00" stroke-width="3" stroke-linejoin="round"/><path d="M14 22c5 3 13 5 19 4l2 10c1 3-1 6-4 6l-23-2c-3-2-3-5-1-8z" fill="#ff8a1a"/><path d="M22 5c2-3 6-3 7 1l2 9c-5 1-10 0-14-2z" fill="#fff"/><path d="M8 40c-3-2-3-5-1-8L22 5c2-3 6-3 7 1l6 30c1 3-1 6-4 6z" fill="none" stroke="#5a2a00" stroke-width="3" stroke-linejoin="round"/><path d="M24 10l3 18" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></svg>',
  hand: '<svg viewBox="0 0 40 40"><path d="M15 21V8a3 3 0 0 1 6 0v10l9 2c2 .5 3 2 3 4l-1 8c-.4 3-3 5-6 5h-6c-2 0-4-1-5-3l-5-8c-1-2 1-4 3-3z" fill="#1a1230"/></svg>',
}

// hud: the HUD (button, mount). title: header text; icon: html before it;
// banner: { text, tone: 'blue' | 'pink', tuck } a big title above (tuck = half behind the window);
// cls: a class on the window wrapper for its own layout; solo: hide the rest of the HUD while open.
export function createWindow(hud, { title, icon = '', banner = null, cls = '', solo = false }) {
  if (!backdrop) {
    backdrop = el('div', 'sw-backdrop')
    hud.mount(backdrop)
  }
  const wrap = el('div', `sw-wrap ${cls}`)
  if (banner) {
    const b = el('div', `sw-banner ${banner.tone}${banner.tuck ? ' tuck' : ''}`)
    b.textContent = b.dataset.t = banner.text
    wrap.append(b)
  }
  const win = el('div', 'sw-win')
  const head = el('div', 'sw-head', `${icon}<span class="ot">${title}</span>`)
  const body = el('div', 'sw-body')
  win.append(head, body)
  wrap.append(win)
  hud.mount(wrap)

  const api = {
    body,
    onOpen: null,
    onClose: null,
    get isOpen() {
      return current === api
    },
    open() {
      if (current === api) return
      current?.close()
      current = api
      backdrop.classList.add('show')
      wrap.classList.add('show')
      wrap.parentNode.classList.toggle('sw-solo', solo)
      api.onOpen?.()
      if (document.pointerLockElement) document.exitPointerLock() // the cursor is needed for the buttons
    },
    close() {
      if (current !== api) return
      current = null
      backdrop.classList.remove('show')
      wrap.classList.remove('show')
      wrap.parentNode.classList.remove('sw-solo')
      api.onClose?.()
    },
  }
  head.append(hud.button('sw-x', '<span class="ot">X</span>', () => api.close()))
  return api
}

// The hold-E prompt for a stall window. stall: { zone, anchor } (config STALLS);
// object: the small label ("Trail Shop"); win: the window it opens.
// `alt()` may return { object, action, run } to make the hold do something else
// for now (the SELL! stall sells the bike in your hands), or null.
export function createPrompt(hud, camera, { stall, object, action = 'Interact', win, alt = null }) {
  const prompt = el('div', 'sw-prompt', `<div class="key"><span class="k">E</span><span class="hand">${ICON.hand}</span></div><div class="txt"><div class="obj"></div><div class="act ot"></div></div>`)
  const objEl = prompt.querySelector('.obj')
  const actEl = prompt.querySelector('.act')
  const setText = (o, a) => {
    if (objEl.textContent !== o) objEl.textContent = o
    if (actEl.textContent !== a) actEl.textContent = a
  }
  setText(object, action)
  let touchHold = false
  prompt.addEventListener('pointerdown', (e) => {
    e.stopPropagation() // keep the press off the look/joystick zones
    e.preventDefault()
    touchHold = true
    try {
      prompt.setPointerCapture(e.pointerId)
    } catch {
      // The hold still works without capture.
    }
  })
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) prompt.addEventListener(ev, () => (touchHold = false))
  hud.mount(prompt)

  const z = stall.zone
  const anchor = new Vector3(stall.anchor.x, stall.anchor.y, stall.anchor.z)
  const v = new Vector3()
  let hold = 0
  let latch = false // after the window opens or closes, E must be let go before it counts again
  let eWas = false
  let shown = false
  const prevClose = win.onClose
  win.onClose = () => {
    latch = true
    prevClose?.()
  }

  // How far outside the zone the player is (<= 0 inside).
  const outside = (p) => (z.r ? Math.hypot(p.x - z.x, p.z - z.z) - z.r : Math.max(Math.abs(p.x - z.x) - z.halfX, Math.abs(p.z - z.z) - z.halfZ))

  return {
    update(dt) {
      const out = outside(player.position)
      const eNow = isHeld('KeyE')
      const ePressed = eNow && !eWas
      eWas = eNow

      if (win.isOpen) {
        if (ePressed || out > PROMPT.slack) win.close()
        return
      }
      if (!eNow && !touchHold) latch = false

      const want = out <= 0 && !player.riding && !anyWindowOpen()
      if (want !== shown) {
        shown = want
        prompt.classList.toggle('show', want)
      }
      if (!want) {
        hold = 0
        prompt.style.setProperty('--p', 0)
        return
      }

      const other = alt?.() ?? null
      if (other) setText(other.object, other.action)
      else setText(object, action)
      const holding = (eNow || touchHold) && !latch
      hold = holding ? hold + dt : Math.max(0, hold - dt * 3)
      prompt.style.setProperty('--p', Math.min(1, hold / PROMPT.holdTime))
      prompt.classList.toggle('holding', holding)
      if (hold >= PROMPT.holdTime) {
        hold = 0
        latch = true
        touchHold = false
        if (other) other.run()
        else win.open()
        return
      }

      // Float over the stall; when the stall is off screen or behind the camera, sit above the hotbar.
      v.copy(anchor).project(camera)
      const onScreen = v.z < 1 && Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.9
      prompt.style.left = onScreen ? `${((v.x + 1) / 2) * window.innerWidth}px` : '50%'
      prompt.style.top = onScreen ? `${((1 - v.y) / 2) * window.innerHeight}px` : '72%'
    },
  }
}
