import { CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace } from 'three'
import { liveLabel } from './kit.js'
import * as bloxity from './bloxity.js'

// The tag over your character: a round headshot (your Bloxity picture, else a
// drawn face) with your name under it.
function drawFallbackFace(ctx, s) {
  ctx.fillStyle = '#ffd84a'
  ctx.fillRect(s * 0.22, s * 0.3, s * 0.56, s * 0.52)
  ctx.fillStyle = '#8a4a1a'
  ctx.fillRect(s * 0.18, s * 0.16, s * 0.64, s * 0.2)
  ctx.fillStyle = '#5a2aa8'
  ctx.fillRect(s * 0.26, s * 0.44, s * 0.2, s * 0.1)
  ctx.fillRect(s * 0.54, s * 0.44, s * 0.2, s * 0.1)
  ctx.strokeStyle = '#3a2a10'
  ctx.lineWidth = s * 0.03
  ctx.beginPath()
  ctx.arc(s * 0.5, s * 0.6, s * 0.12, 0.2, Math.PI - 0.2)
  ctx.stroke()
}

export function createNameTag(parent) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  const head = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }))
  head.scale.set(1.3, 1.3, 1)
  head.position.y = 3.6
  const shownName = () => (bloxity.displayName() === 'Offline' ? 'Player' : bloxity.displayName())
  const name = liveLabel(shownName(), 0.75, { color: '#ffffff', outline: '#1a1a24', outlineWidth: 12 })
  name.sprite.position.y = 2.75
  parent.add(head, name.sprite)

  function paint(img) {
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2)
    ctx.fillStyle = '#d9dde6'
    ctx.fill()
    ctx.clip()
    if (img) ctx.drawImage(img, 0, 0, size, size)
    else drawFallbackFace(ctx, size)
    ctx.restore()
    ctx.lineWidth = 10
    ctx.strokeStyle = '#1a1a24'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2)
    ctx.stroke()
    tex.needsUpdate = true
  }
  paint(null)

  return {
    // Re-read the name and picture after sign-in changes.
    refresh() {
      name.set(shownName())
      const url = bloxity.getPfp()
      if (!url) return paint(null)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => paint(img)
      img.onerror = () => paint(null)
      img.src = url
    },
  }
}
