import { useState } from 'react'
import { useStore } from '../data/store'
import { fmt, scale } from '../lib/nutrition'
import { MEALS, type Food, type Meal, type Nutrients } from '../lib/types'
import { NutrientDial } from './NutrientDial'
import { favKey, sourceBadge, toast } from './ui'

/** Menge wählen und bestätigen – für neue und bestehende Einträge. */
export function FoodConfirm({
  food,
  initialAmount,
  meal: initialMeal,
  confirmLabel = 'Hinzufügen',
  onConfirm,
  onDelete,
  hideMeal,
}: {
  food: Food
  initialAmount?: number
  meal: Meal
  confirmLabel?: string
  /** `food` enthält evtl. angepasste Nährwerte */
  onConfirm: (amount: number, meal: Meal, food: Food) => void
  onDelete?: () => void
  /** z. B. beim Bearbeiten einer Rezept-Zutat */
  hideMeal?: boolean
}) {
  const { foods, putFood, deleteFood } = useStore()
  const defaultAmount = initialAmount ?? food.portions[0]?.grams ?? 100
  const [text, setText] = useState(String(defaultAmount))
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const amount = Math.max(0, parseFloat(text.replace(',', '.')) || 0)
  // Angepasste Nährwerte werden pro 100 g gespeichert, damit sie mit der Menge mitwachsen
  const [per100, setPer100] = useState<Nutrients>(food.per100)
  const [remember, setRemember] = useState(false)
  const n = scale(per100, amount)
  const unit = food.unit
  const isChanged = (k: keyof Nutrients) => Math.abs(per100[k] - food.per100[k]) > 1e-6
  const anyChanged = (['kcal', 'protein', 'carbs', 'fat'] as const).some(isChanged)
  const setTotal = (k: keyof Nutrients, total: number) => {
    if (amount > 0) setPer100({ ...per100, [k]: (total / amount) * 100 })
  }

  const confirm = async () => {
    let result: Food = { ...food, per100 }
    if (anyChanged && remember) {
      // Eigene Variante speichern – wird ab jetzt bei Suche, Scan und Schnelleingabe bevorzugt
      result =
        food.source === 'custom'
          ? result
          : {
              ...result,
              id: 'own-' + (food.baseId ?? food.id),
              source: 'custom',
              baseId: food.source === 'db' ? food.id : food.baseId,
              favorite: undefined,
            }
      await putFood(result)
      toast(`✓ Werte für ${food.name} gemerkt`)
    }
    onConfirm(amount, meal, result)
  }

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
                {fmt(per100.kcal)} kcal · {fmt(per100.protein, 1)} g Protein / 100 {unit}
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

      <div className="card" style={{ marginBottom: 0, padding: '10px 8px' }}>
        <div className="totals">
          <NutrientDial label="kcal" value={n.kcal} step={5} digits={0} color="var(--kcal)" changed={isChanged('kcal')} onChange={(v) => setTotal('kcal', v)} />
          <NutrientDial label="Protein g" value={n.protein} step={0.5} digits={1} color="var(--protein)" changed={isChanged('protein')} onChange={(v) => setTotal('protein', v)} />
          <NutrientDial label="KH g" value={n.carbs} step={1} digits={1} changed={isChanged('carbs')} onChange={(v) => setTotal('carbs', v)} />
          <NutrientDial label="Fett g" value={n.fat} step={0.5} digits={1} changed={isChanged('fat')} onChange={(v) => setTotal('fat', v)} />
        </div>
        {anyChanged ? (
          <div className="row spread small" style={{ marginTop: 8, padding: '0 6px' }}>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 18, height: 18 }} />
              Für „{food.name}“ merken
            </label>
            <button className="muted" onClick={() => setPer100(food.per100)}>
              ↺ zurücksetzen
            </button>
          </div>
        ) : (
          <div className="small muted" style={{ textAlign: 'center', marginTop: 6 }}>
            Werte anders? Mit ▲▼ anpassen oder Zahl antippen
          </div>
        )}
      </div>

      {!hideMeal && <div className="seg">
        {MEALS.map((m) => (
          <button key={m.id} className={meal === m.id ? 'on' : ''} onClick={() => setMeal(m.id)}>
            {m.label.replace('essen', '')}
          </button>
        ))}
      </div>}

      <button className="btn btn-primary btn-block" disabled={amount <= 0} onClick={confirm}>
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
