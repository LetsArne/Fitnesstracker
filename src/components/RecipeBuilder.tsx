import { useRef, useState } from 'react'
import { useStore } from '../data/store'
import { readText } from '../lib/label'
import { entryFromFood, fmt, scale, uid } from '../lib/nutrition'
import { parseSegment } from '../lib/parser'
import { parseRecipe, recipeToFood, recipeTotals, type Ingredient } from '../lib/recipe'
import type { Meal } from '../lib/types'
import { FoodConfirm } from './FoodConfirm'
import { Sheet, amountLabel, toast } from './ui'

type Step = 'input' | 'reading' | 'review'

/** Rezept per Screenshot oder eingefügtem Text → Zutaten → Werte pro Portion. */
export function RecipeBuilder({
  date,
  meal,
  onClose,
  onBack,
}: {
  date: string
  meal: Meal
  onClose: () => void
  onBack: () => void
}) {
  const { foods, putFood, putEntry } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('input')
  const [pasted, setPasted] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(1)
  const [items, setItems] = useState<Ingredient[]>([])
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [fixing, setFixing] = useState<{ id: string; text: string } | null>(null)
  const [newLine, setNewLine] = useState('')
  const [eaten, setEaten] = useState(1)
  const [save, setSave] = useState(true)

  const load = (text: string) => {
    const r = parseRecipe(text, foods)
    setName(r.title)
    setServings(r.servings)
    setItems(r.ingredients)
    setStep('review')
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setPhoto(URL.createObjectURL(file))
    setStep('reading')
    setProgress(0)
    try {
      load(await readText(file, setProgress))
    } catch (err) {
      console.error(err)
      load('')
    }
  }

  const reparse = (text: string): Ingredient => {
    const p = parseSegment(text, false, foods)
    return { id: uid(), text, food: p.food, amount: p.food ? p.amount : 0 }
  }

  const { nutrients: total, grams } = recipeTotals(items)
  const perPortion = scale(total, 100 / Math.max(1, servings))
  const unknown = items.filter((i) => !i.food).length

  // ---------- Zutat bearbeiten ----------
  if (editing?.food) {
    return (
      <Sheet title="Zutat" onClose={onClose} onBack={() => setEditing(null)}>
        <FoodConfirm
          food={editing.food}
          initialAmount={editing.amount}
          meal={meal}
          hideMeal
          confirmLabel="Übernehmen"
          onConfirm={(amount, _m, food) => {
            setItems(items.map((i) => (i.id === editing.id ? { ...i, amount, food } : i)))
            setEditing(null)
          }}
          onDelete={() => {
            setItems(items.filter((i) => i.id !== editing.id))
            setEditing(null)
          }}
        />
      </Sheet>
    )
  }

  // ---------- Eingabe ----------
  if (step !== 'review') {
    return (
      <Sheet title="Rezept berechnen" onClose={onClose} onBack={onBack} full>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {step === 'reading' ? (
          <div className="stack">
            {photo && <img src={photo} alt="Rezept" className="photo-preview" />}
            <div className="progress">
              <div style={{ width: `${Math.max(5, progress * 100)}%` }} />
            </div>
            <p className="muted small" style={{ margin: 0, textAlign: 'center' }}>
              Lese Rezept … (beim ersten Mal lädt die Texterkennung kurz)
            </p>
          </div>
        ) : (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              Die App liest die Zutaten, rechnet alles zusammen und zeigt dir die Werte <b>pro Portion</b>.
            </p>
            <button className="option" onClick={() => fileRef.current?.click()}>
              <div className="row">
                <span style={{ fontSize: 28 }}>🖼️</span>
                <div>
                  <b>Screenshot oder Foto wählen</b>
                  <div className="small muted">z. B. von Instagram, Chefkoch oder dem Kochbuch</div>
                </div>
              </div>
            </button>
            <div className="section-title" style={{ margin: '8px 0 0' }}>
              oder Text einfügen
            </div>
            <textarea
              rows={7}
              placeholder={'Protein-Pfannkuchen\n250 g Magerquark\n2 Eier\n50 g Haferflocken\n1 Banane'}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <button className="btn btn-primary btn-block" disabled={!pasted.trim()} onClick={() => load(pasted)}>
              Zutaten erkennen
            </button>
          </div>
        )}
      </Sheet>
    )
  }

  // ---------- Prüfen & eintragen ----------
  const submit = async () => {
    const food = recipeToFood(name || 'Rezept', servings, items)
    if (save) await putFood(food)
    await putEntry(entryFromFood(food, food.portions[0].grams * eaten, date, meal))
    toast(save ? `✓ ${food.name} eingetragen & gespeichert` : `✓ ${food.name} eingetragen`)
    onClose()
  }

  return (
    <Sheet title="Rezept prüfen" onClose={onClose} onBack={() => setStep('input')} full>
      <div className="stack">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name, z. B. Protein-Pfannkuchen"
          style={{ fontSize: 18, fontWeight: 700 }}
        />

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="row spread">
            <span className="small muted">Ergibt</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="step" style={{ width: 40, height: 40 }} onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Weniger Portionen">
                −
              </button>
              <b className="num" style={{ minWidth: 92, textAlign: 'center' }}>
                {servings} {servings === 1 ? 'Portion' : 'Portionen'}
              </b>
              <button className="step" style={{ width: 40, height: 40 }} onClick={() => setServings(servings + 1)} aria-label="Mehr Portionen">
                +
              </button>
            </div>
          </div>
          <div className="totals" style={{ marginTop: 12 }}>
            <div>
              <b style={{ color: 'var(--kcal)' }}>{fmt(perPortion.kcal)}</b>
              <span>kcal</span>
            </div>
            <div>
              <b style={{ color: 'var(--protein)' }}>{fmt(perPortion.protein, 1)}</b>
              <span>Protein g</span>
            </div>
            <div>
              <b>{fmt(perPortion.carbs, 1)}</b>
              <span>KH g</span>
            </div>
            <div>
              <b>{fmt(perPortion.fat, 1)}</b>
              <span>Fett g</span>
            </div>
          </div>
          <div className="small muted" style={{ textAlign: 'center', marginTop: 8 }}>
            pro Portion ({fmt(grams / Math.max(1, servings))} g) · ganzes Rezept {fmt(total.kcal)} kcal, {fmt(total.protein)} g Protein
          </div>
        </div>

        <div>
          <div className="section-title" style={{ marginTop: 4 }}>
            Zutaten ({items.length})
          </div>
          {unknown > 0 && (
            <div className="notice" style={{ marginBottom: 8 }}>
              {unknown === 1 ? '1 Zutat wurde' : `${unknown} Zutaten wurden`} nicht erkannt – antippen zum Ändern, oder ✕ wenn unwichtig.
            </div>
          )}
          <div className="list">
            {items.map((i) =>
              fixing?.id === i.id ? (
                <div className="item" key={i.id}>
                  <input
                    autoFocus
                    value={fixing.text}
                    onChange={(e) => setFixing({ ...fixing, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setItems(items.map((x) => (x.id === i.id ? reparse(fixing.text) : x)))
                        setFixing(null)
                      }
                    }}
                    placeholder="z. B. 30 g Proteinpulver"
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      setItems(items.map((x) => (x.id === i.id ? reparse(fixing.text) : x)))
                      setFixing(null)
                    }}
                  >
                    OK
                  </button>
                </div>
              ) : i.food ? (
                <div className="item" key={i.id}>
                  <button className="grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => setEditing(i)}>
                    <div className="ellipsis" style={{ fontWeight: 600 }}>
                      {i.food.name}
                    </div>
                    <div className="small muted ellipsis">
                      {amountLabel(i.food, i.amount, i.food.unit)} · {fmt(scale(i.food.per100, i.amount).kcal)} kcal ·{' '}
                      <span className="protein-tag">{fmt(scale(i.food.per100, i.amount).protein)} g P</span>
                    </div>
                  </button>
                  <button className="icon-btn" aria-label="Entfernen" onClick={() => setItems(items.filter((x) => x.id !== i.id))}>
                    ✕
                  </button>
                </div>
              ) : (
                <div className="item unknown" key={i.id}>
                  <button className="grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => setFixing({ id: i.id, text: i.text })}>
                    <div className="ellipsis" style={{ fontWeight: 600 }}>
                      „{i.text}“
                    </div>
                    <div className="small" style={{ color: 'var(--accent)' }}>
                      nicht erkannt · antippen zum Ändern
                    </div>
                  </button>
                  <button className="icon-btn" aria-label="Entfernen" onClick={() => setItems(items.filter((x) => x.id !== i.id))}>
                    ✕
                  </button>
                </div>
              ),
            )}
            <div className="item">
              <input
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                placeholder="+ Zutat hinzufügen, z. B. 30 g Whey"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLine.trim()) {
                    setItems([...items, reparse(newLine.trim())])
                    setNewLine('')
                  }
                }}
                style={{ border: 0, padding: '4px 0', background: 'transparent' }}
              />
              {newLine.trim() && (
                <button
                  className="item-plus"
                  aria-label="Zutat hinzufügen"
                  onClick={() => {
                    setItems([...items, reparse(newLine.trim())])
                    setNewLine('')
                  }}
                >
                  +
                </button>
              )}
            </div>
          </div>
          {photo && (
            <details style={{ marginTop: 8 }}>
              <summary className="small muted">Foto anzeigen</summary>
              <img src={photo} alt="Rezept" className="photo-preview" style={{ marginTop: 8, maxHeight: 400 }} />
            </details>
          )}
        </div>

        <div className="card stack" style={{ marginBottom: 0 }}>
          <div className="row spread">
            <b>Wie viel hast du gegessen?</b>
          </div>
          <div className="chips">
            {[0.5, 1, 1.5, 2].map((n) => (
              <button key={n} className={'chip' + (eaten === n ? ' on' : '')} onClick={() => setEaten(n)}>
                {fmt(n, 1)} {n === 1 ? 'Portion' : 'Portionen'}
              </button>
            ))}
          </div>
          <label className="row" style={{ gap: 10 }}>
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} style={{ width: 22, height: 22 }} />
            <span>
              Rezept speichern <span className="muted small">– danach unter „Meine Lebensmittel“ mit 1 Tipp eintragen</span>
            </span>
          </label>
          <button className="btn btn-primary btn-block" disabled={!items.some((i) => i.food)} onClick={submit}>
            {fmt(eaten, 1)} {eaten === 1 ? 'Portion' : 'Portionen'} eintragen · {fmt(perPortion.kcal * eaten)} kcal ·{' '}
            {fmt(perPortion.protein * eaten)} g P
          </button>
        </div>
      </div>
    </Sheet>
  )
}
