// Everything the server saves (net.js): each window / module registers a store
// { snapshot() -> part of the save, hydrate(doc) } and net.js merges the snapshots into one
// `saveProgress` and hands the loaded doc to every hydrate().
const stores = []
export const registerStore = (s) => stores.push(s)
export const allStores = () => stores
// Set while a loaded save is being applied, so modules don't count it as play (toasts, rewards).
export const loading = { on: false }
