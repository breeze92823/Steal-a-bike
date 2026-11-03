import { TIMERS } from './config.js'

// The lobby's repeating countdowns, shared by the HUD and the signs in the world:
// the Halloween event (open for a while, then closed until the next one) and the
// race that starts every few minutes. Both run from page load for now; the
// server will own them once multiplayer is back.
const t0 = performance.now()
const now = () => (performance.now() - t0) / 1000

// { open, left } for the Halloween event; `left` counts to closing while open, else to opening.
export function eventStatus() {
  const { open, closed, startLeft } = TIMERS.event
  const cycle = open + closed
  const p = (now() + (open - startLeft)) % cycle
  return p < open ? { open: true, left: open - p } : { open: false, left: cycle - p }
}

// Seconds to the next race start, and whether one is starting right now.
export function raceStatus() {
  const { every, startLeft, nowFor } = TIMERS.race
  const p = (now() + (every - startLeft)) % every
  const left = every - p
  return { now: p < nowFor, left }
}

export function mmss(s) {
  const t = Math.max(0, Math.floor(s))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
