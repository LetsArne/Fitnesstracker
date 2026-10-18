import { useState } from 'react'
import { History } from './components/History'
import { ProfileForm } from './components/ProfileForm'
import { Settings } from './components/Settings'
import { Today } from './components/Today'
import { Toaster } from './components/ui'
import { useStore } from './data/store'

type Tab = 'today' | 'history' | 'settings'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'today', icon: '🍽️', label: 'Heute' },
  { id: 'history', icon: '📈', label: 'Verlauf' },
  { id: 'settings', icon: '👤', label: 'Profil' },
]

function Welcome() {
  const { saveProfile } = useStore()
  return (
    <div className="app">
      <div style={{ textAlign: 'center', margin: '24px 0 20px' }}>
        <div className="hero-emoji">🥗</div>
        <h1>Hi! Schön, dass du da bist.</h1>
        <p className="muted">Ein paar Angaben, dann berechnen wir deine Tagesziele für Kalorien und Protein.</p>
      </div>
      <div className="card">
        <ProfileForm initial={null} submitLabel="Los geht's" onSave={saveProfile} />
      </div>
    </div>
  )
}

export function App() {
  const { ready, profile } = useStore()
  const [tab, setTab] = useState<Tab>('today')

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="hero-emoji">🥗</div>
      </div>
    )
  }

  if (!profile) return <Welcome />

  return (
    <>
      <main className="app">
        {tab === 'today' && <Today />}
        {tab === 'history' && <History />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="nav">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <Toaster />
    </>
  )
}
