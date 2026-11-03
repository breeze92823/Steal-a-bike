import { AUDIO, HEIST } from './config.js'

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
let sfxBus = null
let hum = null // the treadmill voice (makeHum)
let humWanted = 0 // 0 = off, 1 = idle pedalling, up to ~1.6 on a wheelie

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

// The treadmill while you train: motor whine, belt hiss and a chain tick that
// follows the pedals. `level` (0..~1.6) sets loudness and pitch.
function makeHum() {
  const g = amp(0)
  g.connect(sfxBus)
  const motor = ctx.createOscillator()
  motor.type = 'sawtooth'
  motor.frequency.value = 92
  const mf = filt('lowpass', 420, 2)
  const mg = amp(0.06)
  motor.connect(mf).connect(mg).connect(g)
  motor.start()
  const hiss = src('pink')
  const hf = filt('bandpass', 1800, 0.8)
  const hg = amp(0.08)
  hiss.connect(hf).connect(hg).connect(g)
  // Chain/freewheel clicks, rate follows the cadence.
  let next = 0
  let level = 0
  return {
    g,
    set(l) {
      if (Math.abs(l - level) < 0.01) return
      level = l
      const t = ctx.currentTime
      g.gain.setTargetAtTime(Math.min(1, l) * 0.55, t, 0.12)
      motor.frequency.setTargetAtTime(80 + l * 70, t, 0.2)
      mf.frequency.setTargetAtTime(300 + l * 500, t, 0.2)
      hf.frequency.setTargetAtTime(1400 + l * 1400, t, 0.2)
    },
    tick(dt) {
      if (level < 0.05) return
      next -= dt
      if (next > 0) return
      next = 0.11 / Math.max(0.5, level)
      burst(g, 'white', 'highpass', 5200, 1, 0.025, 0.05 + Math.random() * 0.03)
    },
  }
}

// --- The chase (heist.js writes `chase` every frame) ------------------------------------------
// Siren: a horn-speaker tone (saw + square, driven into soft clipping, through
// the speaker's resonances) sweeping wail and yelp cycles; louder and brighter
// as it closes in, pitched by doppler. The police engine, your bike (tyres,
// wind, freewheel ticks or a little motor), a tense drum-and-bass loop, and
// one-shots: steal, the "!", radio chatter, whoop chirp, crash, busted, escape.
export const chase = {
  siren: false,
  engine: null, // the chasing guard's voice (ENGINES: bike, car, truck, monster, tank, heli, fan, ufo, hover)
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vz: 0,
  engineSpeed: 0, // m/s the chasing guard is doing
  engineTop: 20, // m/s his top speed (the gearbox spreads its gears over it)
  throttle: 0, // 0..1 his foot on the gas (engine load)
  braking: false,
  skid: 0, // 0..1 his tyres sliding (squeal)
  lvx: 0,
  lvz: 0,
  ride: null, // 'pedal' | 'motor' while you ride (a stolen bike, or yours on Ride My Bike)
  rideSpeed: 0, // 0..1 of your top speed
  rideMps: 0, // m/s
  pedal: 0, // 0..1 pedalling / on the throttle
  brake: 0, // 0..1 braking
  lean: 0, // rad leaned over in a turn (tyre scrub)
  grounded: true,
  rev: 0,
  music: false,
}
let sirenVoice = null
let engineVoice = null
let rideVoice = null
let skidVoice = null
let musicVoice = null
const SOUND_SPEED = 220 // a slower "speed of sound" so the doppler is easy to hear

function softClip(k) {
  const n = 1024
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    c[i] = Math.tanh(k * x) / Math.tanh(k)
  }
  return c
}
// Gain and a doppler ratio for a source at (x, y, z) moving (vx, vz), heard at `l` moving (lvx, lvz).
function heard(l, range) {
  const dx = l.x - chase.x
  const dy = (l.y - chase.y) * 0.5
  const dz = l.z - chase.z
  const d = Math.hypot(dx, dy, dz) || 1
  const ux = dx / d
  const uz = dz / d
  const toward = chase.vx * ux + chase.vz * uz // source closing in
  const away = chase.lvx * ux + chase.lvz * uz // listener running off
  const ratio = (SOUND_SPEED - away) / Math.max(40, SOUND_SPEED - toward)
  return [d, Math.max(0, 1 - d / range), ratio]
}

function makeSiren() {
  const out = amp(0)
  const muffle = filt('lowpass', 6000, 0.6)
  out.connect(muffle).connect(master)
  const o1 = ctx.createOscillator()
  o1.type = 'sawtooth'
  const o2 = ctx.createOscillator()
  o2.type = 'square'
  const mix = amp(0.5)
  const g2 = amp(0.35)
  o1.connect(mix)
  o2.connect(g2).connect(mix)
  const shaper = ctx.createWaveShaper()
  shaper.curve = softClip(2.6)
  const horn = filt('bandpass', 1350, 0.75)
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 2900
  peak.gain.value = 7
  mix.connect(shaper).connect(horn).connect(peak).connect(out)
  // A faint second speaker a few cents off (the car's two horns).
  const o3 = ctx.createOscillator()
  o3.type = 'sawtooth'
  o3.detune.value = 9
  const g3 = amp(0.18)
  o3.connect(g3).connect(shaper)
  for (const o of [o1, o2, o3]) {
    o.frequency.value = 650
    o.start()
  }
  const oscs = [o1, o2, o3]
  let next = 0
  let step = 0 // position in the pattern
  const PATTERN = ['wail', 'wail', ...Array(12).fill('yelp'), 'wail', ...Array(16).fill('yelp')]
  let level = 0
  return {
    reset() {
      next = 0
      step = 0
    },
    tick(dt, l) {
      const want = chase.siren ? 1 : 0
      level += (want - level) * Math.min(1, dt * (want ? 3 : 1.4))
      const now = ctx.currentTime
      if (level < 0.002) {
        out.gain.setTargetAtTime(0, now, 0.05)
        next = 0
        return
      }
      if (next < now) next = now + 0.02
      while (next < now + 0.35) {
        const kind = PATTERN[step++ % PATTERN.length]
        for (const o of oscs) {
          const f = o.frequency
          if (kind === 'wail') {
            f.setValueAtTime(640, next)
            f.exponentialRampToValueAtTime(1480, next + 1.6)
            f.exponentialRampToValueAtTime(640, next + 3.5)
          } else {
            f.setValueAtTime(700, next)
            f.exponentialRampToValueAtTime(1560, next + 0.16)
            f.exponentialRampToValueAtTime(700, next + 0.33)
          }
        }
        next += kind === 'wail' ? 3.5 : 0.33
      }
      const [d, near, ratio] = heard(l, HEIST.siren.range)
      out.gain.setTargetAtTime(level * near ** 1.25 * HEIST.siren.volume, now, 0.08)
      muffle.frequency.setTargetAtTime(900 + 7000 * near ** 2, now, 0.1)
      const cents = 1200 * Math.log2(ratio)
      for (const o of oscs) o.detune.setTargetAtTime(cents + (o === o3 ? 9 : 0), now, 0.05)
      void d
    },
  }
}

// The chasing guard's engine, voiced by its kind (chase.engine = the
// vehicle's userData.sound):
//  bike    a buzzy twin, pulsing at its firing rate
//  car     a smooth V6
//  truck   a clattering diesel (S.W.A.T., riot unit)
//  monster a huge lumpy V8 with a loud exhaust
//  tank    deep diesel + track clank
//  heli    rotor chop (thumping air) + turbine whine
//  fan     ducted fans: a rising electric whine and rushing air
//  ufo     a warbling sci-fi hum with a shimmer on top
//  hover   a low hover hum and air
// Built from three layers set per kind: a tone (saw + square through a
// lowpass, amplitude-pulsed), a noise layer (filtered, optionally chopped)
// and a whine (sine pair). Wheeled engines (`gears`) run a gearbox: revs climb
// from `base` (idle firing rate, Hz) to `fMax` through each gear, drop as it
// shifts up (with a breath off the gas), and fall back as it slows. Load (the
// throttle) makes it louder and brighter; off the gas it burbles and pops.
// Fliers' pitch simply follows speed (`perSpeed`). Doppler on top.
const ENGINES = {
  bike: { base: 38, fMax: 175, gears: 6, pops: 1, pulse: 0.5, depth: 0.35, cut: 600, vol: 0.26, noise: 0, whine: 0 },
  car: { base: 28, fMax: 125, gears: 5, pops: 0.4, pulse: 0.25, depth: 0.25, cut: 520, vol: 0.26, noise: 0.05, nFreq: 300, whine: 0 },
  truck: { base: 22, fMax: 75, gears: 6, pops: 0, pulse: 0.5, depth: 0.5, cut: 420, vol: 0.32, noise: 0.18, nFreq: 1300, chop: 1, whine: 0 },
  monster: { base: 18, fMax: 95, gears: 4, pops: 1, pulse: 0.5, depth: 0.7, cut: 480, vol: 0.42, noise: 0.08, nFreq: 200, whine: 0 },
  tank: { base: 20, fMax: 62, gears: 4, pops: 0, pulse: 0.25, depth: 0.3, cut: 380, vol: 0.4, noise: 0.25, nFreq: 900, chop: 0.6, whine: 0 },
  heli: { base: 70, perSpeed: 0.6, pulse: 0, depth: 0, cut: 300, vol: 0.12, noise: 0.55, nFreq: 420, chop: 17, chopDepth: 0.9, whine: 0.05, wFreq: 2100, wPerSpeed: 12 },
  fan: { base: 90, perSpeed: 3, pulse: 0, depth: 0, cut: 260, vol: 0.06, noise: 0.22, nFreq: 2200, whine: 0.07, wFreq: 520, wPerSpeed: 38 },
  ufo: { base: 55, perSpeed: 1, pulse: 0, depth: 0, cut: 400, vol: 0.12, noise: 0.06, nFreq: 3000, whine: 0.08, wFreq: 330, wPerSpeed: 12, vibrato: 7 },
  hover: { base: 38, perSpeed: 1.2, pulse: 0, depth: 0, cut: 300, vol: 0.2, noise: 0.18, nFreq: 600, whine: 0.04, wFreq: 180, wPerSpeed: 6 },
}
function makeEngine() {
  const out = amp(0)
  out.connect(master)
  // Tone.
  const lp = filt('lowpass', 600, 1.2)
  const pulse = amp(0.6)
  lp.connect(pulse).connect(out)
  const o1 = ctx.createOscillator()
  o1.type = 'sawtooth'
  const o2 = ctx.createOscillator()
  o2.type = 'square'
  const g2 = amp(0.4)
  const toneGain = amp(0)
  o1.connect(toneGain)
  o2.connect(g2).connect(toneGain)
  toneGain.connect(lp)
  const lfo = ctx.createOscillator()
  const depth = amp(0)
  lfo.connect(depth).connect(pulse.gain)
  // Noise (rotor wash, clatter, track clank, air), chopped by its own LFO.
  const s = src('white')
  const nf = filt('bandpass', 900, 1.2)
  const chopped = amp(0.5)
  const nGain = amp(0)
  s.connect(nf).connect(chopped).connect(nGain).connect(out)
  const chop = ctx.createOscillator()
  chop.type = 'square'
  const chopDepth = amp(0)
  chop.connect(chopDepth).connect(chopped.gain)
  // Whine (turbine, fans, saucer), with optional vibrato.
  const w1 = ctx.createOscillator()
  const w2 = ctx.createOscillator()
  w2.type = 'triangle'
  const wGain = amp(0)
  w1.connect(wGain)
  w2.connect(wGain)
  wGain.connect(out)
  const vib = ctx.createOscillator()
  const vibDepth = amp(0)
  vib.connect(vibDepth)
  vibDepth.connect(w1.frequency)
  vibDepth.connect(w2.frequency)
  for (const o of [o1, o2, lfo, chop, w1, w2, vib]) o.start()
  let level = 0
  let gear = 0
  let revs = 0 // 0 (idle) .. 1 (redline), smoothed like a real tacho
  let shift = 0 // s left of the breath off the gas while it changes up
  let popT = 0
  return {
    tick(dt, l) {
      const now = ctx.currentTime
      const want = chase.engine ? 1 : 0
      level += (want - level) * Math.min(1, dt * 2)
      if (level < 0.002) {
        out.gain.setTargetAtTime(0, now, 0.05)
        gear = 0
        revs = 0
        return
      }
      const E = ENGINES[chase.engine] ?? ENGINES.car
      const v = Math.abs(chase.engineSpeed)
      const [, near, ratio] = heard(l, chase.engine === 'heli' ? 110 : 70)
      const load = chase.throttle
      let fire
      if (E.gears) {
        // Gearbox: first gear tops out at 35% of top speed, the last at top speed.
        const top = Math.max(8, chase.engineTop * 1.05)
        const gearTop = (k) => top * (0.35 + (0.65 * k) / Math.max(1, E.gears - 1))
        let r = v / gearTop(gear)
        if (r > 0.93 && gear < E.gears - 1) {
          gear++
          shift = 0.16
          r = v / gearTop(gear)
        } else if (gear > 0 && v / gearTop(gear - 1) < 0.62) {
          gear--
          r = v / gearTop(gear)
        }
        const target = Math.min(1.02, Math.max(load > 0.5 && v < 1 ? 0.18 : 0, r))
        revs += (target - revs) * Math.min(1, dt * (target > revs ? 7 : 4))
        fire = E.base + (E.fMax - E.base) * revs
        shift = Math.max(0, shift - dt)
        // Off the gas at revs: exhaust pops and crackle.
        if (E.pops && load < 0.3 && revs > 0.45 && near > 0.05) {
          popT -= dt
          if (popT <= 0) {
            popT = 0.05 + Math.random() * 0.22
            burst(out, 'white', 'bandpass', 380 + Math.random() * 500, 1.6, 0.05, 0.5 * E.pops * near)
          }
        }
      } else fire = E.base + v * E.perSpeed
      const base = fire * ratio
      const loadK = E.gears ? (shift > 0 ? 0.35 : 0.55 + 0.45 * load) : 1
      o1.frequency.setTargetAtTime(base, now, 0.05)
      o2.frequency.setTargetAtTime(base * 0.5, now, 0.05)
      toneGain.gain.setTargetAtTime(E.vol > 0 ? loadK : 0, now, shift > 0 ? 0.02 : 0.06)
      lfo.frequency.setTargetAtTime(Math.max(1, base * E.pulse), now, 0.08)
      depth.gain.setTargetAtTime(E.depth, now, 0.1)
      lp.frequency.setTargetAtTime((E.cut + (E.gears ? revs * 900 : v * 30)) * (0.6 + 0.6 * (E.gears ? load : 1)) + near * 500, now, 0.08)
      nf.frequency.setTargetAtTime(E.nFreq ?? 900, now, 0.1)
      nGain.gain.setTargetAtTime((E.noise ?? 0) * (0.5 + Math.min(1, v / 10) * 0.5), now, 0.1)
      chop.frequency.setTargetAtTime(E.chop ? (E.chop >= 5 ? E.chop * (0.9 + Math.min(1, v / 20) * 0.25) : base * E.chop * 0.25) : 1, now, 0.1)
      chopDepth.gain.setTargetAtTime(E.chop ? (E.chopDepth ?? 0.4) : 0, now, 0.1)
      w1.frequency.setTargetAtTime(((E.wFreq ?? 400) + v * (E.wPerSpeed ?? 0)) * ratio, now, 0.1)
      w2.frequency.setTargetAtTime(((E.wFreq ?? 400) + v * (E.wPerSpeed ?? 0)) * 1.5 * ratio, now, 0.1)
      wGain.gain.setTargetAtTime(E.whine ?? 0, now, 0.1)
      vib.frequency.setTargetAtTime(E.vibrato ?? 5, now, 0.2)
      vibDepth.gain.setTargetAtTime(E.vibrato ? 18 : 0, now, 0.2)
      out.gain.setTargetAtTime(level * near ** 1.3 * (E.vol + 0.2), now, 0.08)
    },
  }
}

// The chasing guard's tyres squealing as he slides or locks up: two narrow
// noise bands that wander a little, placed and dopplered like his engine.
function makeSkid() {
  const out = amp(0)
  out.connect(master)
  const s = src('white')
  const a = filt('bandpass', 1150, 14)
  const b = filt('bandpass', 1750, 18)
  s.connect(a).connect(amp(0.8)).connect(out)
  s.connect(b).connect(amp(0.5)).connect(out)
  lfo(a.detune, 7, 80, [])
  lfo(b.detune, 9, 110, [])
  let level = 0
  return {
    tick(dt, l) {
      const now = ctx.currentTime
      level += ((chase.engine ? chase.skid : 0) - level) * Math.min(1, dt * 10)
      if (level < 0.003) {
        out.gain.setTargetAtTime(0, now, 0.05)
        return
      }
      const [, near, ratio] = heard(l, 80)
      a.frequency.setTargetAtTime(1150 * ratio, now, 0.05)
      b.frequency.setTargetAtTime(1750 * ratio, now, 0.05)
      out.gain.setTargetAtTime(level * near ** 1.2 * 2.2, now, 0.04)
    },
  }
}

// Your bike, from its real speed (m/s):
//  - tyres: a rolling hum that rises in pitch and level with speed, scrubbing
//    louder when you lean hard into a turn
//  - wind past your ears, growing with the square of speed
//  - a pedal bike: the freewheel's pawls ticking (36 a wheel turn, so a buzz at
//    speed) while you coast, the chain's soft tick on each pedal stroke while
//    you pedal, and the rim brakes squealing as you brake
//  - a motor (scooter, moped): its engine, revs from the speedometer's gear,
//    brighter on the throttle
function makeRide() {
  const out = amp(0)
  out.connect(master)
  const tyre = noiseLayer(out, [], 'pink', 'bandpass', 220, 0.9, 0)
  const scrub = noiseLayer(out, [], 'white', 'bandpass', 900, 1.2, 0)
  const wind = noiseLayer(out, [], 'white', 'highpass', 900, 0.5, 0)
  const motorOut = amp(0)
  const motorLp = filt('lowpass', 900, 1.5)
  const m1 = ctx.createOscillator()
  m1.type = 'sawtooth'
  const m2 = ctx.createOscillator()
  m2.type = 'square'
  const m2g = amp(0.3)
  m1.connect(motorLp)
  m2.connect(m2g).connect(motorLp)
  motorLp.connect(motorOut).connect(out)
  // Rim brakes: a sine pair that wobbles.
  const squeal = amp(0)
  squeal.connect(out)
  const b1 = ctx.createOscillator()
  b1.frequency.value = 2350
  const b2 = ctx.createOscillator()
  b2.frequency.value = 3510
  b1.connect(squeal)
  b2.connect(amp(0.4)).connect(squeal)
  lfo(b1.frequency, 11, 35, [])
  lfo(b2.frequency, 13, 50, [])
  for (const o of [m1, m2, b1, b2]) o.start()
  const WHEEL = 2 * Math.PI * 0.34 // m per wheel turn
  let tickAcc = 0
  let crankAcc = 0
  return {
    tick(dt) {
      const now = ctx.currentTime
      const on = chase.ride ? 1 : 0
      out.gain.setTargetAtTime(on, now, 0.15)
      if (!on) return
      const v = chase.rideMps
      const ground = chase.grounded ? 1 : 0
      tyre.g.gain.setTargetAtTime(Math.min(1, v / 25) ** 0.8 * 0.2 * ground, now, 0.06)
      tyre.f.frequency.setTargetAtTime(140 + v * 22, now, 0.08)
      scrub.g.gain.setTargetAtTime(Math.min(1, chase.lean / 0.6) ** 2 * Math.min(1, v / 12) * 0.08 * ground, now, 0.06)
      wind.g.gain.setTargetAtTime(Math.min(1, (v / 40) ** 2) * 0.22, now, 0.1)
      wind.f.frequency.setTargetAtTime(500 + v * 35, now, 0.1)
      const rps = v / WHEEL
      if (chase.ride === 'motor') {
        const f = 42 + chase.rev * 120 + Math.min(1, v / 30) * 30
        m1.frequency.setTargetAtTime(f, now, 0.05)
        m2.frequency.setTargetAtTime(f * 0.5, now, 0.05)
        motorLp.frequency.setTargetAtTime((450 + chase.rev * 1400) * (0.55 + 0.6 * chase.pedal), now, 0.06)
        motorOut.gain.setTargetAtTime(0.06 + chase.pedal * 0.07 + chase.rev * 0.04, now, 0.06)
        squeal.gain.setTargetAtTime(0, now, 0.05)
      } else {
        motorOut.gain.setTargetAtTime(0, now, 0.05)
        squeal.gain.setTargetAtTime(chase.brake * Math.min(1, v / 8) * 0.035, now, 0.04)
        if (chase.pedal > 0.05 && ground) {
          // Pedalling: the freewheel is locked, the chain ticks twice a crank turn
          // (about 2.6 wheel turns per crank turn).
          tickAcc = 0
          crankAcc += dt * (rps / 2.6) * 2
          while (crankAcc >= 1) {
            crankAcc -= 1
            burst(out, 'white', 'bandpass', 2600, 4, 0.03, 0.025 + chase.pedal * 0.02)
          }
        } else if (v > 0.3) {
          // Coasting: the freewheel pawls tick, 36 a wheel turn.
          crankAcc = 0
          tickAcc += dt * Math.min(70, rps * 36)
          let n = 0
          while (tickAcc >= 1 && n++ < 6) {
            tickAcc -= 1
            burst(out, 'white', 'bandpass', 4200, 7, 0.012, 0.03)
          }
          tickAcc = Math.min(tickAcc, 1)
        }
      }
    },
  }
}

// A tense loop: kick, snare, hats and a driving minor bass line at 150 bpm.
function makeMusic() {
  const out = amp(0)
  out.connect(master)
  const STEP = 60 / 150 / 2
  const RIFF = [0, 0, 12, 0, 3, 0, 5, 7, 0, 0, 12, 0, 10, 8, 7, 3]
  const KICK = [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0]
  const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1]
  let next = 0
  let k = 0
  let level = 0
  function bass(f, at, dur) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    const lp = filt('lowpass', 300, 6)
    const g = amp(0)
    lp.frequency.setValueAtTime(1500, at)
    lp.frequency.exponentialRampToValueAtTime(220, at + dur)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(0.22, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(lp).connect(g).connect(out)
    o.start(at)
    o.stop(at + dur + 0.05)
  }
  return {
    tick(dt) {
      const now = ctx.currentTime
      const want = chase.music ? 1 : 0
      level += (want - level) * Math.min(1, dt * (want ? 2 : 0.8))
      out.gain.setTargetAtTime(level * 0.5, now, 0.05)
      if (level < 0.01) {
        next = 0
        k = 0
        return
      }
      if (next < now) next = now + 0.05
      while (next < now + 0.2) {
        const at = next - now
        const i = k++ % 16
        if (KICK[i]) chirp(out, 150, 42, 0.22, 0.5, 'sine', at)
        if (SNARE[i]) {
          burst(out, 'white', 'bandpass', 1800, 0.8, 0.16, 0.22, at)
          chirp(out, 220, 160, 0.08, 0.12, 'triangle', at)
        }
        burst(out, 'white', 'highpass', 8000, 0.7, i % 2 ? 0.05 : 0.025, i % 2 ? 0.07 : 0.04, at)
        bass(note(55, RIFF[i]), next, STEP * 0.9)
        next += STEP
      }
    },
  }
}

// One-shots. `at` (optional { x, y, z }) fades them with distance from you.
let lastListener = { x: 0, y: 0, z: 0 }
export function heistSfx(name, at = null) {
  if (!ctx || ctx.state !== 'running') return
  let vol = 1
  if (at) vol = Math.max(0, 1 - Math.hypot(at.x - lastListener.x, at.z - lastListener.z) / 60) ** 1.2
  if (vol < 0.02) return
  const out = amp(vol)
  out.connect(sfxBus)
  setTimeout(() => out.disconnect(), 4000)
  if (name === 'steal') {
    // Whoosh up, then a cash-register ching.
    const s = ctx.createBufferSource()
    s.buffer = noise.white
    const f = filt('bandpass', 400, 1.4)
    const g = amp(0)
    const t = ctx.currentTime
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.32)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.35, t + 0.18)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    s.connect(f).connect(g).connect(out)
    s.start(t)
    s.stop(t + 0.45)
    bell(out, 2093, 0.9, 0.12, 0.12)
    bell(out, 2637, 1.1, 0.12, 0.2)
    burst(out, 'white', 'highpass', 6000, 0.7, 0.08, 0.1, 0.1)
  } else if (name === 'alert') {
    chirp(out, 880, 1760, 0.09, 0.16, 'square')
    chirp(out, 880, 1760, 0.09, 0.16, 'square', 0.12)
    chirp(out, 110, 38, 0.5, 0.5, 'sine')
  } else if (name === 'radio') {
    // Squelch, crackly garbled chatter, a beep, squelch.
    burst(out, 'white', 'bandpass', 2200, 1.5, 0.08, 0.2, 0.25)
    for (let i = 0; i < 9; i++) {
      const f = rnd(500, 1100)
      chirp(out, f, f * rnd(0.8, 1.25), 0.07, 0.05, 'sawtooth', 0.35 + i * 0.075)
      burst(out, 'white', 'bandpass', 1700, 2, 0.06, 0.06, 0.35 + i * 0.075)
    }
    chirp(out, 1000, 1000, 0.08, 0.07, 'sine', 1.1)
    burst(out, 'white', 'bandpass', 2200, 1.5, 0.12, 0.18, 1.22)
  } else if (name === 'chirp') {
    // The siren's "whoop whoop" as he pulls out.
    const hp = filt('bandpass', 1300, 0.8)
    hp.connect(out)
    for (const at2 of [0, 0.3]) chirp(hp, 1600, 420, 0.26, 0.5, 'sawtooth', at2)
  } else if (name === 'wheelie') {
    burst(out, 'white', 'bandpass', 2600, 4, 0.32, 0.14)
    chirp(out, 90, 160, 0.3, 0.12, 'sawtooth')
  } else if (name === 'crash') {
    burst(out, 'brown', 'lowpass', 500, 0.7, 0.6, 0.9, 0, 0.002)
    burst(out, 'white', 'bandpass', 2600, 1.2, 0.3, 0.35, 0, 0.002)
    chirp(out, 140, 30, 0.5, 0.6, 'sine')
    for (let i = 0; i < 6; i++) bell(out, rnd(2800, 5200), 0.25, 0.04, 0.05 + i * 0.05) // bits of plastic and glass
  } else if (name === 'thud') {
    burst(out, 'brown', 'lowpass', 260, 0.7, 0.3, 0.7, 0, 0.002)
    chirp(out, 95, 40, 0.25, 0.4, 'sine')
  } else if (name === 'busted') {
    // Sad trombone.
    const lp = filt('lowpass', 1300, 1)
    lp.connect(out)
    const notes = [[392, 370, 0], [370, 349, 0.42], [349, 330, 0.84]]
    for (const [a, b, at2] of notes) chirp(lp, a, b, 0.38, 0.16, 'sawtooth', at2 + 0.5)
    chirp(lp, 330, 250, 1.1, 0.18, 'sawtooth', 1.76)
  } else if (name === 'escape') {
    ;[523, 659, 784, 1047].forEach((f, i) => chirp(out, f, f, 0.16, 0.12, 'square', i * 0.09))
    chirp(out, 1047, 1047, 0.5, 0.1, 'square', 0.36)
    for (let i = 0; i < 5; i++) bell(out, note(1568, pick(PENTA)), 1, 0.05, 0.4 + i * 0.07)
    bell(out, 2093, 1, 0.1, 0.1)
  } else if (name === 'pop') {
    chirp(out, 380, 1300, 0.09, 0.25, 'sine')
    bell(out, 1568, 0.6, 0.06, 0.05)
  } else if (name === 'swing') {
    burst(out, 'white', 'bandpass', 1400, 2.5, 0.22, 0.25, 0, 0.06)
  } else if (name === 'bonk') {
    // Bat on bodywork: a hollow clang and a cartoon boing.
    burst(out, 'brown', 'lowpass', 700, 0.8, 0.25, 0.8, 0, 0.002)
    bell(out, 620, 0.7, 0.16)
    bell(out, 930, 0.5, 0.1, 0.02)
    chirp(out, 300, 900, 0.35, 0.12, 'triangle', 0.08)
  } else if (name === 'whiff') {
    chirp(out, 500, 260, 0.25, 0.08, 'triangle')
  } else if (name === 'drop') {
    burst(out, 'white', 'bandpass', 3800, 3, 0.18, 0.18, 0, 0.002)
    for (let i = 0; i < 4; i++) bell(out, rnd(2400, 3600), 0.2, 0.04, i * 0.04)
  } else if (name === 'snag') {
    // Tyres shredding on wire: a metal scrape and a hiss.
    burst(out, 'white', 'bandpass', 3200, 5, 0.6, 0.35, 0, 0.003)
    burst(out, 'pink', 'highpass', 2500, 1, 1.1, 0.22, 0.1, 0.05)
    chirp(out, 1900, 700, 0.5, 0.06, 'sawtooth')
  } else if (name === 'skid') {
    for (let i = 0; i < 3; i++) chirp(out, 1500 + i * 120, 900, 0.5, 0.06, 'sawtooth', i * 0.12)
    burst(out, 'pink', 'bandpass', 1800, 2, 1.2, 0.25, 0, 0.05)
  } else if (name === 'smoke') {
    burst(out, 'brown', 'lowpass', 400, 0.8, 0.4, 0.6, 0, 0.002)
    burst(out, 'pink', 'lowpass', 1500, 0.7, 1.4, 0.35, 0.05, 0.1)
  } else if (name === 'nitro') {
    burst(out, 'white', 'bandpass', 900, 1, 1.2, 0.4, 0, 0.04)
    chirp(out, 120, 520, 0.9, 0.18, 'sawtooth')
  } else if (name === 'pickup') {
    chirp(out, 660, 1320, 0.1, 0.18, 'square')
    bell(out, 1760, 0.5, 0.08, 0.08)
    bell(out, 2349, 0.6, 0.07, 0.15)
  }
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
  sfxBus = amp(1)
  sfxBus.connect(master)
  hum = makeHum()
  sirenVoice = makeSiren()
  engineVoice = makeEngine()
  rideVoice = makeRide()
  skidVoice = makeSkid()
  musicVoice = makeMusic()
}

// One-shot game sounds (training.js). Silently nothing before the first gesture.
const SFX = {
  // Getting on: a whoosh up and the bike's bell.
  mount() {
    burst(sfxBus, 'pink', 'bandpass', 900, 1.2, 0.35, 0.25, 0, 0.12)
    chirp(sfxBus, 300, 700, 0.25, 0.12, 'triangle')
    bell(sfxBus, 1760, 0.35, 0.09, 0.12)
    bell(sfxBus, 1760, 0.35, 0.07, 0.24)
  },
  dismount() {
    burst(sfxBus, 'pink', 'bandpass', 700, 1.2, 0.3, 0.2, 0, 0.02)
    chirp(sfxBus, 600, 220, 0.22, 0.1, 'triangle')
  },
  // Each +speed tick: a soft bubbly pop, a little higher with every combo step.
  tick(step = 0) {
    const f = note(660, PENTA[step % PENTA.length])
    chirp(sfxBus, f, f * 1.6, 0.09, 0.13, 'sine')
    chirp(sfxBus, f * 2, f * 2.4, 0.06, 0.04, 'triangle', 0.03)
  },
  // x4 CLICK: a punchy tap, a revving whoosh as the front wheel lifts and a sparkly chord.
  click(step = 0) {
    burst(sfxBus, 'white', 'highpass', 2500, 1, 0.05, 0.3)
    chirp(sfxBus, 180, 60, 0.12, 0.35, 'sine')
    burst(sfxBus, 'pink', 'bandpass', 1200, 1.5, 0.3, 0.18, 0.02, 0.06)
    chirp(sfxBus, 140, 420, 0.28, 0.12, 'sawtooth')
    const base = note(880, PENTA[step % 5])
    for (const [k, at] of [[0, 0.04], [4, 0.08], [7, 0.12], [12, 0.16]]) chirp(sfxBus, note(base, k), note(base, k) * 1.01, 0.25, 0.07, 'square', at)
  },
  ready() {
    chirp(sfxBus, 1200, 1800, 0.08, 0.05, 'sine')
  },
  upgrade() {
    for (const [k, at] of [[0, 0], [4, 0.09], [7, 0.18], [12, 0.27], [16, 0.36]]) bell(sfxBus, note(523, k), 0.6, 0.08, at)
    burst(sfxBus, 'white', 'highpass', 6000, 1, 0.6, 0.08, 0.3, 0.1)
  },
  deny() {
    chirp(sfxBus, 220, 150, 0.18, 0.18, 'square')
    chirp(sfxBus, 180, 120, 0.2, 0.15, 'square', 0.12)
  },
}
export function sfx(name, arg) {
  if (!ctx || ctx.state !== 'running') return
  SFX[name]?.(arg)
}
// The treadmill loop's level (0 = off).
export function setTrainingHum(level) {
  humWanted = level
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

// An ad break (Bloxity starts them whenever it likes) silences the game; it comes back after.
let adBreak = false
export function setAdBreak(on) {
  adBreak = !!on
  if (master) master.gain.setTargetAtTime(muted || adBreak ? 0 : AUDIO.volume, ctx.currentTime, 0.1)
}

export function isMuted() {
  return muted
}
export function setMuted(m) {
  muted = m
  try {
    localStorage.setItem('sab-muted', m ? '1' : '0')
  } catch {}
  if (master) master.gain.setTargetAtTime(m || adBreak ? 0 : AUDIO.volume, ctx.currentTime, 0.1)
}

// The ambience to fade to (a BEDS name, or null for none).
export function setBed(name) {
  wanted = BEDS[name] ? name : null
}
// Returns the entry: set .off = true while that guard is awake.
export function addSnore(x, y, z) {
  const s = [x, y, z]
  snores.push(s)
  return s
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
    if (s.off) continue
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
  lastListener = listener
  sirenVoice.tick(dt, listener)
  engineVoice.tick(dt, listener)
  skidVoice.tick(dt, listener)
  rideVoice.tick(dt)
  musicVoice.tick(dt)
  hum.set(humWanted)
  hum.tick(dt)
}
