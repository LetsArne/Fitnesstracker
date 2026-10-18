import type { Entry, Food, Profile } from '../lib/types'

export interface DataState {
  profile: Profile | null
  entries: Entry[]
  foods: Food[]
}

export interface Backend {
  subscribe(cb: (s: DataState) => void): () => void
  saveProfile(p: Profile): Promise<void>
  putEntry(e: Entry): Promise<void>
  deleteEntry(id: string): Promise<void>
  putFood(f: Food): Promise<void>
  deleteFood(id: string): Promise<void>
}

/** Firestore lehnt `undefined` ab – deshalb vor dem Speichern entfernen. */
export function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
