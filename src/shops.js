import { createTrailShop } from './trailshop.js'
import { createSellShop } from './sellshop.js'
import { createFuse } from './fuse.js'
import { createDaily } from './daily.js'
import { createBikeIndex } from './bikeindex.js'
import { createExclusive } from './exclusive.js'
import { createGift } from './gift.js'

// Every shop window: the three stall windows (Trail Shop, Sell Bikes,
// Fuse Machine, each with its hold-E prompt) and the two HUD windows (Daily
// Rewards, Bike Index). update(dt) runs the stall prompts.
export function createShops({ hud, camera, give }) {
  const prompts = [createTrailShop({ hud, camera }), createSellShop({ hud, camera }), createFuse({ hud, camera }), createGift({ hud, camera }), createExclusive({ hud, camera, give })]
  createDaily({ hud })
  createBikeIndex({ hud })
  return {
    update(dt) {
      for (const p of prompts) p.update(dt)
    },
  }
}
