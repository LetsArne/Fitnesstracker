import type { Backend, DataState } from './backend'

const KEY = 'kalorientracker:v1'

export function readLocal(): DataState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<DataState>
      return { profile: s.profile ?? null, entries: s.entries ?? [], foods: s.foods ?? [] }
    }
  } catch {
    // ignorieren – leerer Zustand
  }
  return { profile: null, entries: [], foods: [] }
}

export function writeLocal(s: DataState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Speicher voll oder blockiert
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // egal
  }
}

/** Speichert alles im Browser des Geräts. */
export function createLocalBackend(): Backend {
  let state = readLocal()
  const listeners = new Set<(s: DataState) => void>()
  const commit = (next: DataState) => {
    state = next
    writeLocal(state)
    listeners.forEach((l) => l(state))
  }

  return {
    subscribe(cb) {
      listeners.add(cb)
      cb(state)
      return () => listeners.delete(cb)
    },
    async saveProfile(profile) {
      commit({ ...state, profile })
    },
    async putEntry(e) {
      commit({ ...state, entries: [...state.entries.filter((x) => x.id !== e.id), e] })
    },
    async deleteEntry(id) {
      commit({ ...state, entries: state.entries.filter((x) => x.id !== id) })
    },
    async putFood(f) {
      commit({ ...state, foods: [...state.foods.filter((x) => x.id !== f.id), f] })
    },
    async deleteFood(id) {
      commit({ ...state, foods: state.foods.filter((x) => x.id !== id) })
    },
  }
}
