import './windows.css'
import { createWindow, el, ICON, short } from './shopwin.js'
import { onOfflineEarnings } from './net.js'

// "Welcome back!": opens once after a load that paid offline earnings (the server already added
// the cash; net.js tells us how much and for how long you were away).

const away = (s) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return m ? `${h}h ${m}m` : `${h}h`
  return `${Math.max(1, m)}m`
}

export function createWelcome({ hud }) {
  const win = createWindow(hud, { title: 'Welcome back!', icon: ICON.cash, cls: 'wb' })
  const lead = el('div', 'wb-lead ot')
  const amount = el('div', 'wb-amount ot')
  const note = el('div', 'wb-note ot')
  const ok = hud.button('wb-ok', '<span class="ot">Collect</span>', () => win.close())
  win.body.append(lead, el('div', 'wb-pic', ICON.cash), amount, note, ok)

  onOfflineEarnings(({ cash, seconds }) => {
    lead.textContent = `Your bikes earned while you were away (${away(seconds)})`
    amount.textContent = `+${short(cash)}`
    note.textContent = 'Added to your cash!'
    win.open()
  })
  return win
}
