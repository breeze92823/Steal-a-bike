import { Group, IcosahedronGeometry, Mesh, MeshLambertMaterial } from 'three'
import { mulberry32 } from './textures.js'
import { bake } from './bake.js'

// The sky dressing: puffy cartoon clouds all round the lobby, drifting slowly.
// (The ground and everything on it is built by lobby.js, market.js and valley.js.)

function makeClouds() {
  const rand = mulberry32(2024)
  const geo = new IcosahedronGeometry(1, 2)
  const mat = new MeshLambertMaterial({ color: '#ffffff', emissive: '#e4f1ff', emissiveIntensity: 0.68, fog: false })
  const group = new Group()
  for (let i = 0; i < 30; i++) {
    const ang = rand() * Math.PI * 2
    const dist = 230 + rand() * 190
    const cloud = new Group()
    const puffs = 5 + Math.floor(rand() * 4)
    const len = 24 + rand() * 30
    for (let p = 0; p < puffs; p++) {
      const t = p / (puffs - 1) - 0.5
      const r = (1 - Math.abs(t) * 1.1) * (9 + rand() * 7)
      const puff = new Mesh(geo, mat)
      puff.scale.set(r, r * 0.8, r)
      puff.position.set(t * len, r * 0.25 + rand() * 3, (rand() - 0.5) * 8)
      cloud.add(puff)
    }
    const flat = new Mesh(geo, mat) // flat underside
    flat.scale.set(len * 0.62, 4, 9)
    cloud.add(flat)
    cloud.position.set(Math.cos(ang) * dist, 45 + rand() * 60, Math.sin(ang) * dist)
    cloud.lookAt(0, cloud.position.y, 0)
    group.add(cloud)
  }
  return group
}

export function createWorld(scene) {
  const clouds = bake(makeClouds()) // one draw call for every puff
  scene.add(clouds)
  return {
    update(dt) {
      clouds.rotation.y += dt * 0.004
    },
  }
}
