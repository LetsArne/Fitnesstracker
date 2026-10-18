import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  limit,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { addDays, todayKey } from '../lib/date'
import type { Entry, Food, Profile } from '../lib/types'
import { clean, type Backend, type DataState } from './backend'
import { firebaseConfig as config, firebaseEnabled } from './config'

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function init() {
  if (!firebaseEnabled) throw new Error('Firebase ist nicht konfiguriert')
  if (!app) {
    app = initializeApp(config)
    auth = getAuth(app)
    // Offline-Cache: App funktioniert auch ohne Netz und synchronisiert später
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  }
  return { auth: auth!, db: db! }
}

export function watchUser(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(init().auth, cb)
}

export const authActions = {
  google: () => signInWithPopup(init().auth, new GoogleAuthProvider()),
  login: (email: string, pw: string) => signInWithEmailAndPassword(init().auth, email, pw),
  register: (email: string, pw: string) => createUserWithEmailAndPassword(init().auth, email, pw),
  reset: (email: string) => sendPasswordResetEmail(init().auth, email),
  logout: () => signOut(init().auth),
}

/** Wie viele Tage rückwirkend live geladen werden (reicht für Verlauf & „Zuletzt gegessen“). */
const HISTORY_DAYS = 90

export function createFirebaseBackend(uid: string): Backend {
  const { db } = init()
  const userDoc = doc(db, 'users', uid)
  const entriesCol = collection(db, 'users', uid, 'entries')
  const foodsCol = collection(db, 'users', uid, 'foods')

  return {
    subscribe(cb) {
      const state: DataState = { profile: null, entries: [], foods: [] }
      let loaded = 0
      const emit = () => {
        if (loaded >= 3) cb({ ...state })
      }
      const once = new Set<string>()
      const mark = (k: string) => {
        if (!once.has(k)) {
          once.add(k)
          loaded++
        }
      }
      const unsubs = [
        onSnapshot(userDoc, (s) => {
          state.profile = (s.data()?.profile as Profile | undefined) ?? null
          mark('p')
          emit()
        }),
        onSnapshot(query(entriesCol, where('date', '>=', addDays(todayKey(), -HISTORY_DAYS))), (s) => {
          state.entries = s.docs.map((d) => d.data() as Entry)
          mark('e')
          emit()
        }),
        onSnapshot(foodsCol, (s) => {
          state.foods = s.docs.map((d) => d.data() as Food)
          mark('f')
          emit()
        }),
      ]
      return () => unsubs.forEach((u) => u())
    },
    async saveProfile(profile) {
      await setDoc(userDoc, { profile: clean(profile) }, { merge: true })
    },
    async putEntry(e) {
      await setDoc(doc(entriesCol, e.id), clean(e))
    },
    async deleteEntry(id) {
      await deleteDoc(doc(entriesCol, id))
    },
    async putFood(f) {
      await setDoc(doc(foodsCol, f.id), clean(f))
    },
    async deleteFood(id) {
      await deleteDoc(doc(foodsCol, id))
    },
  }
}

/** Überträgt die bisher nur lokal gespeicherten Daten nach dem ersten Login ins Konto. */
export async function migrateLocalData(uid: string, local: DataState): Promise<void> {
  const { db } = init()
  const existing = await getDocs(query(collection(db, 'users', uid, 'entries'), limit(1)))
  const batchSize = 400
  const writes: [ReturnType<typeof doc>, object][] = []
  if (local.profile && existing.empty) writes.push([doc(db, 'users', uid), { profile: clean(local.profile) }])
  for (const e of local.entries) writes.push([doc(db, 'users', uid, 'entries', e.id), clean(e)])
  for (const f of local.foods) writes.push([doc(db, 'users', uid, 'foods', f.id), clean(f)])
  for (let i = 0; i < writes.length; i += batchSize) {
    const batch = writeBatch(db)
    for (const [ref, data] of writes.slice(i, i + batchSize)) batch.set(ref, data, { merge: true })
    await batch.commit()
  }
}

export type { User }
