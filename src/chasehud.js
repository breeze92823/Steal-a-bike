import './chasehud.css'
import { COARSE_POINTER, HEIST } from './config.js'
import { setTouchWheelie } from './input.js'

// The steal-and-chase UI, mounted in the HUD layer (it shares its --u sizing):
//  - the STEAL prompt over the nearest bay bike (key E, or tap it),
//  - while you ride off with a bike: the red pulsing screen edges, DRIVE!,
//    "USE SHIFT TO WHEELIE" (a hold-to-wheelie button on touch), the
//    speedometer (MPH, gear, rev bars) and speed lines; the lobby HUD hides,
//  - the result card: STOLEN! (you walk the bike home, base.js) or BUSTED.
const BIKE = `<svg viewBox="0 0 90 70"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff0ff"/><stop offset=".5" stop-color="#2a9cff"/><stop offset="1" stop-color="#0a3aa8"/></linearGradient></defs>
  <circle cx="18" cy="48" r="14" fill="#123" stroke="#7fd8ff" stroke-width="5"/><circle cx="70" cy="48" r="14" fill="#123" stroke="#7fd8ff" stroke-width="5"/>
  <path d="M14 40l14-18 22-4 14 8 12-6 8 10-14 10H40L30 46z" fill="url(#cg)" stroke="#0a2060" stroke-width="3" stroke-linejoin="round"/><path d="M30 20l10-12 12 10" fill="#5fd0ff" stroke="#0a2060" stroke-width="3"/></svg>`
const BARS = 28

function el(tag, cls, html = '') {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  e.innerHTML = html
  return e
}
const money = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : `${Math.round(n)}`)

export function createChaseHud(hud) {
  const touch = COARSE_POINTER || navigator.maxTouchPoints > 0

  const prompt = el('button', 'chase-prompt', `<span class="key"><i>${touch ? '' : 'E'}</i></span><span class="txt"><small></small><b>STEAL</b></span>`)
  prompt.type = 'button'
  const promptName = prompt.querySelector('small')
  let stealFn = () => {}
  prompt.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    e.preventDefault()
    stealFn()
  })

  const vignette = el('div', 'chase-vignette')
  const lines = el('div', 'chase-lines')
  for (let i = 0; i < 14; i++) {
    const l = el('i')
    l.style.setProperty('--a', `${(i / 14) * 360 + Math.random() * 12}deg`)
    l.style.setProperty('--d', `${-Math.random() * 0.5}s`)
    lines.appendChild(l)
  }
  const drive = el('div', 'chase-drive', '<span>DRIVE!</span>')
  const tip = el('div', 'chase-tip', touch ? 'HOLD WHEELIE!' : 'USE SHIFT TO WHEELIE')
  const speedo = el('div', 'chase-speedo', `<div class="gear">N</div><div class="mph"><b>0</b><span>MPH</span></div><div class="bars"></div>`)
  const gearEl = speedo.querySelector('.gear')
  const mphEl = speedo.querySelector('.mph b')
  const barsEl = speedo.querySelector('.bars')
  const bars = []
  for (let i = 0; i < BARS; i++) {
    const b = el('i')
    // Flat under the MPH box, then climbing steeply to the gear box.
    const f = i / (BARS - 1)
    b.style.height = `${f < 0.64 ? 36 : 36 + ((f - 0.64) / 0.36) ** 1.15 * 64}%`
    barsEl.appendChild(b)
    bars.push(b)
  }
  const wheelieBtn = el('button', 'chase-wheelie', 'WHEELIE')
  wheelieBtn.type = 'button'
  const hold = (on) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    wheelieBtn.classList.toggle('on', on)
    setTouchWheelie(on)
  }
  wheelieBtn.addEventListener('pointerdown', hold(true))
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) wheelieBtn.addEventListener(ev, hold(false))

  const result = el('div', 'chase-result')

  for (const n of [vignette, lines, drive, tip, speedo, wheelieBtn, result, prompt]) hud.mount(n)

  let driveTimer = 0
  let resultTimer = 0
  let shownMph = -1
  let shownGear = ''
  let shownFill = -1
  let rev = 0
  return {
    onSteal(fn) {
      stealFn = fn
    },
    // Screen point (px) over the bike and its name, or null to hide.
    prompt(x, y, name) {
      if (x == null) {
        prompt.classList.remove('show')
        return
      }
      if (promptName.textContent !== name) promptName.textContent = name
      prompt.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`
      prompt.classList.add('show')
    },
    startChase() {
      document.body.classList.add('chasing')
      document.body.classList.toggle('chasing-touch', touch)
      for (const n of [drive, tip]) {
        n.classList.remove('show')
        void n.offsetWidth // restart the pop
        n.classList.add('show')
      }
      clearTimeout(driveTimer)
      driveTimer = setTimeout(() => drive.classList.remove('show'), HEIST.drive * 1000)
      shownMph = -1
    },
    // mph, gear ('N' or '1'..), rev 0..1 in the gear, speed 0..1 of the top speed.
    chaseTick(mph, gear, revTarget, speed, wheelie) {
      rev += (revTarget - rev) * 0.25
      const m = Math.round(mph)
      if (m !== shownMph) {
        shownMph = m
        mphEl.textContent = m
      }
      if (gear !== shownGear) {
        shownGear = gear
        gearEl.textContent = gear
        gearEl.classList.remove('shift')
        void gearEl.offsetWidth
        gearEl.classList.add('shift')
      }
      const fill = Math.round(rev * BARS)
      if (fill !== shownFill) {
        shownFill = fill
        bars.forEach((b, i) => b.classList.toggle('on', i < fill))
      }
      lines.style.setProperty('--speed', Math.max(0, (speed - 0.35) / 0.65).toFixed(2))
      tip.classList.toggle('active', wheelie)
    },
    // kind: 'escaped' (the bike is yours), 'busted' (caught), 'lost' (respawned).
    endChase(kind, bike) {
      document.body.classList.remove('chasing', 'chasing-touch')
      drive.classList.remove('show')
      tip.classList.remove('show')
      setTouchWheelie(false)
      wheelieBtn.classList.remove('on')
      lines.style.setProperty('--speed', 0)
      if (kind === 'lost') return
      result.className = `chase-result ${kind}`
      result.innerHTML = kind === 'escaped' ? `<div class="card">${BIKE}<b>STOLEN!</b></div><div class="sub">Place the ${bike.name} in your base or sell it for $${money(bike.value)}</div>` : `<div class="card">${BIKE}<b>BUSTED!</b></div><div class="sub">The police took the ${bike.name} back</div>`
      void result.offsetWidth
      result.classList.add('show')
      clearTimeout(resultTimer)
      resultTimer = setTimeout(() => result.classList.remove('show'), 2600)
    },
  }
}
