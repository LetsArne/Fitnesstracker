import { useRef, useState } from 'react'
import { useStore } from '../data/store'
import { todayKey } from '../lib/date'
import { fmt } from '../lib/nutrition'
import type { Entry, Food, Profile } from '../lib/types'
import { ProfileForm } from './ProfileForm'
import { toast } from './ui'

function Account() {
  const { user, firebase } = useStore()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!firebase) return null

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      if (ok) toast(ok)
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(
        code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'E-Mail oder Passwort stimmt nicht.'
          : code.includes('email-already-in-use')
            ? 'Für diese E-Mail gibt es schon ein Konto – bitte anmelden.'
            : code.includes('weak-password')
              ? 'Das Passwort braucht mindestens 6 Zeichen.'
              : code.includes('popup')
                ? 'Das Google-Fenster wurde geschlossen oder blockiert.'
                : 'Das hat nicht geklappt. Bitte nochmal versuchen.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div className="card stack">
        <h3>☁️ Konto & Sync</h3>
        <p className="muted small" style={{ margin: 0 }}>
          Angemeldet als <b>{user.email}</b>. Deine Daten werden auf allen Geräten synchronisiert und funktionieren auch offline.
        </p>
        <button className="btn btn-block" onClick={() => run(firebase.authActions.logout)}>
          Abmelden
        </button>
      </div>
    )
  }

  return (
    <div className="card stack">
      <h3>☁️ Konto & Sync</h3>
      <p className="muted small" style={{ margin: 0 }}>
        Optional: Mit Konto sind deine Daten gesichert und auf Handy, Tablet & Laptop gleich. Bisherige Einträge werden übernommen.
      </p>
      <input type="email" autoComplete="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" autoComplete="current-password" placeholder="Passwort" value={pw} onChange={(e) => setPw(e.target.value)} />
      {error && <div className="notice">{error}</div>}
      <div className="row">
        <button className="btn btn-primary grow" disabled={busy || !email || !pw} onClick={() => run(() => firebase.authActions.login(email, pw), 'Angemeldet')}>
          Anmelden
        </button>
        <button className="btn grow" disabled={busy || !email || !pw} onClick={() => run(() => firebase.authActions.register(email, pw), 'Konto erstellt')}>
          Registrieren
        </button>
      </div>
      <button className="btn btn-block" disabled={busy} onClick={() => run(firebase.authActions.google, 'Angemeldet')}>
        Mit Google anmelden
      </button>
      <button
        className="btn btn-ghost btn-block small"
        disabled={busy || !email}
        onClick={() => run(() => firebase.authActions.reset(email), 'E-Mail zum Zurücksetzen gesendet')}
      >
        Passwort vergessen?
      </button>
    </div>
  )
}

export function Settings() {
  const store = useStore()
  const { profile, saveProfile, foods, deleteFood, entries, putEntry, putFood, user, cloudAvailable } = store
  const fileRef = useRef<HTMLInputElement>(null)
  const ownFoods = foods.filter((f) => f.source === 'custom' || f.favorite)

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, entries, foods }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kalorientracker-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file: File | undefined) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as { profile?: Profile; entries?: Entry[]; foods?: Food[] }
      if (data.profile) await saveProfile(data.profile)
      for (const f of data.foods ?? []) await putFood(f)
      for (const e of data.entries ?? []) await putEntry(e)
      toast(`✓ ${data.entries?.length ?? 0} Einträge importiert`)
    } catch {
      toast('Datei konnte nicht gelesen werden')
    }
  }

  return (
    <>
      <div className="daynav">
        <h1>Profil</h1>
      </div>

      <div className="card">
        <ProfileForm
          key={JSON.stringify(profile)}
          initial={profile}
          submitLabel="Speichern"
          onSave={async (p) => {
            await saveProfile(p)
            toast('✓ Ziele gespeichert')
          }}
        />
      </div>

      <Account />

      {ownFoods.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Meine Lebensmittel & Favoriten</h3>
          {ownFoods.map((f) => (
            <div className="entry" key={f.id}>
              <div className="grow">
                <div className="ellipsis">
                  {f.favorite ? '⭐ ' : ''}
                  {f.name}
                </div>
                <div className="small muted">
                  {f.direct ? 'pro Portion' : `pro 100 ${f.unit}`}: {fmt(f.per100.kcal)} kcal · {fmt(f.per100.protein, 1)} g P
                  {f.barcode ? ' · ▥ ' + f.barcode : ''}
                </div>
              </div>
              <button
                className="icon-btn"
                aria-label="Löschen"
                onClick={async () => {
                  if (confirm(`„${f.name}“ löschen?`)) await deleteFood(f.id)
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card stack">
        <h3>Daten</h3>
        {!user && (
          <p className="muted small" style={{ margin: 0 }}>
            {cloudAvailable
              ? 'Ohne Anmeldung werden deine Daten nur auf diesem Gerät gespeichert.'
              : 'Deine Daten werden nur auf diesem Gerät gespeichert. Mach ab und zu ein Backup.'}
          </p>
        )}
        <div className="row">
          <button className="btn grow" onClick={exportData}>
            Backup speichern
          </button>
          <button className="btn grow" onClick={() => fileRef.current?.click()}>
            Backup laden
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importData(e.target.files?.[0])} />
      </div>

      <p className="small muted" style={{ textAlign: 'center' }}>
        Produktdaten: <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>Open Food Facts</a> (ODbL)
        <br />
        Die Werte sind Richtwerte und ersetzen keine Ernährungsberatung.
      </p>
    </>
  )
}
