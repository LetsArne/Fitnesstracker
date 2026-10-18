import { useState } from 'react'
import { useStore } from '../data/store'
import { fmt, scale } from '../lib/nutrition'
import { MEALS, type Food, type Meal } from '../lib/types'
import { favKey, sourceBadge, toast } from './ui'

/** Menge wählen und bestätigen – für neue und bestehende Einträge. */
export function FoodConfirm({
  food,
  initialAmount,
  meal: initialMeal,
  confirmLabel = 'Hinzufügen',
  onConfirm,
  onDelete,
}: {
  food: Food
  initialAmount?: number
  meal: Meal
  confirmLabel?: string
  onConfirm: (amount: number, meal: Meal) => void
  onDelete?: () => void
}) {
  const { foods, putFood, deleteFood } = useStore()
  const defaultAmount = initialAmount ?? food.portions[0]?.grams ?? 100
  const [text, setText] = useState(String(defaultAmount))
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const amount = Math.max(0, parseFloat(text.replace(',', '.')) || 0)
  const n = scale(food.per100, amount)
  const unit = food.unit

  const key = favKey(food)
  const isFav = foods.some((f) => f.id === key && f.favorite)
  const toggleFav = async () => {
    if (isFav) {
      if (food.source === 'custom') await putFood({ ...food, favorite: false })
      else await deleteFood(key)
      toast('Aus Favoriten entfernt')
    } else {
      await putFood({ ...food, id: key, favorite: true })
      toast('⭐ Als Favorit gespeichert')
    }
  }

  const step = (dir: 1 | -1) => {
    const s = food.direct ? 50 : amount >= 100 ? 25 : 10
    setText(String(Math.max(0, Math.round((amount + dir * s) / s) * s)))
  }

  const portions = food.direct
    ? [
        { label: '½ Portion', grams: 50 },
        { label: '1 Portion', grams: 100 },
        { label: '2 Portionen', grams: 200 },
      ]
    : [...food.portions, ...(food.portions.some((p) => p.grams === 100) ? [] : [{ label: '100 ' + unit, grams: 100 }])]

  return (
    <div className="stack">
      <div className="row spread">
        <div className="grow">
          <h2>{food.name}</h2>
          <div className="row small muted" style={{ gap: 6, marginTop: 2 }}>
            {food.brand && <span>{food.brand}</span>}
            {sourceBadge(food)}
            {!food.direct && (
              <span className="num">
                {fmt(food.per100.kcal)} kcal · {fmt(food.per100.protein, 1)} g Protein / 100 {unit}
              </span>
            )}
          </div>
        </div>
        <button className="icon-btn" onClick={toggleFav} aria-label="Favorit" title="Favorit">
          {isFav ? '⭐' : '☆'}
        </button>
      </div>

      <div className="chips">
        {portions.map((p) => (
          <button
            key={p.label}
            className={'chip' + (amount === p.grams ? ' on' : '')}
            onClick={() => setText(String(p.grams))}
          >
            {food.direct || p.label.startsWith('100') ? p.label : `${p.label} · ${p.grams} ${unit}`}
          </button>
        ))}
      </div>

      {!food.direct && (
        <div className="amount">
          <button className="step" onClick={() => step(-1)} aria-label="Weniger">
            −
          </button>
          <div className="grow" style={{ position: 'relative' }}>
            <input
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label={`Menge in ${unit}`}
            />
            <span className="muted" style={{ position: 'absolute', right: 14, top: 16 }}>
              {unit}
            </span>
          </div>
          <button className="step" onClick={() => step(1)} aria-label="Mehr">
            +
          </button>
        </div>
      )}

      <div className="card totals" style={{ marginBottom: 0 }}>
        <div>
          <b style={{ color: 'var(--kcal)' }}>{fmt(n.kcal)}</b>
          <span>kcal</span>
        </div>
        <div>
          <b style={{ color: 'var(--protein)' }}>{fmt(n.protein, 1)}</b>
          <span>Protein g</span>
        </div>
        <div>
          <b>{fmt(n.carbs, 1)}</b>
          <span>KH g</span>
        </div>
        <div>
          <b>{fmt(n.fat, 1)}</b>
          <span>Fett g</span>
        </div>
      </div>

      <div className="seg">
        {MEALS.map((m) => (
          <button key={m.id} className={meal === m.id ? 'on' : ''} onClick={() => setMeal(m.id)}>
            {m.label.replace('essen', '')}
          </button>
        ))}
      </div>

      <button className="btn btn-primary btn-block" disabled={amount <= 0} onClick={() => onConfirm(amount, meal)}>
        {confirmLabel}
      </button>
      {onDelete && (
        <button className="btn btn-danger btn-block" onClick={onDelete}>
          Eintrag löschen
        </button>
      )}
    </div>
  )
}
