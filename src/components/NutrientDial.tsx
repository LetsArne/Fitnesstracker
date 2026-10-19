import { useRef, useState } from 'react'
import { fmt } from '../lib/nutrition'

/**
 * Zahl, die man durch Hoch-/Runterwischen verändert (wie ein Drehrad).
 * Antippen öffnet ein Eingabefeld zum direkten Eintippen.
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
  const drag = useRef<{ y: number; start: number; moved: boolean; last: number } | null>(null)

  // 10 px Wischen = ein Schritt
  const PX_PER_STEP = 10
  const round = (v: number) => Math.max(0, Math.round(v / step) * step)

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, start: round(value), moved: false, last: round(value) }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = d.y - e.clientY
    if (Math.abs(dy) > 4) d.moved = true
    if (!d.moved) return
    const next = round(d.start + Math.round(dy / PX_PER_STEP) * step)
    if (next !== d.last) {
      d.last = next
      navigator.vibrate?.(4)
      onChange(next)
    }
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) {
      setText(fmt(value, digits).replace(/\./g, ''))
      setEditing(true)
    }
  }

  const commit = () => {
    const n = parseFloat(text.replace(',', '.'))
    if (Number.isFinite(n) && n >= 0) onChange(n)
    setEditing(false)
  }

  return (
    <div
      className={'dial' + (changed ? ' changed' : '')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onWheel={(e) => !editing && onChange(round(value + (e.deltaY < 0 ? step : -step)))}
      role="spinbutton"
      aria-label={label}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') onChange(round(value + step))
        if (e.key === 'ArrowDown') onChange(round(value - step))
      }}
    >
      <span className="dial-arrow">⌃</span>
      {editing ? (
        <input
          autoFocus
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      ) : (
        <b style={color ? { color } : undefined}>{fmt(value, digits)}</b>
      )}
      <span className="dial-arrow">⌄</span>
      <span className="dial-label">{label}</span>
    </div>
  )
}
