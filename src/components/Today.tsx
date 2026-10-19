import { useState } from 'react'
import { useStore } from '../data/store'
import { addDays, labelFor, mealForNow, todayKey } from '../lib/date'
import { fmt, scale, totals, uid } from '../lib/nutrition'
import { MEALS, type Entry, type Meal, type Nutrients } from '../lib/types'
import { AddSheet } from './AddSheet'
import { FoodConfirm } from './FoodConfirm'
import { Sheet, amountLabel, toast } from './ui'

function Ring({ value, target, color, size = 150, children }: { value: number; target: number; color: string; size?: number; children: React.ReactNode }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = target > 0 ? Math.min(1, value / target) : 0
  return (
    <div className="ring">
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

function Summary({ eaten, targets }: { eaten: Nutrients; targets: Nutrients }) {
  const left = targets.kcal - eaten.kcal
  const proteinLeft = targets.protein - eaten.protein
  return (
    <div className="card">
      <div className="summary">
        <div>
          <Ring value={eaten.kcal} target={targets.kcal} color="var(--kcal)">
            <div className="ring-value">{fmt(Math.abs(left))}</div>
            <div className="ring-label">{left >= 0 ? 'kcal übrig' : 'kcal drüber'}</div>
          </Ring>
          <div className="ring-caption num">
            {fmt(eaten.kcal)} / {fmt(targets.kcal)} kcal
          </div>
        </div>
        <div>
          <Ring value={eaten.protein} target={targets.protein} color="var(--protein)">
            {proteinLeft <= 0 ? (
              <>
                <div className="ring-value">💪</div>
                <div className="ring-label">Protein-Ziel geschafft</div>
              </>
            ) : (
              <>
                <div className="ring-value">{fmt(proteinLeft)} g</div>
                <div className="ring-label">Protein fehlt</div>
              </>
            )}
          </Ring>
          <div className="ring-caption num">
            {fmt(eaten.protein)} / {fmt(targets.protein)} g Protein
          </div>
        </div>
      </div>
      <div className="macros">
        {(
          [
            ['Kohlenhydrate', eaten.carbs, targets.carbs, 'var(--carbs)'],
            ['Fett', eaten.fat, targets.fat, 'var(--fat)'],
          ] as const
        ).map(([label, v, t, color]) => (
          <div key={label}>
            <div className="row spread small">
              <span>{label}</span>
              <span className="muted num">
                {fmt(v)} / {fmt(t)} g
              </span>
            </div>
            <div className="bar">
              <div style={{ width: `${Math.min(100, t ? (v / t) * 100 : 0)}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Today() {
  const { entries, profile, putEntry, deleteEntry } = useStore()
  const [date, setDate] = useState(todayKey())
  const [adding, setAdding] = useState<Meal | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)

  const dayEntries = entries.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt)
  const eaten = totals(dayEntries)
  const yesterday = addDays(date, -1)

  const copyFromYesterday = async (meal: Meal) => {
    const src = entries.filter((e) => e.date === yesterday && e.meal === meal)
    for (const e of src) await putEntry({ ...e, id: uid(), date, createdAt: Date.now() })
    toast(`✓ ${src.length} ${src.length === 1 ? 'Eintrag' : 'Einträge'} von gestern übernommen`)
  }

  return (
    <>
      <div className="daynav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Vorheriger Tag">
          ‹
        </button>
        <button onClick={() => setDate(todayKey())}>
          <h1>{labelFor(date)}</h1>
        </button>
        <button
          className="icon-btn"
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Nächster Tag"
          style={{ visibility: date >= todayKey() ? 'hidden' : 'visible' }}
        >
          ›
        </button>
      </div>

      {profile && <Summary eaten={eaten} targets={profile.targets} />}

      {MEALS.map((m) => {
        const list = dayEntries.filter((e) => e.meal === m.id)
        const t = totals(list)
        const canCopy = !list.length && entries.some((e) => e.date === yesterday && e.meal === m.id)
        return (
          <div className="card" key={m.id}>
            <div className="meal-head">
              <h3>
                {m.emoji} {m.label}
              </h3>
              {list.length > 0 && (
                <span className="small muted num">
                  {fmt(t.kcal)} kcal · <span className="protein-tag">{fmt(t.protein)} g P</span>
                </span>
              )}
            </div>
            {list.map((e) => (
              <button className="entry" key={e.id} onClick={() => setEditing(e)}>
                <div className="grow">
                  <div className="ellipsis">{e.name}</div>
                  <div className="small muted ellipsis">
                    {e.brand ? e.brand + ' · ' : ''}
                    {amountLabel(e.food, e.amount, e.unit)}
                  </div>
                </div>
                <div className="entry-kcal">
                  {fmt(e.nutrients.kcal)}
                  <div className="small protein-tag">{fmt(e.nutrients.protein)} g P</div>
                </div>
              </button>
            ))}
            <div className="row" style={{ gap: 16 }}>
              <button className="add-link" onClick={() => setAdding(m.id)}>
                + Hinzufügen
              </button>
              {canCopy && (
                <button className="add-link" style={{ color: 'var(--ink-2)' }} onClick={() => copyFromYesterday(m.id)}>
                  ↻ Wie gestern
                </button>
              )}
            </div>
          </div>
        )
      })}

      <button className="fab" onClick={() => setAdding(date === todayKey() ? mealForNow() : 'snack')}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>+</span> Essen eintragen
      </button>

      {adding && <AddSheet date={date} meal={adding} onClose={() => setAdding(null)} />}

      {editing && (
        <Sheet title="Eintrag bearbeiten" onClose={() => setEditing(null)}>
          {editing.food ? (
            <FoodConfirm
              food={editing.food}
              initialAmount={editing.amount}
              meal={editing.meal}
              confirmLabel="Speichern"
              onConfirm={async (amount, meal, food) => {
                await putEntry({ ...editing, amount, meal, food, nutrients: scale(food.per100, amount) })
                setEditing(null)
              }}
              onDelete={async () => {
                await deleteEntry(editing.id)
                setEditing(null)
                toast('Eintrag gelöscht')
              }}
            />
          ) : (
            <button
              className="btn btn-danger btn-block"
              onClick={async () => {
                await deleteEntry(editing.id)
                setEditing(null)
              }}
            >
              Eintrag löschen
            </button>
          )}
        </Sheet>
      )}
    </>
  )
}
