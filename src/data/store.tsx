import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Entry, Food, Profile } from '../lib/types'
import type { Backend, DataState } from './backend'
import { firebaseEnabled } from './config'
import { clearLocal, createLocalBackend, readLocal } from './local'

type FirebaseModule = typeof import('./firebase')

interface Store extends DataState {
  ready: boolean
  /** eingeloggt und mit Firebase synchronisiert */
  user: { uid: string; email: string | null } | null
  cloudAvailable: boolean
  firebase: FirebaseModule | null
  saveProfile(p: Profile): Promise<void>
  putEntry(e: Entry): Promise<void>
  deleteEntry(id: string): Promise<void>
  putFood(f: Food): Promise<void>
  deleteFood(id: string): Promise<void>
}

const Ctx = createContext<Store | null>(null)

const EMPTY: DataState = { profile: null, entries: [], foods: [] }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [data, setData] = useState<DataState>(EMPTY)
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<Store['user']>(null)
  const [fb, setFb] = useState<FirebaseModule | null>(null)

  // Backend wählen: lokal oder (nach Login) Firebase
  useEffect(() => {
    if (!firebaseEnabled) {
      setBackend(createLocalBackend())
      return
    }
    let unsub = () => {}
    let cancelled = false
    import('./firebase')
      .then((mod) => {
        if (cancelled) return
        setFb(mod)
        unsub = mod.watchUser(async (u) => {
          setReady(false)
          if (u) {
            const local = readLocal()
            if (local.profile || local.entries.length || local.foods.length) {
              try {
                await mod.migrateLocalData(u.uid, local)
                clearLocal()
              } catch (err) {
                console.error('Übertragen der lokalen Daten fehlgeschlagen', err)
              }
            }
            setUser({ uid: u.uid, email: u.email })
            setBackend(mod.createFirebaseBackend(u.uid))
          } else {
            setUser(null)
            setBackend(createLocalBackend())
          }
        })
      })
      .catch((err) => {
        console.error('Firebase konnte nicht geladen werden', err)
        setBackend(createLocalBackend())
      })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!backend) return
    return backend.subscribe((s) => {
      setData(s)
      setReady(true)
    })
  }, [backend])

  const value = useMemo<Store>(
    () => ({
      ...data,
      ready: ready && !!backend,
      user,
      cloudAvailable: firebaseEnabled,
      firebase: fb,
      saveProfile: (p) => backend!.saveProfile(p),
      putEntry: (e) => backend!.putEntry(e),
      deleteEntry: (id) => backend!.deleteEntry(id),
      putFood: (f) => backend!.putFood(f),
      deleteFood: (id) => backend!.deleteFood(id),
    }),
    [data, ready, backend, user, fb],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore außerhalb von StoreProvider')
  return s
}

/** Zuletzt gegessene Lebensmittel (ohne Doppelte), neueste zuerst. */
export function recentFoods(entries: Entry[], max = 15): { food: Food; amount: number }[] {
  const seen = new Set<string>()
  const out: { food: Food; amount: number }[] = []
  for (const e of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    if (!e.food) continue
    const key = (e.food.name + '|' + (e.food.brand ?? '')).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ food: e.food, amount: e.amount })
    if (out.length >= max) break
  }
  return out
}
