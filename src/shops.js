import { createTrailShop } from './trailshop.js'
import { createSellShop } from './sellshop.js'
import { createHalloweenShop } from './halloween.js'
import { createFuse } from './fuse.js'
import { createDaily } from './daily.js'
import { createBikeIndex } from './bikeindex.js'

// Every shop window: the four stall windows (Trail Shop, Sell Bikes,
// Halloween Shop, Fuse Machine, each with its hold-E prompt) and the two HUD windows (Daily
// Rewards, Bike Index). update(dt) runs the stall prompts.
export function createShops({ hud, camera }) {
  const prompts = [createTrailShop({ hud, camera }), createSellShop({ hud, camera }), createHalloweenShop({ hud, camera }), createFuse({ hud, camera })]
  createDaily({ hud })
  createBikeIndex({ hud })
  return {
    update(dt) {
      for (const p of prompts) p.update(dt)
    },
  }
}
