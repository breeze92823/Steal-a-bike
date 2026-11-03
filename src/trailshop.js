import './trailshop.css'
import { STALLS, TRAILS } from './config.js'
import { createPrompt, createWindow, el, ICON, short } from './shopwin.js'
import { registerStore } from './stores.js'

// The Trail Shop. Stand in the glowing pool by the TRAILS stall and hold E at
// the prompt (shopwin.js): the 12 trails in a sideways-scrolling row, each with
// its art, speed multiplier and price. Cash buys (and equips) a trail; an owned
// trail is equipped or unequipped from its card. Gem prices answer with a toast
// until purchases exist. Nothing is saved yet.

const owned = new Set()
let equipped = null // a TRAILS entry

export const equippedTrail = () => equipped
let redrawTrails = () => {}

registerStore({
  snapshot: () => ({ trails: [...owned], trail: equipped?.id ?? '' }),
  hydrate(doc) {
    if (!Array.isArray(doc.trails)) return
    owned.clear()
    for (const id of doc.trails) if (TRAILS.some((t) => t.id === id)) owned.add(id)
    equipped = TRAILS.find((t) => t.id === doc.trail && owned.has(t.id)) ?? null
    redrawTrails()
  },
})
// The equipped trail's speed multiplier (1 with none), for whatever grows the speed counter.
export const trailMultiplier = () => equipped?.mult ?? 1

// --- Card art: a blocky runner leaning into a flowing ribbon in the trail's colours ---
function stops(colors) {
  return colors.map((c, i) => `<stop offset="${colors.length > 1 ? i / (colors.length - 1) : 0}" stop-color="${c}"/>`).join('')
}

function limb(id, x, y, w, h, rot, edge) {
  const cx = x + w / 2
  const cy = y + 10
  return `<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="13" fill="url(#bd-${id})" stroke="${edge}" stroke-width="3"/><rect x="${x + 6}" y="${y + 7}" width="${w * 0.32}" height="${h - 16}" rx="7" fill="#fff" opacity="0.32"/></g>`
}

function trailArt(t) {
  const id = t.id
  const edge = t.body[t.body.length - 1]
  const ribbonEdge = t.angel ? '#e0b43a' : t.ribbon[t.ribbon.length - 1]
  // Rainbow bands run along the ribbon (top to bottom); the others shade along it.
  const rg = t.rainbow ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="1" y1="0" x2="0" y2="0.4"'
  const ribbon = `<path d="M176 112C128 92 66 108 12 146c12 38 14 76 6 118 46-28 98-44 152-52z" fill="url(#rb-${id})" stroke="${ribbonEdge}" stroke-width="${t.angel ? 5 : 3}" stroke-linejoin="round"/>
    <path d="M160 122c-40-6-86 12-124 40M156 170c-42 2-86 18-122 44" fill="none" stroke="${t.rainbow ? '#fff' : ribbonEdge}" stroke-width="5" stroke-linecap="round" opacity="${t.rainbow ? 0.35 : 0.3}"/>
    <path d="M150 112c-36-8-80 4-118 30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.45"/>`
  const stars = t.stars
    ? [[40, 170, 3], [70, 150, 2.4], [96, 190, 3.4], [58, 222, 2.2], [120, 160, 2], [30, 240, 2.8], [130, 196, 2.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('')
    : ''
  const wings = t.angel
    ? `<g fill="#fff" stroke="#c9a23a" stroke-width="3" stroke-linejoin="round">
        <path d="M176 104c-18-30-14-62 4-84 6 14 4 22 0 30 10-12 22-16 34-14-8 8-12 14-14 22 10-6 22-6 32-2-14 6-22 14-28 26 8-2 16 0 22 4-18 6-32 14-50 18z"/>
        <path d="M236 108c20-26 38-34 60-34-6 10-12 14-20 18 12 0 22 4 30 12-10 2-18 4-26 8 10 4 16 10 20 18-14-4-24-4-34 0 6 6 8 12 8 18-14-10-26-16-38-20z"/></g>`
    : ''
  const halo = t.angel ? '<ellipse cx="203" cy="28" rx="30" ry="9" fill="none" stroke="#ffd34a" stroke-width="7"/><ellipse cx="203" cy="28" rx="30" ry="9" fill="none" stroke="#fff6c8" stroke-width="2"/>' : ''
  return `<svg class="art" viewBox="0 0 300 290" aria-hidden="true">
    <defs>
      <linearGradient id="rb-${id}" ${rg}>${stops(t.ribbon)}</linearGradient>
      <linearGradient id="bd-${id}" x1="0" y1="0" x2="1" y2="1">${stops(t.body)}</linearGradient>
    </defs>
    ${wings}
    ${limb(id, 150, 190, 42, 88, 38, edge)}
    ${limb(id, 130, 116, 38, 82, 58, edge)}
    ${ribbon}${stars}
    ${limb(id, 152, 104, 72, 96, -18, edge)}
    <g transform="rotate(-12 200 69)"><rect x="172" y="40" width="56" height="58" rx="16" fill="url(#bd-${id})" stroke="${edge}" stroke-width="3"/><rect x="179" y="47" width="18" height="40" rx="8" fill="#fff" opacity="0.35"/></g>
    ${limb(id, 192, 186, 42, 90, -28, edge)}
    ${limb(id, 210, 112, 38, 82, -62, edge)}
    ${halo}
  </svg>`
}

// --- The shop -------------------------------------------------------------------------------
// hud: the HUD (say, spend, button, mount); camera: to float the prompt over the stall.
export function createTrailShop({ hud, camera }) {
  const win = createWindow(hud, { title: 'Trail Shop', banner: { text: 'TRAILS', tone: 'blue' }, cls: 'ts' })
  const row = el('div', 'ts-row')
  win.body.append(row)

  // Wheel scrolls the row sideways; the world never sees it (input.js only zooms on the canvas).
  row.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      row.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
    },
    { passive: false },
  )

  const cards = TRAILS.map((t) => {
    const card = el('div', `ts-card ts-${t.id}`)
    card.style.setProperty('--bg', `linear-gradient(${t.rainbow ? '135deg' : '180deg'}, ${t.bg.join(', ')})`)
    const name = el('div', 'nm ot')
    name.textContent = t.name
    const spd = el('div', 'spd ot', `<b>x${t.mult}</b> Speed`)
    const btns = el('div', 'btns')
    card.append(name, el('div', 'pic', trailArt(t)), spd, btns)
    row.append(card)
    return { t, card, btns }
  })

  function shake(b) {
    b.classList.remove('sw-no')
    void b.offsetWidth // restart the animation
    b.classList.add('sw-no')
  }

  function buy(t, b) {
    if (!hud.spend(t.cash)) {
      shake(b)
      hud.say('Not enough cash!')
      return
    }
    owned.add(t.id)
    equipped = t
    hud.say(`Bought ${t.name}!`)
    render()
  }

  function render() {
    for (const { t, btns } of cards) {
      btns.innerHTML = ''
      if (owned.has(t.id)) {
        const on = equipped === t
        btns.append(
          hud.button(`ts-btn ${on ? 'sw-grey' : 'sw-green'}`, `<span class="ot">${on ? 'Equipped' : 'Equip'}</span>`, () => {
            equipped = on ? null : t
            hud.say(on ? `${t.name} unequipped` : `${t.name} equipped!`)
            render()
          }),
        )
        continue
      }
      const cash = hud.button('ts-btn sw-green', `<span class="ot">${short(t.cash)}</span>`, () => buy(t, cash))
      btns.append(cash)
      if (t.gems != null) btns.append(hud.button('ts-btn ts-gems', `${ICON.gem}<span class="ot">${t.gems}</span>`, () => hud.say('◎ purchases coming soon')))
    }
  }
  redrawTrails = render
  render()
  win.onOpen = () => {
    row.scrollLeft = 0
    render()
  }

  const prompt = createPrompt(hud, camera, { stall: STALLS.trails, object: 'Trail Shop', win })
  return {
    get open() {
      return win.isOpen
    },
    close: win.close,
    update: prompt.update,
  }
}
