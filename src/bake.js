import { Group, Matrix4, Mesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// --- Baking: one mesh per material ------------------------------------------------
// Props are built from many small meshes (a palm is ~20); merging the ones
// that share a look keeps a set piece to a handful of draw calls (mobile).
const matKey = (m) => [m.type, m.color?.getHexString(), m.emissive?.getHexString(), m.vertexColors, m.side, m.flatShading, m.transparent, m.opacity, m.blending, m.map?.uuid, m.roughness, m.metalness, m.userData.k].join('|')
const rel = new Matrix4()
export function bake(root, castShadow = false) {
  root.updateMatrixWorld(true)
  const inv = root.matrixWorld.clone().invert()
  const groups = new Map() // key -> { mat, geos }
  const out = new Group()
  root.traverse((o) => {
    if (!o.isMesh) return
    rel.multiplyMatrices(inv, o.matrixWorld)
    if (Array.isArray(o.material)) {
      out.add(new Mesh(o.geometry.clone().applyMatrix4(rel), o.material)) // multi-material: kept as is
      return
    }
    const key = matKey(o.material)
    let e = groups.get(key)
    if (!e) groups.set(key, (e = { mat: o.material, geos: [] }))
    e.geos.push((o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(rel))
  })
  for (const { mat, geos } of groups.values()) {
    const names = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n]))
    for (const g of geos) {
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n)
      g.morphAttributes = {}
      g.clearGroups()
    }
    const merged = mergeGeometries(geos)
    for (const g of geos) g.dispose()
    if (merged) out.add(new Mesh(merged, mat))
  }
  // The merged geometry is in root's local space: the result takes root's own transform.
  out.position.copy(root.position)
  out.quaternion.copy(root.quaternion)
  out.scale.copy(root.scale)
  out.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = castShadow
    o.receiveShadow = true
  })
  return out
}

// In place: merges every mesh under `root` that never moves into one mesh per
// material (and shadow flag). Anything under an object flagged
// userData.dynamic (bobbing, spinning) is left alone, as are meshes with
// children. Materials stay shared, so animated textures and colours still work.
export function bakeStatic(root) {
  root.updateMatrixWorld(true)
  const inv = root.matrixWorld.clone().invert()
  const found = []
  const walk = (o) => {
    if (o.userData.dynamic) return
    if (o.isMesh && !Array.isArray(o.material) && o.children.length === 0) found.push(o)
    for (const c of o.children) walk(c)
  }
  walk(root)
  const groups = new Map()
  for (const o of found) {
    rel.multiplyMatrices(inv, o.matrixWorld)
    const key = `${matKey(o.material)}|${o.castShadow}|${o.renderOrder}`
    let e = groups.get(key)
    if (!e) groups.set(key, (e = { mat: o.material, cast: o.castShadow, order: o.renderOrder, geos: [] }))
    e.geos.push((o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(rel))
    o.removeFromParent()
    o.geometry.dispose()
  }
  for (const { mat, cast, order, geos } of groups.values()) {
    const names = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n]))
    for (const g of geos) {
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n)
      g.morphAttributes = {}
      g.clearGroups()
    }
    const merged = mergeGeometries(geos)
    for (const g of geos) g.dispose()
    if (!merged) continue
    const m = new Mesh(merged, mat)
    m.castShadow = cast
    m.receiveShadow = true
    m.renderOrder = order
    root.add(m)
  }
}
