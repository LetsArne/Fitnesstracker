import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { StoreProvider } from './data/store'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)

// Browser bitten, die lokal gespeicherten Einträge nie automatisch zu löschen
navigator.storage?.persist?.().catch(() => {})

// Offline-Fähigkeit & „Zum Home-Bildschirm“ (nur im echten Build)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
