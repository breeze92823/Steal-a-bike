import { BIKES, FUSE_BIKES, INDEX_WORLDS } from './config.js'

// Flat side-view bike pictures for the shop windows and the Bike Index: a
// bicycle, cargo bicycle, scooter, dirt bike, sport bike or cruiser in its
// body / accent / rim colours (BIKES, or the bike's INDEX_WORLDS colour). Plus
// the painted world posters down the side of the index.

const TIRE = '#1c1c22'

function wheel(cx, cy, r, rim, knobby) {
  const spokes = [0, 45, 90, 135].map((a) => `<path d="M${cx} ${cy - r + 9}V${cy + r - 9}" stroke="${rim}" stroke-width="2.4" transform="rotate(${a} ${cx} ${cy})"/>`).join('')
  return `<circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="${TIRE}" stroke-width="7" ${knobby ? 'stroke-dasharray="5 2.6"' : ''}/>
    <circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="${TIRE}" stroke-width="4.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="none" stroke="${rim}" stroke-width="3"/>${spokes}
    <circle cx="${cx}" cy="${cy}" r="5" fill="${rim}" stroke="${TIRE}" stroke-width="2"/>`
}

function bicycle(b) {
  return `${wheel(48, 96, 30, b.rim)}${wheel(152, 96, 30, b.rim)}
    <g fill="none" stroke="${b.body}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M48 96L82 56H134L98 98Z"/><path d="M82 56L98 98"/><path d="M134 56L152 96"/><path d="M130 40L134 56"/>
    </g>
    <path d="M60 80L82 58" stroke="#fff" stroke-width="2" opacity=".55" stroke-linecap="round"/>
    <path d="M120 36l18 -3" stroke="${TIRE}" stroke-width="6" stroke-linecap="round"/>
    <path d="M70 50h22l-2 6H72z" fill="${TIRE}"/><path d="M80 56v-6" stroke="${TIRE}" stroke-width="4"/>
    <circle cx="98" cy="98" r="7" fill="${b.accent}" stroke="${TIRE}" stroke-width="3"/>`
}

function dirt(b) {
  return `${wheel(44, 96, 31, b.rim, true)}${wheel(158, 96, 31, b.rim, true)}
    <path d="M100 86L44 96" stroke="#3a3e48" stroke-width="7" stroke-linecap="round"/>
    <path d="M138 46L158 96" stroke="#c8ccd4" stroke-width="7" stroke-linecap="round"/>
    <rect x="80" y="70" width="38" height="24" rx="4" fill="#5a606c" stroke="${TIRE}" stroke-width="3"/>
    <path d="M86 76h26M86 83h26" stroke="#8a909c" stroke-width="2.5"/>
    <path d="M60 92c10-4 22-6 30-6" stroke="#c8ccd4" stroke-width="4" fill="none"/>
    <path d="M30 56L84 56 88 68 40 72Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M82 54L118 46 142 52 136 66 112 72 88 70Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M94 56l22-5 14 4" stroke="${b.accent}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M48 52L100 46 104 52 52 58Z" fill="${TIRE}"/>
    <path d="M140 58L180 66 172 72 148 68Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M140 38l-2 12h12l4-12z" fill="${b.accent}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M128 34l20 4" stroke="${TIRE}" stroke-width="5" stroke-linecap="round"/>
    ${b.skull ? skull(110, 58) : ''}`
}

function sport(b) {
  return `${wheel(46, 96, 30, b.rim)}${wheel(156, 96, 30, b.rim)}
    <path d="M100 86L46 96" stroke="#3a3e48" stroke-width="8" stroke-linecap="round"/>
    <path d="M142 50L156 96" stroke="#c8ccd4" stroke-width="7" stroke-linecap="round"/>
    <path d="M58 76C66 56 100 44 140 44L172 58 166 76 128 88 82 86Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 58L78 52 84 64 40 70Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M44 54L92 46 96 54 48 60Z" fill="${b.accent}"/>
    <path d="M82 80C98 66 128 60 160 62" stroke="${b.accent}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M70 70C80 56 104 48 132 48" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>
    <path d="M140 44L162 34 170 50Z" fill="#9fe6ff" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round" opacity=".9"/>
    <rect x="96" y="76" width="30" height="16" rx="3" fill="#5a606c" stroke="${TIRE}" stroke-width="3"/>
    <circle cx="168" cy="60" r="4" fill="#fff6a8"/>
    ${b.skull ? skull(112, 58) : ''}`
}

function skull(x, y) {
  return `<circle cx="${x}" cy="${y}" r="10" fill="#f4f4f4" stroke="${TIRE}" stroke-width="2.5"/><rect x="${x - 6}" y="${y + 6}" width="12" height="7" rx="2" fill="#f4f4f4" stroke="${TIRE}" stroke-width="2"/>
    <circle cx="${x - 4}" cy="${y}" r="3" fill="${TIRE}"/><circle cx="${x + 4}" cy="${y}" r="3" fill="${TIRE}"/>`
}

function cargo(b) {
  return `${bicycle(b)}<path d="M140 30h34l-4 22h-26z" fill="#c8964a" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M146 36h24M145 44h26M152 30v22M162 30v22" stroke="#7a5a2a" stroke-width="2.4"/>
    <path d="M40 58h34" stroke="${TIRE}" stroke-width="5" stroke-linecap="round"/>`
}

function scooter(b) {
  return `${wheel(52, 104, 23, b.rim)}${wheel(152, 104, 23, b.rim)}
    <path d="M26 100C24 74 50 60 98 64L106 100Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 80C52 70 74 66 96 68" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>
    <path d="M98 92H142L146 100H98Z" fill="#3a3e48" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M132 100L140 42H154L156 100Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 86c8 2 14 8 16 16" stroke="${b.body}" stroke-width="9" fill="none"/>
    <path d="M38 64C54 54 84 54 98 60L96 68H40Z" fill="${TIRE}"/>
    <path d="M128 36l36 -4" stroke="${TIRE}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="154" cy="46" r="6" fill="#fff6a8" stroke="${TIRE}" stroke-width="2.5"/>`
}

function cruiser(b) {
  return `${wheel(42, 98, 30, b.rim)}${wheel(166, 98, 30, b.rim)}
    <path d="M128 28L166 98" stroke="#c8ccd4" stroke-width="7" stroke-linecap="round"/>
    <path d="M100 88L42 98" stroke="#3a3e48" stroke-width="7" stroke-linecap="round"/>
    <path d="M60 104H128" stroke="#d4d8e0" stroke-width="6" stroke-linecap="round"/>
    <path d="M84 72l12 22 14-22" fill="#6a707c" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M86 56C94 42 124 40 134 50C128 62 104 66 86 62Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M96 50c10-6 24-6 32-2" stroke="${b.accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M44 66C56 58 78 58 88 62L86 70H48Z" fill="${TIRE}"/>
    <path d="M24 66C30 56 44 54 52 60L48 70H28Z" fill="${b.body}" stroke="${TIRE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M118 18l8 10M118 18l-6 2" stroke="${TIRE}" stroke-width="5" stroke-linecap="round"/>
    ${b.skull ? skull(108, 52) : ''}`
}

const DRAW = { bicycle, cargo, scooter, dirt, sport, cruiser }

// Every catalog bike by name: { name, rarity, kind, color, income, world }.
export const CATALOG = new Map()
for (const w of INDEX_WORLDS) for (const [name, rarity, kind, color, income] of w.bikes) CATALOG.set(name, { name, rarity, kind, color, income, world: w.name })

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 < 110
}

// How a bike is drawn: its BIKES entry, else its catalog kind and colour.
export function bikeLook(name) {
  if (BIKES[name]) return BIKES[name]
  const f = FUSE_BIKES[name]
  const c = CATALOG.get(name) ?? (f && { kind: f[0], color: f[1] })
  if (!c) return BIKES.BMX
  const dark = isDark(c.color)
  return { kind: c.kind, body: c.color, accent: dark ? '#ffffff' : '#24242c', rim: dark ? '#8a94a8' : '#c8ccd4' }
}

// What a bike sells for.
export const bikeValue = (name) => BIKES[name]?.value ?? FUSE_BIKES[name]?.[2] ?? Math.round((CATALOG.get(name)?.income ?? 4) * 75)

export function bikeArt(name) {
  const b = bikeLook(name)
  return `<svg class="bike-art" viewBox="0 0 200 132" aria-hidden="true">${DRAW[b.kind](b)}</svg>`
}

// --- World posters (170 x 560): sky, far hills, ground and the world's motif ---
const SCENES = {
  plain: { sky: ['#6ac8ff', '#d8f4ff'], far: '#5aa84a', ground: '#3f9a34', motif: 'trees' },
  lake: { sky: ['#5ab8ff', '#e0f4ff'], far: '#7a8aa8', ground: '#2a8ad8', motif: 'pines', snowcap: true },
  desert: { sky: ['#5ab8ff', '#fff0c8'], far: '#d8945a', ground: '#f0c870', motif: 'palms' },
  snow: { sky: ['#a8d8ff', '#f4fbff'], far: '#c8dcec', ground: '#f4fbff', motif: 'pines', snowcap: true, snowy: true },
  jungle: { sky: ['#5ac8ff', '#c8f4ff'], far: '#4a8a5a', ground: '#2a8a3a', motif: 'floating' },
  swamp: { sky: ['#8ac8a8', '#d8f0c8'], far: '#4a7a4a', ground: '#3a6a5a', motif: 'mangroves' },
  candy: { sky: ['#ff9ad4', '#ffe0f0'], far: '#ffb8d8', ground: '#a8643a', motif: 'lollipops' },
  crystal: { sky: ['#7a6aff', '#c8e0ff'], far: '#6a5aaa', ground: '#4a3a7a', motif: 'crystals' },
  magma: { sky: ['#3a1410', '#ff6a2a'], far: '#4a2420', ground: '#ff5a1a', motif: 'volcano' },
  cosmic: { sky: ['#1a0a3a', '#7a3ac8'], far: '#3a2a6a', ground: '#2a1a4a', motif: 'planets' },
  aurora: { sky: ['#06122a', '#1a3a5a'], far: '#5a7a9a', ground: '#e8f4fb', motif: 'aurora', snowcap: true },
  angel: { sky: ['#fff4d0', '#ffffff'], far: '#f0e8d8', ground: '#ffffff', motif: 'heaven' },
  fusion: { sky: ['#0a1a3a', '#2a6aff'], far: '#1a2a5a', ground: '#14204a', motif: 'energy' },
  halloween: { sky: ['#1a0a2a', '#ff8a2a'], far: '#2a1a3a', ground: '#2a1a14', motif: 'spooky' },
}

const tree = (x, y, s, leaf) => `<rect x="${x - 3 * s}" y="${y - 10 * s}" width="${6 * s}" height="${16 * s}" fill="#6a4a2a"/><circle cx="${x}" cy="${y - 18 * s}" r="${14 * s}" fill="${leaf}"/><circle cx="${x - 6 * s}" cy="${y - 22 * s}" r="${6 * s}" fill="#fff" opacity=".2"/>`
const pine = (x, y, s, leaf, snow) => `<rect x="${x - 2 * s}" y="${y - 6 * s}" width="${4 * s}" height="${8 * s}" fill="#5a3a2a"/><path d="M${x} ${y - 44 * s}l${14 * s} ${38 * s}h${-28 * s}z" fill="${leaf}"/>${snow ? `<path d="M${x} ${y - 44 * s}l${6 * s} ${16 * s}h${-12 * s}z" fill="#fff"/>` : ''}`
const palm = (x, y, s) => `<path d="M${x} ${y}q${4 * s} ${-30 * s} ${-2 * s} ${-60 * s}" stroke="#8a5a2a" stroke-width="${4 * s}" fill="none"/><g fill="#3fb83a"><path d="M${x - 2 * s} ${y - 60 * s}q${-20 * s} ${-6 * s} ${-28 * s} ${8 * s}q${14 * s} ${-12 * s} ${28 * s} ${-8 * s}z"/><path d="M${x - 2 * s} ${y - 60 * s}q${20 * s} ${-8 * s} ${30 * s} ${6 * s}q${-14 * s} ${-12 * s} ${-30 * s} ${-6 * s}z"/><path d="M${x - 2 * s} ${y - 60 * s}q${-4 * s} ${-16 * s} ${10 * s} ${-22 * s}q${-6 * s} ${10 * s} ${-10 * s} ${22 * s}z"/></g>`
const crystal = (x, y, s, c) => `<path d="M${x} ${y - 46 * s}l${10 * s} ${16 * s}v${30 * s}h${-20 * s}v${-30 * s}z" fill="${c}"/><path d="M${x} ${y - 46 * s}l${10 * s} ${16 * s}v${30 * s}h${-10 * s}z" fill="#fff" opacity=".3"/>`
const stars = (pts) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff"/>`).join('')
const waterfall = '<path d="M118 290h14v170h-14z" fill="#bff4ff" opacity=".85"/>'

const MOTIFS = {
  trees: () => tree(30, 470, 1.4, '#3fb83a') + tree(130, 430, 1.8, '#2a9a2a') + tree(80, 520, 1.6, '#5bcf47') + tree(150, 520, 1.2, '#3fb83a') + waterfall,
  pines: (sc) => [20, 60, 110, 150].map((x, i) => pine(x, 400 + (i % 2) * 30, 1.3 + (i % 2) * 0.3, sc.snowy ? '#2a6a4a' : '#2a7a3a', sc.snowy)).join('') + [40, 130].map((x) => pine(x, 540, 1.8, sc.snowy ? '#2a6a4a' : '#1f6a2a', sc.snowy)).join(''),
  palms: () => palm(30, 520, 1.4) + palm(140, 480, 1.1) + '<path d="M90 380c0-40 50-40 50 0h-10c0-26-30-26-30 0z" fill="#c8743a"/><rect x="60" y="470" width="12" height="40" rx="6" fill="#3fa84a"/><rect x="50" y="482" width="10" height="16" rx="5" fill="#3fa84a"/>',
  floating: () => '<path d="M20 200h50l-12 30h-26z" fill="#7a6a5a"/><rect x="20" y="192" width="50" height="10" fill="#3fb83a"/><path d="M100 140h46l-10 26h-26z" fill="#7a6a5a"/><rect x="100" y="132" width="46" height="10" fill="#3fb83a"/>' + waterfall + tree(40, 540, 1.8, '#2a9a2a') + tree(150, 530, 1.4, '#3fb83a'),
  mangroves: () => [30, 100, 150].map((x, i) => `<path d="M${x} 470c-10 30-20 40-30 50M${x} 470c10 30 20 40 30 50M${x} 470v-120" stroke="#5a4a2a" stroke-width="6" fill="none"/><ellipse cx="${x}" cy="${340 - i * 20}" rx="34" ry="26" fill="#3a7a2a"/><path d="M${x - 20} ${350 - i * 20}v40M${x + 14} ${352 - i * 20}v50" stroke="#5a8a3a" stroke-width="3"/>`).join('') + '<ellipse cx="60" cy="530" rx="12" ry="5" fill="#7ad83a"/><ellipse cx="130" cy="548" rx="10" ry="4" fill="#7ad83a"/>',
  lollipops: () => [[30, 470, '#ff5fa8'], [130, 430, '#5fd8ff'], [90, 540, '#ffd23a']].map(([x, y, c]) => `<path d="M${x} ${y}v60" stroke="#fff" stroke-width="5"/><circle cx="${x}" cy="${y}" r="20" fill="${c}"/><path d="M${x - 12} ${y}a12 12 0 0 1 24 0a8 8 0 0 1 -16 0" stroke="#fff" stroke-width="4" fill="none"/>`).join('') + '<rect x="110" y="240" width="40" height="70" fill="#ffd0e8"/><path d="M106 240l24-30 24 30z" fill="#ff5fa8"/>',
  crystals: () => crystal(30, 520, 1.6, '#ff7ad8') + crystal(140, 500, 1.9, '#5fd8ff') + crystal(90, 560, 1.4, '#b07bff') + crystal(60, 420, 1, '#d8b0ff') + waterfall,
  volcano: () => '<path d="M10 330l50-110h40l60 110z" fill="#3a1a14"/><path d="M60 220h40l-6 20-14-8-14 10z" fill="#ff8a1a"/><path d="M80 230c-6 40 10 80 0 120s-30 80-10 200" stroke="#ff8a1a" stroke-width="10" fill="none"/><path d="M20 150l10 30M140 110l-8 34" stroke="#ff5a1a" stroke-width="5"/>',
  planets: () => '<circle cx="110" cy="120" r="42" fill="#b07bff"/><ellipse cx="110" cy="120" rx="66" ry="12" fill="none" stroke="#ffe88a" stroke-width="4"/><circle cx="40" cy="250" r="16" fill="#3ff0ff"/>' + stars([[20, 60], [150, 220], [70, 180], [130, 300], [30, 360], [90, 40]]) + '<path d="M30 430h60l-14 30h-32z" fill="#3a2a6a"/><path d="M100 380h50l-12 26h-26z" fill="#3a2a6a"/>',
  aurora: () => '<path d="M0 120C40 80 80 160 170 100V150C90 200 50 130 0 170Z" fill="#3fffb0" opacity=".55"/><path d="M0 190C60 150 100 220 170 170V200C100 250 60 190 0 230Z" fill="#b07bff" opacity=".45"/>' + stars([[20, 40], [150, 60], [90, 30], [60, 260]]) + pine(40, 540, 1.6, '#2a5a4a', true) + pine(140, 520, 1.3, '#2a5a4a', true),
  heaven: () => '<circle cx="85" cy="140" r="34" fill="none" stroke="#ffd23a" stroke-width="8"/>' + [[20, 420], [140, 400], [80, 520]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="40" ry="18" fill="#fff"/><ellipse cx="${x + 20}" cy="${y - 10}" rx="24" ry="16" fill="#fff"/>`).join('') + '<rect x="30" y="250" width="14" height="140" fill="#f4e8c0"/><rect x="126" y="250" width="14" height="140" fill="#f4e8c0"/><path d="M24 250h122l-61-36z" fill="#ffd23a"/>',
  energy: () => '<circle cx="85" cy="220" r="50" fill="none" stroke="#3ff0ff" stroke-width="6"/><circle cx="85" cy="220" r="26" fill="#3ff0ff" opacity=".6"/><path d="M60 300l20 40-14 4 24 50" stroke="#ffe14a" stroke-width="6" fill="none"/>' + [[30, 460, 22], [140, 430, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#7a8aaa" stroke-width="8" stroke-dasharray="6 5"/>`).join(''),
  spooky: () => '<circle cx="110" cy="120" r="40" fill="#ffd27a"/><path d="M40 560V360c0-20-20-40-30-50M40 400c20-20 30-40 50-46M40 380c-14-16-24-20-36-22" stroke="#140a14" stroke-width="9" fill="none"/>' + [[30, 200], [130, 220], [80, 260]].map(([x, y]) => `<path d="M${x} ${y}l-10-4 4 6-8 2 10 2 4 4 4-4 10-2-8-2 4-6z" fill="#140a14"/>`).join('') + [[110, 520, 20], [150, 540, 14], [70, 548, 12]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="#ff7a12"/><path d="M${x} ${y - r * 0.8}v-6" stroke="#3f8a22" stroke-width="3"/>`).join(''),
}

export function worldScene(name) {
  const sc = SCENES[name]
  const id = `sky-${name}`
  return `<svg class="scene" viewBox="0 0 170 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc.sky[0]}"/><stop offset="1" stop-color="${sc.sky[1]}"/></linearGradient></defs>
    <rect width="170" height="560" fill="url(#${id})"/>
    <path d="M0 330L40 250 70 290 110 220 170 300V560H0Z" fill="${sc.far}"/>
    ${sc.snowcap ? '<path d="M40 250l12 18-12 4-12-6zM110 220l16 22-16 6-14-8z" fill="#fff"/>' : ''}
    <path d="M0 400C50 380 110 420 170 390V560H0Z" fill="${sc.ground}"/>
    ${MOTIFS[sc.motif](sc)}
  </svg>`
}
