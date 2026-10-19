import { useEffect, useRef, useState } from 'react'
import { fmt } from '../lib/nutrition'

/**
 * Zahl mit Pfeilen ▲▼ zum Anpassen. Gedrückt halten zählt schneller,
 * Antippen der Zahl öffnet ein Eingabefeld zum direkten Eintippen.
 */
export function NutrientDial({
  value,
  onChange,
  step,
  digits,
  label,
  color,
  changed,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  digits: number
  label: string
  color?: string
  changed?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const timer = useRef<number | undefined>(undefined)
  // aktueller Wert für das Wiederholen beim Gedrückthalten
  const current = useRef(value)
  current.current = value

  const round = (v: number) => Math.max(0, Math.round(v / step) * step)
  const bump = (dir: 1 | -1) => {
    const next = round(current.current + dir * step)
    current.current = next
    onChange(next)
  }

  const stop = () => window.clearTimeout(timer.current)
  useEffect(() => stop, [])

  const press = (dir: 1 | -1) => (e: React.PointerEvent) => {
    e.preventDefault()
    bump(dir)
    // nach kurzem Halten automatisch weiterzählen, immer schneller
    let delay = 380
    const repeat = () => {
      bump(dir)
      delay = Math.max(50, delay * 0.8)
      timer.current = window.setTimeout(repeat, delay)
    }
    stop()
    timer.current = window.setTimeout(repeat, delay)
  }

  const commit = () => {
    const n = parseFloat(text.replace(',', '.'))
    if (Number.isFinite(n) && n >= 0) onChange(n)
    setEditing(false)
  }

  const arrow = (dir: 1 | -1) => (
    <button
      className="dial-arrow"
      aria-label={`${label} ${dir > 0 ? 'mehr' : 'weniger'}`}
      onPointerDown={press(dir)}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {dir > 0 ? '▲' : '▼'}
    </button>
  )

  return (
    <div className={'dial' + (changed ? ' changed' : '')}>
      {arrow(1)}
      {editing ? (
        <input
          autoFocus
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-label={label}
        />
      ) : (
        <button
          className="dial-value"
          style={color ? { color } : undefined}
          onClick={() => {
            setText(fmt(value, digits).replace(/\./g, ''))
            setEditing(true)
          }}
          aria-label={`${label}: ${fmt(value, digits)}, antippen zum Eintippen`}
        >
          {fmt(value, digits)}
        </button>
      )}
      {arrow(-1)}
      <span className="dial-label">{label}</span>
    </div>
  )
}
