import { useState } from 'react'
import { useStore } from '../data/store'
import { addDays, fromKey, labelFor, shortWeekday, todayKey } from '../lib/date'
import { fmt, totals } from '../lib/nutrition'

interface Day {
  key: string
  value: number
  logged: boolean
}

/** Einfaches Balkendiagramm: ein Wert pro Tag + gestrichelte Ziellinie. */
function BarChart({ days, target, color, unit, selected, onSelect }: {
  days: Day[]
  target: number
  color: string
  unit: string
  selected: number
  onSelect: (i: number) => void
}) {
  const W = 340
  const H = 170
  const top = 22
  const bottom = 22
  const max = Math.max(target * 1.15, ...days.map((d) => d.value), 1)
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max)
  const slot = W / days.length
  const barW = Math.max(3, Math.min(22, slot - 4))
  const showEvery = days.length > 10 ? 5 : 1
  const sel = days[selected]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Verlauf ${unit}`}>
      <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} stroke="var(--line)" />
      {days.map((d, i) => {
        const x = i * slot + (slot - barW) / 2
        const h = H - bottom - y(d.value)
        const r = Math.min(4, barW / 2, h)
        return (
          <g key={d.key} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
            <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
            {d.value > 0 && (
              <path
                d={`M${x},${H - bottom} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                fill={color}
                opacity={i === selected ? 1 : 0.55}
              />
            )}
            {(i % showEvery === 0 || i === days.length - 1) && (
              <text x={i * slot + slot / 2} y={H - 6} textAnchor="middle">
                {days.length > 10 ? fromKey(d.key).getDate() + '.' : shortWeekday(d.key)}
              </text>
            )}
          </g>
        )
      })}
      <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--ink-2)" strokeDasharray="4 4" strokeWidth={1.5} />
      <text x={W} y={y(target) - 5} textAnchor="end">
        Ziel {fmt(target)}
      </text>
      {sel && (
        <text className="val" x={Math.min(W - 30, Math.max(30, selected * slot + slot / 2))} y={12} textAnchor="middle">
          {sel.logged ? `${fmt(sel.value)} ${unit}` : 'nichts eingetragen'}
        </text>
      )}
    </svg>
  )
}

export function History() {
  const { entries, profile } = useStore()
  const [range, setRange] = useState<7 | 30>(7)
  const [selected, setSelected] = useState<number | null>(null)
  if (!profile) return null

  const today = todayKey()
  const keys = Array.from({ length: range }, (_, i) => addDays(today, i - range + 1))
  const perDay = keys.map((key) => {
    const list = entries.filter((e) => e.date === key)
    return { key, logged: list.length > 0, n: totals(list) }
  })
  const logged = perDay.filter((d) => d.logged)
  const avg = (f: (d: (typeof perDay)[number]) => number) =>
    logged.length ? logged.reduce((a, d) => a + f(d), 0) / logged.length : 0
  const proteinDays = logged.filter((d) => d.n.protein >= profile.targets.protein).length

  // Serie: wie viele Tage am Stück eingetragen (heute zählt, falls schon etwas drin ist)
  let streak = 0
  for (let k = entries.some((e) => e.date === today) ? today : addDays(today, -1); entries.some((e) => e.date === k); k = addDays(k, -1)) streak++

  const sel = selected ?? range - 1
  const t = profile.targets

  return (
    <>
      <div className="daynav">
        <h1>Verlauf</h1>
        <div className="seg" style={{ width: 160 }}>
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              className={range === r ? 'on' : ''}
              onClick={() => {
                setRange(r)
                setSelected(null)
              }}
            >
              {r} Tage
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 12 }}>
        <div className="stat">
          <b>{fmt(avg((d) => d.n.kcal))}</b>
          <span>Ø kcal / Tag</span>
        </div>
        <div className="stat">
          <b style={{ color: 'var(--protein)' }}>{fmt(avg((d) => d.n.protein))} g</b>
          <span>Ø Protein / Tag</span>
        </div>
        <div className="stat">
          <b>🔥 {streak}</b>
          <span>{streak === 1 ? 'Tag' : 'Tage'} in Folge</span>
        </div>
      </div>

      <div className="card">
        <div className="row spread" style={{ marginBottom: 8 }}>
          <h3>Kalorien</h3>
          <span className="small muted">{labelFor(keys[sel])}</span>
        </div>
        <BarChart
          days={perDay.map((d) => ({ key: d.key, value: d.n.kcal, logged: d.logged }))}
          target={t.kcal}
          color="var(--kcal)"
          unit="kcal"
          selected={sel}
          onSelect={setSelected}
        />
      </div>

      <div className="card">
        <div className="row spread" style={{ marginBottom: 8 }}>
          <h3>Protein</h3>
          <span className="small muted">
            Ziel an {proteinDays} von {logged.length} Tagen erreicht
          </span>
        </div>
        <BarChart
          days={perDay.map((d) => ({ key: d.key, value: d.n.protein, logged: d.logged }))}
          target={t.protein}
          color="var(--protein)"
          unit="g"
          selected={sel}
          onSelect={setSelected}
        />
      </div>

      {!logged.length && <div className="notice">Sobald du ein paar Tage eingetragen hast, siehst du hier deinen Verlauf.</div>}
    </>
  )
}
