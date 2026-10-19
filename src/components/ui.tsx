import { useEffect, useState, type ReactNode } from 'react'
import { fmt } from '../lib/nutrition'
import type { Food } from '../lib/types'

export function Sheet({
  title,
  onClose,
  onBack,
  full,
  children,
}: {
  title: string
  onClose: () => void
  onBack?: () => void
  full?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={'sheet' + (full ? ' full' : '')} role="dialog" aria-label={title}>
        <div className="sheet-head">
          {onBack && (
            <button className="icon-btn" onClick={onBack} aria-label="Zurück">
              ←
            </button>
          )}
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}

// Kleine Benachrichtigung oben („3 Einträge hinzugefügt“)
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: message }))
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let timer: number | undefined
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMsg(null), 2200)
    }
    window.addEventListener('app-toast', on)
    return () => window.removeEventListener('app-toast', on)
  }, [])
  return msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null
}

/** „2 × Scheibe“ statt „50 g“, wenn die Menge genau zu einer Portion passt. */
export function amountLabel(food: Food | undefined, amount: number, unit: string): string {
  if (food?.direct) {
    const n = amount / 100
    return n === 1 ? '1 Portion' : `${fmt(n, 1)} Portionen`
  }
  if (food) {
    for (const p of [...food.portions].sort((a, b) => b.grams - a.grams)) {
      const n = amount / p.grams
      if (n > 0 && n <= 4 && Math.abs(n * 2 - Math.round(n * 2)) < 0.001) {
        return `${n === 1 ? '' : fmt(n, 1) + ' × '}${p.label} (${fmt(amount)} ${unit})`
      }
    }
  }
  return `${fmt(amount)} ${unit}`
}

/** Schlüssel, unter dem ein Lebensmittel als Favorit gespeichert wird. */
export function favKey(food: Food): string {
  return food.source === 'custom' || food.id.startsWith('fav-') ? food.id : 'fav-' + food.id
}

export function sourceBadge(food: Food) {
  if (food.source === 'off') return <span className="badge">Produkt</span>
  if (food.recipe) return <span className="badge">Rezept</span>
  if (food.source === 'custom') return <span className="badge">Eigenes</span>
  return null
}
