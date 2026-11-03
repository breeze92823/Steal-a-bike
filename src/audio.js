import { AUDIO } from './config.js'

// Procedural sound, no audio files: everything is synthesised with WebAudio
// from noise and oscillators.
//  - Ambience beds (wind, birds, insects, waves, lava, rain + thunder, choir,
//    space drones, ...): the lane's zones each name one, and setBed crossfades.
//  - Sleeping guards snore: one voice whose loudness follows the nearest guard.
//  - Waterfalls roar near the ones registered with addWaterfall.
// The context starts on the first tap / key (browsers require a gesture);
// M or the HUD speaker button mutes, remembered per browser.
let ctx = null
let master = null
let bedBus = null
let muted = false
try {
  muted = localStorage.getItem('sab-muted') === '1'
} catch {}
const noise = {}
const beds = new Map() // name -> { gain, level, target, stop(), tick(dt) }
let wanted = null
const snores = [] // [x, y, z]
const falls = [] // [x, y, z, range]
let snoreVoice = null
let fallVoice = null
let thunderFns = []

// --- Building blocks ---------------------------------------------------------------------
function makeNoise(kind, seconds = 4) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') d[i] = w * 0.5
    else if (kind === 'pink') {
      b0 = 0.997 * b0 + w * 0.029591
      b1 = 0.985 * b1 + w * 0.032534
      b2 = 0.95 * b2 + w * 0.048056
      d[i] = (b0 + b1 + b2 + w * 0.05) * 1.6
    } else {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
  }
  return buf
}
function src(kind) {
  const s = ctx.createBufferSource()
  s.buffer = noise[kind]
  s.loop = true
  s.loopStart = Math.random() * 2
  s.start(0, Math.random() * 3)
  return s
}
function filt(type, freq, Q = 1) {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = Q
  return f
}
function amp(v) {
  const g = ctx.createGain()
  g.gain.value = v
  return g
}
// A slow LFO wobbling `param` by +-depth around its value.
function lfo(param, rate, depth, nodes) {
  const o = ctx.createOscillator()
  o.frequency.value = rate
  const g = amp(depth)
  o.connect(g).connect(param)
  o.start()
  nodes.push(o)
}
// Continuous filtered noise into `out`.
function noiseLayer(out, nodes, kind, type, freq, Q, vol, wobble = 0, wobbleRate = 0.1) {
  const s = src(kind)
  const f = filt(type, freq, Q)
  const g = amp(vol)
  s.connect(f).connect(g).connect(out)
  if (wobble) lfo(g.gain, wobbleRate * (0.7 + Math.random() * 0.6), vol * wobble, nodes)
  nodes.push(s)
  return { f, g }
}
function drone(out, nodes, type, freq, vol, cutoff = 2000) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  const f = filt('lowpass', cutoff, 0.7)
  const g = amp(vol)
  o.connect(f).connect(g).connect(out)
  o.start()
  nodes.push(o)
  return { o, g, f }
}
// One-shot voices (they stop themselves).
function chirp(out, f0, f1, dur, vol, type = 'sine', at = 0) {
  const t = ctx.currentTime + at
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  const g = amp(0)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.05)
}
function burst(out, kind, type, freq, Q, dur, vol, at = 0, attack = 0.005) {
  const t = ctx.currentTime + at
  const s = ctx.createBufferSource()
  s.buffer = noise[kind]
  const f = filt(type, freq, Q)
  const g = amp(0)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f).connect(g).connect(out)
  s.start(t, Math.random() * 2)
  s.stop(t + dur + 0.05)
}
function bell(out, f, dur, vol, at = 0) {
  for (const [m, v] of [[1, 1], [2.76, 0.4], [5.4, 0.18], [8.93, 0.08]]) chirp(out, f * m, f * m * 0.998, dur / m ** 0.3, vol * v, 'sine', at)
}
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]
const note = (base, semis) => base * 2 ** (semis / 12)

// Random events: `rate` per second while the bed is audible.
function every(rate, fn) {
  return (dt) => {
    if (Math.random() < rate * dt) fn()
  }
}

// --- Beds ------------------------------------------------------------------------------------
function birdSong(out) {
  const base = rnd(2200, 4200)
  const n = 2 + Math.floor(Math.random() * 5)
  for (let i = 0; i < n; i++) chirp(out, base * rnd(0.9, 1.25), base * rnd(0.6, 1.4), rnd(0.05, 0.14), rnd(0.03, 0.06), 'sine', i * rnd(0.08, 0.16))
}
function owl(out) {
  chirp(out, 420, 380, 0.45, 0.09, 'sine')
  chirp(out, 400, 360, 0.6, 0.08, 'sine', 0.6)
}
function cricketChorus(out, nodes, freq = 4600, vol = 0.03) {
  const o = ctx.createOscillator()
  o.frequency.value = freq
  const g = amp(0)
  const pulse = ctx.createOscillator()
  pulse.type = 'square'
  pulse.frequency.value = 28
  const pg = amp(vol)
  pulse.connect(pg).connect(g.gain)
  const slow = ctx.createOscillator()
  slow.type = 'square'
  slow.frequency.value = 1.4
  const sg = amp(vol)
  slow.connect(sg).connect(g.gain)
  o.connect(g).connect(out)
  o.start()
  pulse.start()
  slow.start()
  nodes.push(o, pulse, slow)
}
function frog(out) {
  const f = rnd(110, 190)
  for (let i = 0; i < 2; i++) {
    const t = i * 0.13
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(f, ctx.currentTime + t)
    o.frequency.linearRampToValueAtTime(f * 1.3, ctx.currentTime + t + 0.09)
    const bp = filt('bandpass', 700, 4)
    const g = amp(0)
    g.gain.setValueAtTime(0, ctx.currentTime + t)
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.11)
    o.connect(bp).connect(g).connect(out)
    o.start(ctx.currentTime + t)
    o.stop(ctx.currentTime + t + 0.15)
  }
}
function thunder(out) {
  burst(out, 'brown', 'lowpass', 220, 0.7, rnd(2.5, 4.5), 0.9, 0.15, 0.08)
  burst(out, 'white', 'lowpass', 1200, 0.7, 0.4, 0.25, 0.02, 0.005)
  for (const fn of thunderFns) fn()
}
function choirChord(out, nodes) {
  const chords = [[0, 4, 7, 12], [5, 9, 12, 17], [-3, 0, 4, 9], [7, 11, 14, 19]]
  const voices = []
  for (let i = 0; i < 4; i++) {
    const v = drone(out, nodes, 'sawtooth', 220, 0, 900)
    v.o.detune.value = rnd(-8, 8)
    voices.push(v)
  }
  let k = 0
  const set = () => {
    const c = chords[k++ % chords.length]
    const t = ctx.currentTime
    voices.forEach((v, i) => {
      v.o.frequency.setTargetAtTime(note(196, c[i]), t, 0.8)
      v.g.gain.setTargetAtTime(0.022, t, 1.2)
    })
  }
  set()
  let left = 6
  return (dt) => {
    left -= dt
    if (left <= 0) {
      left = 6
      set()
    }
  }
}
function arp(out, base, pattern, step, vol, type = 'square', cutoff = 1400) {
  let i = 0
  let left = 0
  return (dt) => {
    left -= dt
    if (left > 0) return
    left = step
    const f = note(base, pattern[i++ % pattern.length])
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = f
    const lp = filt('lowpass', cutoff, 2)
    const g = amp(0)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.6)
    o.connect(lp).connect(g).connect(out)
    o.start(t)
    o.stop(t + step * 1.8)
  }
}

// Each bed: (out, nodes) => tick(dt). `nodes` collects what must be stopped.
const BEDS = {
  meadow(out, n) {
    noiseLayer(out, n, 'pink', 'lowpass', 500, 0.7, 0.05, 0.5)
    return every(0.45, () => birdSong(out))
  },
  jungle(out, n) {
    noiseLayer(out, n, 'pink', 'bandpass', 2200, 0.8, 0.03, 0.4)
    cricketChorus(out, n, 6800, 0.012)
    const birds = every(0.7, () => (Math.random() < 0.5 ? birdSong(out) : chirp(out, rnd(500, 700), rnd(1200, 1600), 0.35, 0.05, 'triangle')))
    return birds
  },
  festival(out, n) {
    noiseLayer(out, n, 'pink', 'lowpass', 600, 0.7, 0.03, 0.3)
    const beat = arp(out, 55, [0, 0, 7, 0, 0, 0, 5, 3], 0.25, 0.09, 'sine', 300)
    const lead = arp(out, 440, [0, 4, 7, 12, 7, 4, 2, 4], 0.25, 0.012, 'square', 1800)
    const birds = every(0.3, () => birdSong(out))
    return (dt) => {
      beat(dt)
      lead(dt)
      birds(dt)
    }
  },
  wind(out, n) {
    const w = noiseLayer(out, n, 'pink', 'bandpass', 420, 0.6, 0.12, 0.6, 0.08)
    lfo(w.f.frequency, 0.05, 160, n)
    return every(0.15, () => birdSong(out))
  },
  desert(out, n) {
    const w = noiseLayer(out, n, 'pink', 'bandpass', 380, 0.6, 0.1, 0.6, 0.07)
    lfo(w.f.frequency, 0.04, 140, n)
    noiseLayer(out, n, 'white', 'highpass', 5200, 0.7, 0.012, 0.8, 0.12)
    return every(0.05, () => chirp(out, 1600, 900, 0.5, 0.03, 'sine'))
  },
  water(out, n) {
    noiseLayer(out, n, 'white', 'bandpass', 1500, 0.5, 0.05, 0.3, 0.6)
    noiseLayer(out, n, 'pink', 'lowpass', 400, 0.7, 0.05)
    return every(0.4, () => birdSong(out))
  },
  waves(out, n) {
    noiseLayer(out, n, 'brown', 'lowpass', 700, 0.7, 0.25, 0.85, 0.11)
    noiseLayer(out, n, 'white', 'highpass', 3000, 0.7, 0.012, 0.9, 0.11)
    return every(0.25, () => chirp(out, rnd(1600, 2000), rnd(1000, 1200), 0.3, 0.04, 'sawtooth'))
  },
  underwater(out, n) {
    noiseLayer(out, n, 'brown', 'lowpass', 260, 0.7, 0.35, 0.3, 0.07)
    drone(out, n, 'sine', 48, 0.04)
    return every(2.2, () => chirp(out, rnd(250, 400), rnd(700, 1100), rnd(0.06, 0.12), 0.05, 'sine'))
  },
  abyss(out, n) {
    noiseLayer(out, n, 'brown', 'lowpass', 180, 0.7, 0.35, 0.3, 0.05)
    drone(out, n, 'sine', 41, 0.06)
    drone(out, n, 'sine', 61.7, 0.03)
    return every(0.25, () => chirp(out, rnd(180, 260), rnd(120, 160), 2.5, 0.03, 'sine'))
  },
  cave(out, n) {
    drone(out, n, 'sine', 55, 0.04)
    noiseLayer(out, n, 'brown', 'lowpass', 200, 0.7, 0.08, 0.3)
    return every(1.2, () => chirp(out, rnd(1100, 1700), rnd(500, 700), 0.15, 0.06, 'sine'))
  },
  crystal(out, n) {
    drone(out, n, 'sine', 110, 0.02)
    noiseLayer(out, n, 'brown', 'lowpass', 200, 0.7, 0.05, 0.3)
    return every(0.9, () => bell(out, note(880, pick(PENTA)), 2.4, 0.03))
  },
  mine(out, n) {
    drone(out, n, 'sine', 50, 0.04)
    noiseLayer(out, n, 'brown', 'lowpass', 200, 0.7, 0.07, 0.3)
    const pick1 = every(0.5, () => {
      burst(out, 'white', 'bandpass', 2400, 3, 0.12, 0.12)
      chirp(out, 1800, 1500, 0.25, 0.04, 'triangle')
    })
    const drip = every(0.8, () => chirp(out, rnd(1100, 1700), rnd(500, 700), 0.15, 0.05, 'sine'))
    return (dt) => {
      pick1(dt)
      drip(dt)
    }
  },
  lava(out, n) {
    noiseLayer(out, n, 'brown', 'lowpass', 120, 0.7, 0.45, 0.4, 0.2)
    return every(14, () => burst(out, 'white', 'highpass', rnd(1500, 4000), 0.7, rnd(0.01, 0.04), rnd(0.05, 0.15)))
  },
  forge(out, n) {
    noiseLayer(out, n, 'brown', 'lowpass', 140, 0.7, 0.3, 0.3, 0.2)
    const crack = every(6, () => burst(out, 'white', 'highpass', 2500, 0.7, 0.02, 0.08))
    const clang = every(0.45, () => {
      for (const f of [820, 1270, 2130, 3010]) chirp(out, f, f * 0.997, 1.4, 0.035, 'sine')
    })
    return (dt) => {
      crack(dt)
      clang(dt)
    }
  },
  blizzard(out, n) {
    const w = noiseLayer(out, n, 'pink', 'bandpass', 700, 0.7, 0.18, 0.7, 0.13)
    lfo(w.f.frequency, 0.07, 300, n)
    const whistle = drone(out, n, 'sine', 920, 0.008)
    lfo(whistle.o.frequency, 0.3, 60, n)
    return () => {}
  },
  aurora(out, n) {
    noiseLayer(out, n, 'pink', 'bandpass', 500, 0.7, 0.05, 0.5, 0.06)
    drone(out, n, 'sine', 220, 0.012)
    drone(out, n, 'sine', 330.5, 0.008)
    return every(0.5, () => bell(out, note(1320, pick(PENTA)), 3, 0.015))
  },
  night(out, n) {
    cricketChorus(out, n, 4600, 0.025)
    noiseLayer(out, n, 'pink', 'lowpass', 400, 0.7, 0.03, 0.5)
    return every(0.08, () => owl(out))
  },
  spooky(out, n) {
    drone(out, n, 'sawtooth', 55, 0.02, 300)
    drone(out, n, 'sawtooth', 55.7, 0.02, 300)
    const w = noiseLayer(out, n, 'pink', 'bandpass', 500, 0.8, 0.06, 0.8, 0.09)
    lfo(w.f.frequency, 0.06, 200, n)
    const o = every(0.1, () => owl(out))
    const creak = every(0.06, () => chirp(out, rnd(200, 300), rnd(120, 160), 1.2, 0.03, 'sawtooth'))
    return (dt) => {
      o(dt)
      creak(dt)
    }
  },
  swamp(out, n) {
    cricketChorus(out, n, 5600, 0.015)
    noiseLayer(out, n, 'pink', 'lowpass', 300, 0.7, 0.04, 0.4)
    return every(0.9, () => frog(out))
  },
  candy(out, n) {
    noiseLayer(out, n, 'pink', 'lowpass', 500, 0.7, 0.02, 0.3)
    let i = 3
    let left = 0
    return (dt) => {
      left -= dt
      if (left > 0) return
      left = 0.36
      i = Math.max(0, Math.min(PENTA.length - 1, i + Math.floor(rnd(-2, 3))))
      bell(out, note(784, PENTA[i]), 1.2, 0.03)
    }
  },
  toys(out, n) {
    noiseLayer(out, n, 'pink', 'lowpass', 500, 0.7, 0.02, 0.3)
    const tick = arp(out, 2400, [0, 5], 0.5, 0.015, 'triangle', 4000)
    const marimba = every(1.4, () => chirp(out, note(523, pick(PENTA)), note(523, 0) * 0.99, 0.35, 0.05, 'sine'))
    return (dt) => {
      tick(dt)
      marimba(dt)
    }
  },
  city(out, n) {
    noiseLayer(out, n, 'white', 'bandpass', 3000, 0.4, 0.05, 0.3)
    drone(out, n, 'sawtooth', 60, 0.015, 200)
    noiseLayer(out, n, 'brown', 'lowpass', 160, 0.7, 0.1)
    return every(0.05, () => {
      const o = ctx.createOscillator()
      const g = amp(0)
      const t = ctx.currentTime
      o.frequency.setValueAtTime(700, t)
      for (let k = 0; k < 6; k++) o.frequency.linearRampToValueAtTime(k % 2 ? 700 : 1050, t + 0.5 * (k + 1))
      g.gain.linearRampToValueAtTime(0.012, t + 0.6)
      g.gain.linearRampToValueAtTime(0, t + 3)
      o.connect(g).connect(out)
      o.start(t)
      o.stop(t + 3.1)
    })
  },
  cyber(out, n) {
    drone(out, n, 'sawtooth', 41.2, 0.03, 180)
    const a = arp(out, 220, [0, 3, 7, 10, 12, 10, 7, 3], 0.16, 0.025, 'square', 1600)
    const b = arp(out, 55, [0, 0, 0, 0, -2, -2, 3, 3], 0.32, 0.06, 'sawtooth', 400)
    return (dt) => {
      a(dt)
      b(dt)
    }
  },
  factory(out, n) {
    drone(out, n, 'sawtooth', 50, 0.02, 160)
    const thump = arp(out, 60, [0], 0.8, 0.12, 'sine', 300)
    const hiss = every(0.3, () => burst(out, 'white', 'highpass', 4000, 0.7, rnd(0.5, 1.2), 0.05, 0, 0.05))
    const click = every(3, () => burst(out, 'white', 'bandpass', 3000, 5, 0.02, 0.06))
    return (dt) => {
      thump(dt)
      hiss(dt)
      click(dt)
    }
  },
  steam(out, n) {
    noiseLayer(out, n, 'brown', 'lowpass', 300, 0.7, 0.08, 0.3)
    const hiss = every(0.35, () => burst(out, 'white', 'highpass', 3500, 0.7, rnd(0.6, 1.4), 0.06, 0, 0.08))
    const horn = every(0.04, () => chirp(out, 146, 140, 1.8, 0.05, 'sawtooth'))
    const tick = arp(out, 3000, [0, 0], 0.5, 0.01, 'triangle', 5000)
    return (dt) => {
      hiss(dt)
      horn(dt)
      tick(dt)
    }
  },
  storm(out, n) {
    noiseLayer(out, n, 'white', 'bandpass', 2500, 0.4, 0.09, 0.2)
    noiseLayer(out, n, 'pink', 'lowpass', 500, 0.7, 0.08, 0.5, 0.1)
    return every(0.11, () => thunder(out))
  },
  heaven(out, n) {
    const chord = choirChord(out, n)
    const chime = every(0.6, () => bell(out, note(1047, pick(PENTA)), 2.6, 0.018))
    return (dt) => {
      chord(dt)
      chime(dt)
    }
  },
  temple(out, n) {
    noiseLayer(out, n, 'pink', 'bandpass', 420, 0.6, 0.06, 0.5, 0.06)
    const gong = every(0.07, () => bell(out, 98, 6, 0.08))
    const chime = every(0.3, () => bell(out, note(660, pick(PENTA)), 2, 0.015))
    return (dt) => {
      gong(dt)
      chime(dt)
    }
  },
  space(out, n) {
    const a = drone(out, n, 'sine', 40, 0.06)
    drone(out, n, 'sine', 60.5, 0.035)
    drone(out, n, 'triangle', 80.3, 0.015)
    lfo(a.g.gain, 0.05, 0.03, n)
    return every(0.7, () => chirp(out, rnd(2000, 4000), rnd(3000, 6000), 1.2, 0.008, 'sine'))
  },
  gold(out, n) {
    const chord = choirChord(out, n)
    const sparkle = every(1.2, () => bell(out, note(1568, pick(PENTA)), 1.6, 0.015))
    return (dt) => {
      chord(dt)
      sparkle(dt)
    }
  },
}

// --- Positional voices -----------------------------------------------------------------------
function makeSnore() {
  const g = amp(0)
  g.connect(master)
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  o.frequency.value = 62
  const lp = filt('lowpass', 420, 2)
  const breath = amp(0)
  o.connect(lp).connect(breath).connect(g)
  const s = src('pink')
  const bp = filt('bandpass', 520, 1.5)
  const nb = amp(0)
  s.connect(bp).connect(nb).connect(g)
  o.start()
  let phase = 0
  return {
    g,
    tick(dt) {
      phase += dt
      if (phase < 3.4) return
      phase = 0
      const t = ctx.currentTime
      // In: a rough low snore. Out: a soft whistle of breath.
      breath.gain.cancelScheduledValues(t)
      breath.gain.setValueAtTime(0, t)
      breath.gain.linearRampToValueAtTime(0.5, t + 0.7)
      breath.gain.linearRampToValueAtTime(0, t + 1.5)
      o.frequency.setValueAtTime(58, t)
      o.frequency.linearRampToValueAtTime(70, t + 1.4)
      nb.gain.cancelScheduledValues(t)
      nb.gain.setValueAtTime(0, t + 1.6)
      nb.gain.linearRampToValueAtTime(0.25, t + 2.0)
      nb.gain.linearRampToValueAtTime(0, t + 3.0)
    },
  }
}
function makeFall() {
  const g = amp(0)
  g.connect(master)
  const s = src('white')
  const bp = filt('bandpass', 900, 0.4)
  s.connect(bp).connect(g)
  const b = src('brown')
  const lp = filt('lowpass', 300, 0.7)
  b.connect(lp).connect(g)
  return { g }
}

// --- Public API ------------------------------------------------------------------------------
function start() {
  if (ctx) {
    ctx.resume?.()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  try {
    ctx = new AC()
  } catch {
    return
  }
  noise.white = makeNoise('white')
  noise.pink = makeNoise('pink')
  noise.brown = makeNoise('brown')
  master = amp(muted ? 0 : AUDIO.volume)
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp).connect(ctx.destination)
  bedBus = amp(AUDIO.bedVolume)
  bedBus.connect(master)
  snoreVoice = makeSnore()
  fallVoice = makeFall()
}

export function installAudio() {
  const go = () => start()
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, go, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend?.()
    else ctx.resume?.()
  })
}

export function isMuted() {
  return muted
}
export function setMuted(m) {
  muted = m
  try {
    localStorage.setItem('sab-muted', m ? '1' : '0')
  } catch {}
  if (master) master.gain.setTargetAtTime(m ? 0 : AUDIO.volume, ctx.currentTime, 0.1)
}

// The ambience to fade to (a BEDS name, or null for none).
export function setBed(name) {
  wanted = BEDS[name] ? name : null
}
export function addSnore(x, y, z) {
  snores.push([x, y, z])
}
export function addWaterfall(x, y, z, range = AUDIO.fallRange) {
  falls.push([x, y, z, range])
}
// Thunder claps also call these (zones flash the sky with them).
export function onThunder(fn) {
  thunderFns.push(fn)
}

const nearest = (list, p) => {
  let best = Infinity
  let r = 0
  for (const s of list) {
    const d = Math.hypot(s[0] - p.x, (s[1] - p.y) * 0.5, s[2] - p.z)
    if (d < best) {
      best = d
      r = s[3]
    }
  }
  return [best, r]
}

export function updateAudio(dt, listener) {
  if (!ctx || ctx.state !== 'running') return
  // Beds: the wanted one fades in, the rest fade out and are torn down.
  if (wanted && !beds.has(wanted)) {
    const gain = amp(0)
    gain.connect(bedBus)
    const nodes = []
    const tick = BEDS[wanted](gain, nodes)
    beds.set(wanted, { gain, nodes, tick, level: 0 })
  }
  const fade = dt / AUDIO.crossfade
  for (const [name, b] of beds) {
    const target = name === wanted ? 1 : 0
    b.level = target > b.level ? Math.min(1, b.level + fade) : Math.max(0, b.level - fade)
    b.gain.gain.setTargetAtTime(b.level * b.level, ctx.currentTime, 0.05)
    if (b.level > 0.05) b.tick(dt)
    if (b.level === 0 && target === 0) {
      for (const node of b.nodes) {
        try {
          node.stop()
        } catch {}
      }
      b.gain.disconnect()
      beds.delete(name)
    }
  }
  const [ds] = nearest(snores, listener)
  snoreVoice.g.gain.setTargetAtTime(Math.max(0, 1 - ds / AUDIO.snoreRange) ** 1.5 * 0.5, ctx.currentTime, 0.2)
  snoreVoice.tick(dt)
  const [df, range] = nearest(falls, listener)
  fallVoice.g.gain.setTargetAtTime(Math.max(0, 1 - df / (range || 1)) ** 1.4 * 0.35, ctx.currentTime, 0.2)
}
