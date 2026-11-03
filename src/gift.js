import { DEV_MODE, GIFT } from './config.js'
import { createPrompt } from './shopwin.js'
import { canShowRewarded, sdk, showRewarded } from './bloxity.js'
import { claimAdReward, giftReadyIn, startGiftCooldown } from './net.js'
import { sfx } from './audio.js'

// The FREE GIFT! chest in the hub (market.js): stand on its glowing disc and hold E (hold the
// prompt on touch) to watch a Bloxity rewarded ad; a finished ad pays GIFT.speed speed. The game
// server checks the ad's token with Bloxity before anything is paid (backend adReward.ts), and the
// gift then waits GIFT.cooldown (the server's clock decides). Bloxity draws the ad itself.
// Local dev without the SDK (VITE_DEV_MODE) has no ads: the gift is paid at once so it can be tried.

const mmss = (ms) => {
  const t = Math.ceil(ms / 1000)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export function createGift({ hud, camera }) {
  let busy = false
  // The prompt helper opens a window; the chest has none: its hold always runs `alt` instead.
  const win = { isOpen: false, onClose: null, open() {}, close() {} }

  function grant() {
    hud.addSpeed(GIFT.speed, { x: window.innerWidth / 2, y: window.innerHeight * 0.45 }, GIFT.icons)
    hud.say(`Free Gift: +${GIFT.speed} Speed!`)
    sfx('upgrade')
  }

  async function claim() {
    if (DEV_MODE && !sdk()) {
      startGiftCooldown(GIFT.cooldown * 1000)
      return grant()
    }
    if (!canShowRewarded()) return hud.say('No ad available right now, try again later')
    busy = true
    try {
      const r = await showRewarded(GIFT.placement)
      if (r?.status !== 'completed') {
        hud.say(r?.status === 'skipped' ? 'Watch the whole ad to get the gift' : 'No ad right now, try again later')
        return
      }
      const answer = await claimAdReward(r.rewardToken)
      if (answer?.ok) grant()
      else if (answer?.reason === 'cooldown') hud.say(`Your next gift is ready in ${mmss(giftReadyIn())}`)
      else hud.say(answer ? 'The ad could not be confirmed' : 'Not connected: try again in a moment')
    } finally {
      busy = false
    }
  }

  return createPrompt(hud, camera, {
    stall: GIFT,
    object: 'Free Gift',
    win,
    alt() {
      if (busy) return { object: 'Free Gift', action: 'Watching ad...', run() {} }
      const ms = giftReadyIn()
      if (ms > 0) return { object: 'Free Gift', action: `Ready in ${mmss(ms)}`, run: () => hud.say(`Your next gift is ready in ${mmss(giftReadyIn())}`) }
      return { object: 'Free Gift', action: `Watch Ad: +${GIFT.speed} Speed`, run: claim }
    },
  })
}
