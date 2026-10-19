import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { recentFoods, useStore } from '../data/store'
import { lookupBarcode, searchProducts } from '../lib/off'
import { entryFromFood, fmt, scale } from '../lib/nutrition'
import { parseInput, rankFoods, type ParsedItem } from '../lib/parser'
import { MEALS, type Food, type Meal, type Nutrients } from '../lib/types'
import { FoodConfirm } from './FoodConfirm'
import { LabelScan } from './LabelScan'
import { ManualForm, type ManualInitial } from './ManualForm'
import { Scanner } from './Scanner'
import { Sheet, amountLabel, favKey, sourceBadge, toast } from './ui'

type View =
  | { kind: 'main' }
  | { kind: 'confirm'; food: Food; amount?: number; parsedKey?: string }
  | { kind: 'scan' }
  | { kind: 'scan-loading'; code: string }
  | { kind: 'not-found'; code: string }
  | { kind: 'label'; barcode?: string }
  | { kind: 'manual'; initial?: ManualInitial; photo?: string }

// Web Speech API (kostenlos im Browser eingebaut)
type SpeechResult = ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }
type SpeechRec = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: (() => void) | null
  onresult: ((e: { results: ArrayLike<SpeechResult> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

const SPEECH_ERRORS: Record<string, string> = {
  'not-allowed': 'Mikrofon ist nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.',
  'service-not-allowed':
    'Spracherkennung ist aus. iPhone: Einstellungen → Siri → „Siri & Diktieren“ bzw. Tastatur → „Diktierfunktion“ aktivieren.',
  'no-speech': 'Ich habe nichts gehört – tippe nochmal auf 🎤 und sprich direkt los.',
  'audio-capture': 'Kein Mikrofon gefunden.',
  network: 'Spracherkennung braucht eine Internetverbindung.',
}
const SpeechCtor: (new () => SpeechRec) | undefined =
  (window as unknown as Record<string, new () => SpeechRec>).SpeechRecognition ??
  (window as unknown as Record<string, new () => SpeechRec>).webkitSpeechRecognition

export function AddSheet({ date, meal: initialMeal, onClose }: { date: string; meal: Meal; onClose: () => void }) {
  const store = useStore()
  const { foods, entries, putEntry, putFood } = store
  const [view, setView] = useState<View>({ kind: 'main' })
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [text, setText] = useState('')
  const [overrides, setOverrides] = useState<Record<string, { amount: number; food: Food }>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [online, setOnline] = useState<{ q: string; loading: boolean; results: Food[]; error?: string } | null>(null)
  const [listening, setListening] = useState<'off' | 'starting' | 'on'>('off')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const add = async (food: Food, amount: number, m: Meal = meal) => {
    await putEntry(entryFromFood(food, amount, date, m))
  }

  // ---------- Schnelleingabe ----------
  const parsed = useMemo(() => (text.trim() ? parseInput(text, foods) : []), [text, foods])
  const itemKey = (item: ParsedItem, i: number) => `${i}|${item.text}`
  const activeItems = parsed
    .map((item, i) => ({ item, key: itemKey(item, i) }))
    .filter(({ key }) => !removed.has(key))
  const matched = activeItems.filter(({ item }) => item.food)
  const amountOf = (key: string, item: ParsedItem) => overrides[key]?.amount ?? item.amount
  const foodOf = (key: string, item: ParsedItem) => overrides[key]?.food ?? item.food!
  const multi = parsed.length > 1
  const singleQuery = !multi ? text.trim() : ''
  const local = useMemo(() => (singleQuery.length >= 2 ? rankFoods(singleQuery, foods, 8) : []), [singleQuery, foods])

  const addAllParsed = async () => {
    for (const { item, key } of matched) await add(foodOf(key, item), amountOf(key, item))
    toast(matched.length === 1 ? '✓ Eingetragen' : `✓ ${matched.length} Einträge hinzugefügt`)
    onClose()
  }

  const runOnline = useCallback(async (q: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setOnline({ q, loading: true, results: [] })
    try {
      const results = await searchProducts(q, ctrl.signal)
      setOnline({ q, loading: false, results })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setOnline({ q, loading: false, results: [], error: 'Online-Suche gerade nicht erreichbar. Bitte später nochmal.' })
    }
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Bewertet, wie gut ein erkannter Satz zu bekannten Lebensmitteln passt
  const speechQuality = (t: string) => {
    const items = parseInput(t, foods)
    return items.filter((i) => i.food).length * 10 - items.filter((i) => !i.food).length * 6
  }

  const toggleMic = () => {
    if (!SpeechCtor) return
    if (listening !== 'off') {
      recRef.current?.stop()
      return
    }
    recRef.current?.abort()
    setSpeechError(null)
    const rec = new SpeechCtor()
    rec.lang = 'de-DE'
    rec.interimResults = true
    rec.continuous = false
    // Mehrere Vorschläge holen und den nehmen, der am besten zu Lebensmitteln passt
    // (z. B. „Skyr“ statt „Skier“)
    rec.maxAlternatives = 5
    const before = text.trim()
    rec.onstart = () => setListening('on')
    rec.onresult = (e) => {
      let said = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        let best = r[0]?.transcript ?? ''
        if (r.isFinal && r.length > 1) {
          let bestScore = speechQuality(best)
          for (let j = 1; j < r.length; j++) {
            const q = speechQuality(r[j].transcript)
            if (q > bestScore) {
              best = r[j].transcript
              bestScore = q
            }
          }
        }
        said += (said ? ' ' : '') + best.trim()
      }
      setText((before ? before + ', ' : '') + said)
    }
    rec.onend = () => setListening('off')
    rec.onerror = (e) => {
      setListening('off')
      if (e.error !== 'aborted') setSpeechError(SPEECH_ERRORS[e.error] ?? 'Spracherkennung hat nicht geklappt – bitte nochmal versuchen.')
    }
    recRef.current = rec
    setListening('starting')
    try {
      rec.start()
    } catch {
      setListening('off')
      setSpeechError('Spracherkennung konnte nicht starten – bitte nochmal tippen.')
    }
    // Falls der Browser nie startet, nicht ewig im Wartezustand hängen bleiben
    window.setTimeout(() => setListening((l) => (l === 'starting' ? 'off' : l)), 4000)
  }

  useEffect(() => () => recRef.current?.abort(), [])

  // ---------- Barcode ----------
  const onBarcode = useCallback(
    async (code: string) => {
      const own = foods.find((f) => f.barcode === code)
      if (own) {
        setView({ kind: 'confirm', food: own })
        return
      }
      setView({ kind: 'scan-loading', code })
      try {
        const food = await lookupBarcode(code)
        setView(food ? { kind: 'confirm', food } : { kind: 'not-found', code })
      } catch {
        setView({ kind: 'not-found', code })
      }
    },
    [foods],
  )

  // ---------- Ansichten ----------
  const back = () => setView({ kind: 'main' })

  if (view.kind === 'confirm') {
    return (
      <Sheet title="Menge" onClose={onClose} onBack={back}>
        <FoodConfirm
          food={view.food}
          initialAmount={view.amount}
          meal={meal}
          confirmLabel={view.parsedKey ? 'Übernehmen' : 'Hinzufügen'}
          onConfirm={async (amount, m, food) => {
            if (view.parsedKey) {
              setOverrides({ ...overrides, [view.parsedKey]: { amount, food } })
              setView({ kind: 'main' })
              return
            }
            await add(food, amount, m)
            toast(`✓ ${view.food.name} eingetragen`)
            onClose()
          }}
        />
      </Sheet>
    )
  }

  if (view.kind === 'scan') {
    return (
      <Sheet title="Barcode scannen" onClose={onClose} onBack={back} full>
        <Scanner onDetected={onBarcode} />
      </Sheet>
    )
  }

  if (view.kind === 'scan-loading') {
    return (
      <Sheet title="Barcode scannen" onClose={onClose} onBack={back}>
        <div className="center-screen" style={{ minHeight: 200 }}>
          <div>
            <div className="hero-emoji">🔎</div>
            <p>Suche Produkt {view.code} …</p>
          </div>
        </div>
      </Sheet>
    )
  }

  if (view.kind === 'not-found') {
    return (
      <Sheet title="Nicht gefunden" onClose={onClose} onBack={back}>
        <div className="stack">
          <div className="notice">
            Das Produkt <b>{view.code}</b> ist noch nicht in der Datenbank. Kein Problem: Fotografiere einfach die
            Nährwerttabelle – danach erkennt die App das Produkt beim nächsten Scan sofort.
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setView({ kind: 'label', barcode: view.code })}>
            📸 Etikett fotografieren
          </button>
          <button className="btn btn-block" onClick={() => setView({ kind: 'manual', initial: { barcode: view.code } })}>
            ✍️ Werte selbst eintippen
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setView({ kind: 'scan' })}>
            Nochmal scannen
          </button>
        </div>
      </Sheet>
    )
  }

  if (view.kind === 'label') {
    return (
      <Sheet title="Etikett fotografieren" onClose={onClose} onBack={back}>
        <LabelScan
          onResult={(values, photo) =>
            setView({ kind: 'manual', initial: { barcode: view.barcode, per100: values }, photo })
          }
        />
      </Sheet>
    )
  }

  if (view.kind === 'manual') {
    const found = view.initial?.per100 ? Object.keys(view.initial.per100).length : 0
    return (
      <Sheet title="Selbst eintragen" onClose={onClose} onBack={back} full>
        <div className="stack">
          {view.photo && <img src={view.photo} alt="Etikett" className="photo-preview" />}
          {view.photo && (
            <div className={'notice' + (found >= 3 ? ' good' : '')}>
              {found >= 3
                ? '✓ Werte erkannt – bitte kurz mit dem Foto vergleichen.'
                : found > 0
                  ? 'Einige Werte erkannt. Bitte fehlende ergänzen.'
                  : 'Leider nichts erkannt. Bitte die Werte vom Foto abtippen.'}
            </div>
          )}
          <ManualForm
            initial={view.initial}
            meal={meal}
            onSubmit={async (food, amount, m, save) => {
              if (save) await putFood(food)
              await add(food, amount, m)
              toast(`✓ ${food.name} eingetragen`)
              onClose()
            }}
          />
        </div>
      </Sheet>
    )
  }

  // ---------- Hauptansicht ----------
  const favorites = foods.filter((f) => f.favorite)
  const recents = recentFoods(entries).filter((r) => !favorites.some((f) => f.id === favKey(r.food)))
  const ownFoods = foods.filter((f) => f.source === 'custom' && !f.favorite)

  const quickRow = (food: Food, amount: number, key: string) => {
    const n = scale(food.per100, amount)
    return (
      <div className="item" key={key}>
        <button className="grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => setView({ kind: 'confirm', food, amount })}>
          <div className="ellipsis" style={{ fontWeight: 600 }}>
            {food.name}
          </div>
          <div className="small muted ellipsis">
            {amountLabel(food, amount, food.unit)} · {fmt(n.kcal)} kcal · <span className="protein-tag">{fmt(n.protein)} g P</span>
          </div>
        </button>
        <button
          className="item-plus"
          aria-label={`${food.name} hinzufügen`}
          onClick={async () => {
            await add(food, amount)
            toast(`✓ ${food.name} eingetragen`)
          }}
        >
          +
        </button>
      </div>
    )
  }

  const foodResult = (food: Food) => (
    <button className="item" key={food.id} onClick={() => setView({ kind: 'confirm', food })}>
      <div className="grow">
        <div className="ellipsis" style={{ fontWeight: 600 }}>
          {food.name}
        </div>
        <div className="small muted row" style={{ gap: 6 }}>
          {food.brand && <span className="ellipsis">{food.brand}</span>}
          {sourceBadge(food)}
          <span className="num">
            {fmt(food.per100.kcal)} kcal · {fmt(food.per100.protein, 1)} g P / 100 {food.unit}
          </span>
        </div>
      </div>
      <span className="muted">›</span>
    </button>
  )

  const totalParsed: Nutrients = matched.reduce(
    (a, { item, key }) => {
      const n = scale(foodOf(key, item).per100, amountOf(key, item))
      return { kcal: a.kcal + n.kcal, protein: a.protein + n.protein, carbs: a.carbs + n.carbs, fat: a.fat + n.fat }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return (
    <Sheet title="Was gab's?" onClose={onClose} full>
      <div className="chips" style={{ marginBottom: 12 }}>
        {MEALS.map((m) => (
          <button key={m.id} className={'chip' + (meal === m.id ? ' on' : '')} onClick={() => setMeal(m.id)}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      <div className="quick">
        <textarea
          rows={text.length > 40 ? 3 : 1}
          placeholder={SpeechCtor ? 'Tippen oder 🎤 sagen: „2 Eier und ein Skyr“' : 'z. B. „2 Eier und ein Skyr“'}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOnline(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (matched.length && (multi || !local.length)) addAllParsed()
              else if (singleQuery && !local.length) runOnline(singleQuery)
            }
          }}
          enterKeyHint="done"
        />
        {SpeechCtor && (
          <button
            className={'mic' + (listening === 'on' ? ' on' : '')}
            onClick={toggleMic}
            aria-label={listening === 'off' ? 'Spracheingabe starten' : 'Spracheingabe beenden'}
          >
            {listening === 'off' ? '🎤' : '■'}
          </button>
        )}
      </div>
      {listening !== 'off' && (
        <div className="notice listening">
          {listening === 'starting' ? 'Mikrofon startet …' : '🔴 Ich höre zu – sag z. B. „zwei Eier und ein Skyr“. Kurze Pause = fertig.'}
        </div>
      )}
      {speechError && listening === 'off' && <div className="notice">{speechError}</div>}

      {!text.trim() && (
        <div className="tools">
          <button className="tool" onClick={() => setView({ kind: 'scan' })}>
            <span>▥</span>
            Barcode
          </button>
          <button className="tool" onClick={() => setView({ kind: 'label' })}>
            <span>📸</span>
            Etikett-Foto
          </button>
          <button className="tool" onClick={() => setView({ kind: 'manual' })}>
            <span>✍️</span>
            Selbst eintragen
          </button>
        </div>
      )}

      {/* Erkannte Lebensmittel aus der Schnelleingabe */}
      {multi && activeItems.length > 0 && (
        <>
          <div className="section-title">Erkannt</div>
          <div className="list">
            {activeItems.map(({ item, key }) =>
              item.food ? (
                <div className="item" key={key}>
                  <button
                    className="grow"
                    style={{ textAlign: 'left', minWidth: 0 }}
                    onClick={() => setView({ kind: 'confirm', food: foodOf(key, item), amount: amountOf(key, item), parsedKey: key })}
                  >
                    <div className="ellipsis" style={{ fontWeight: 600 }}>
                      {item.food.name}
                    </div>
                    <div className="small muted ellipsis">
                      {amountLabel(item.food, amountOf(key, item), item.food.unit)} ·{' '}
                      {fmt(scale(foodOf(key, item).per100, amountOf(key, item)).kcal)} kcal ·{' '}
                      <span className="protein-tag">{fmt(scale(foodOf(key, item).per100, amountOf(key, item)).protein)} g P</span>
                    </div>
                  </button>
                  <button className="icon-btn" aria-label="Entfernen" onClick={() => setRemoved(new Set(removed).add(key))}>
                    ✕
                  </button>
                </div>
              ) : (
                <div className="item unknown" key={key}>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>„{item.text}“</div>
                    <div className="small muted">nicht erkannt</div>
                  </div>
                  <button className="chip" onClick={() => runOnline(item.text)}>
                    Online suchen
                  </button>
                  <button className="icon-btn" aria-label="Entfernen" onClick={() => setRemoved(new Set(removed).add(key))}>
                    ✕
                  </button>
                </div>
              ),
            )}
          </div>
          {matched.length > 0 && (
            <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={addAllParsed}>
              {matched.length} {matched.length === 1 ? 'Eintrag' : 'Einträge'} hinzufügen · {fmt(totalParsed.kcal)} kcal ·{' '}
              {fmt(totalParsed.protein)} g Protein
            </button>
          )}
        </>
      )}

      {/* Einzelnes Lebensmittel: Vorschlag mit Menge + lokale Treffer */}
      {!multi && singleQuery && (
        <>
          {matched[0] && /\d|\b(ein|eine|zwei|drei|halbe?)\b/i.test(singleQuery) && (
            <>
              <div className="section-title">Erkannt</div>
              <div className="list">{quickRow(matched[0].item.food!, amountOf(matched[0].key, matched[0].item), 'parsed')}</div>
            </>
          )}
          {local.length > 0 && (
            <>
              <div className="section-title">Treffer</div>
              <div className="list">{local.map(foodResult)}</div>
            </>
          )}
          {!online && (
            <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => runOnline(singleQuery)}>
              🌍 Markenprodukte online suchen
            </button>
          )}
        </>
      )}

      {online && (
        <>
          <div className="section-title">Online: „{online.q}“</div>
          {online.loading && <p className="muted">Suche in Open Food Facts …</p>}
          {online.error && <div className="notice">{online.error}</div>}
          {!online.loading && !online.error && online.results.length === 0 && (
            <div className="notice">
              Nichts gefunden. Du kannst es{' '}
              <button style={{ textDecoration: 'underline', fontWeight: 600 }} onClick={() => setView({ kind: 'manual', initial: { name: online.q } })}>
                selbst eintragen
              </button>
              .
            </div>
          )}
          {online.results.length > 0 && <div className="list">{online.results.map(foodResult)}</div>}
        </>
      )}

      {!text.trim() && (
        <>
          {favorites.length > 0 && (
            <>
              <div className="section-title">⭐ Favoriten</div>
              <div className="list">
                {favorites.map((f) => {
                  const last = recentFoods(entries, 200).find((r) => favKey(r.food) === f.id)
                  return quickRow(f, last?.amount ?? f.portions[0]?.grams ?? 100, f.id)
                })}
              </div>
            </>
          )}
          {recents.length > 0 && (
            <>
              <div className="section-title">Zuletzt gegessen</div>
              <div className="list">{recents.map((r) => quickRow(r.food, r.amount, 'r-' + r.food.id))}</div>
            </>
          )}
          {ownFoods.length > 0 && (
            <>
              <div className="section-title">Meine Lebensmittel</div>
              <div className="list">{ownFoods.map(foodResult)}</div>
            </>
          )}
          {!favorites.length && !recents.length && (
            <div className="notice" style={{ marginTop: 16 }}>
              💡 <b>Tipp:</b> Schreib einfach, was du gegessen hast – z. B. <i>„Haferflocken mit Milch und einer Banane“</i>.
              Die App erkennt Lebensmittel und Mengen automatisch.
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}
