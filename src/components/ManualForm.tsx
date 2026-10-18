import { useState } from 'react'
import { uid } from '../lib/nutrition'
import { MEALS, type Food, type Meal, type Nutrients } from '../lib/types'

export interface ManualInitial {
  name?: string
  brand?: string
  barcode?: string
  per100?: Partial<Nutrients>
}

type Mode = 'per100' | 'total'

const FIELDS: { key: keyof Nutrients; label: string }[] = [
  { key: 'kcal', label: 'Kalorien (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Kohlenhydrate (g)' },
  { key: 'fat', label: 'Fett (g)' },
]

function toText(v: number | undefined) {
  return v === undefined ? '' : String(v).replace('.', ',')
}

function toNum(s: string) {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Lebensmittel von Hand anlegen – pro 100 g oder einfach Gesamtwerte. */
export function ManualForm({
  initial,
  meal: initialMeal,
  onSubmit,
}: {
  initial?: ManualInitial
  meal: Meal
  onSubmit: (food: Food, amount: number, meal: Meal, save: boolean) => void
}) {
  const hasPer100 = !!initial?.per100 || !!initial?.barcode
  const [mode, setMode] = useState<Mode>(hasPer100 ? 'per100' : 'total')
  const [name, setName] = useState(initial?.name ?? '')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [values, setValues] = useState<Record<keyof Nutrients, string>>({
    kcal: toText(initial?.per100?.kcal),
    protein: toText(initial?.per100?.protein),
    carbs: toText(initial?.per100?.carbs),
    fat: toText(initial?.per100?.fat),
  })
  const [amount, setAmount] = useState('100')
  const [portion, setPortion] = useState('')
  const [unit, setUnit] = useState<'g' | 'ml'>('g')
  const [save, setSave] = useState(hasPer100)
  const [meal, setMeal] = useState<Meal>(initialMeal)

  const valid = name.trim() && values.kcal.trim() && (mode === 'total' || toNum(amount) > 0)

  const submit = () => {
    const nutrients: Nutrients = {
      kcal: toNum(values.kcal),
      protein: toNum(values.protein),
      carbs: toNum(values.carbs),
      fat: toNum(values.fat),
    }
    const portionGrams = toNum(portion)
    const food: Food = {
      id: 'custom-' + uid(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      per100: nutrients,
      unit: mode === 'total' ? 'g' : unit,
      portions:
        mode === 'total'
          ? [{ label: 'Portion', grams: 100 }]
          : portionGrams > 0
            ? [{ label: 'Portion', grams: portionGrams }]
            : [],
      barcode: initial?.barcode,
      source: 'custom',
      direct: mode === 'total' || undefined,
    }
    onSubmit(food, mode === 'total' ? 100 : toNum(amount), meal, save)
  }

  return (
    <div className="stack">
      <div className="seg">
        <button className={mode === 'total' ? 'on' : ''} onClick={() => setMode('total')}>
          Schnell (Gesamtwerte)
        </button>
        <button className={mode === 'per100' ? 'on' : ''} onClick={() => setMode('per100')}>
          Pro 100 g
        </button>
      </div>

      <label className="field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Mensa-Pasta" />
      </label>
      {mode === 'per100' && (
        <label className="field">
          Marke (optional)
          <input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </label>
      )}

      <div className="small muted">
        {mode === 'per100' ? `Nährwerte pro 100 ${unit} (steht auf der Packung)` : 'Was hatte die ganze Portion ungefähr?'}
      </div>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <label className="field" key={f.key}>
            {f.label}
            <input
              inputMode="decimal"
              value={values[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              placeholder={f.key === 'kcal' ? '' : 'optional'}
            />
          </label>
        ))}
      </div>

      {mode === 'per100' && (
        <>
          <div className="form-grid">
            <label className="field">
              Gegessen ({unit})
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="field">
              Portionsgröße (optional)
              <input inputMode="decimal" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder={unit} />
            </label>
          </div>
          <div className="seg">
            <button className={unit === 'g' ? 'on' : ''} onClick={() => setUnit('g')}>
              Gramm
            </button>
            <button className={unit === 'ml' ? 'on' : ''} onClick={() => setUnit('ml')}>
              Milliliter
            </button>
          </div>
        </>
      )}

      <div className="seg">
        {MEALS.map((m) => (
          <button key={m.id} className={meal === m.id ? 'on' : ''} onClick={() => setMeal(m.id)}>
            {m.label.replace('essen', '')}
          </button>
        ))}
      </div>

      <label className="row" style={{ gap: 10 }}>
        <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} style={{ width: 22, height: 22 }} />
        <span>
          In „Meine Lebensmittel“ speichern
          {initial?.barcode && <span className="muted small"> – beim nächsten Scan sofort da</span>}
        </span>
      </label>

      <button className="btn btn-primary btn-block" disabled={!valid} onClick={submit}>
        Hinzufügen
      </button>
    </div>
  )
}
