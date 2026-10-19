import { FOODS } from './foods'
import type { Food } from './types'

// Versteht freie Eingaben wie „2 Eier, ein Toast mit Avocado und 200g Skyr“
// und ordnet sie Lebensmitteln mit Mengen zu – komplett offline.

export interface ParsedItem {
  text: string
  food?: Food
  amount: number
  /** z. B. „2 × Stück“ oder „200 g“ */
  portionText: string
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9.,/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stem(w: string): string {
  return w.length > 3 ? w.replace(/(en|n|e|s)$/, '') : w
}

const NUMBER_WORDS: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eins: 1,
  zwei: 2, drei: 3, vier: 4, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  halb: 0.5, halbe: 0.5, halber: 0.5, halbes: 0.5, halben: 0.5,
  anderthalb: 1.5, eineinhalb: 1.5, viertel: 0.25, paar: 2,
}

const MASS_UNITS: Record<string, number> = {
  g: 1, gr: 1, gramm: 1, kg: 1000, kilo: 1000, ml: 1, l: 1000, liter: 1000, cl: 10,
}

// Portions-Wörter → Label in der Datenbank
const PORTION_UNITS: Record<string, string> = {
  stuck: 'Stück', stk: 'Stück', st: 'Stück',
  scheibe: 'Scheibe', scheiben: 'Scheibe',
  el: 'EL', essloffel: 'EL', loffel: 'EL',
  tl: 'TL', teeloffel: 'TL',
  glas: 'Glas', glaser: 'Glas',
  tasse: 'Tasse', tassen: 'Tasse', becher: 'Becher',
  portion: 'Portion', portionen: 'Portion', messloffel: 'Portion', scoop: 'Portion',
  handvoll: 'Handvoll', hand: 'Handvoll',
  dose: 'Dose', dosen: 'Dose', kugel: 'Kugel', kugeln: 'Kugel',
  flasche: 'Flasche', flaschen: 'Flasche', riegel: 'Riegel',
  tafel: 'Tafel', tafeln: 'Tafel', tute: 'Tüte', tuten: 'Tüte', packung: 'Tüte',
  teller: 'Teller', schale: 'Schale', schalen: 'Schale', schussel: 'Schale',
  schuss: 'Schuss',
}

const GENERIC_GRAMS: Record<string, number> = {
  EL: 15, TL: 5, Glas: 200, Tasse: 150, Becher: 150, Handvoll: 30, Teller: 300,
  Schale: 250, Dose: 150, Flasche: 500, Scheibe: 30, Kugel: 60, Riegel: 50,
  Tafel: 100, Tüte: 150, Schuss: 30,
}

const SIZE_WORDS: Record<string, number> = {
  gross: 1.3, grosse: 1.3, grosser: 1.3, grosses: 1.3, grossen: 1.3,
  klein: 0.7, kleine: 0.7, kleiner: 0.7, kleines: 0.7, kleinen: 0.7,
}

const FILLER = new Set([
  'von', 'vom', 'der', 'die', 'das', 'den', 'dem', 'des', 'mein', 'meine', 'etwas',
  'bisschen', 'ca', 'circa', 'etwa', 'so', 'noch', 'x', 'mal', 'hab', 'habe', 'gegessen',
  'getrunken', 'ich', 'heute', 'zum', 'zur', 'fruhstuck', 'mittag', 'abend', 'abends',
])

/** Teilt die Eingabe in einzelne Lebensmittel. „mit“-Teile gelten als Beilage. */
export function splitSegments(text: string): { text: string; side: boolean }[] {
  const out: { text: string; side: boolean }[] = []
  for (const part of text.split(/(?<!\d),|,(?!\d)|[;\n+]|\s(?:und|sowie|dazu|plus)\s/i)) {
    part.split(/\smit\s/i).forEach((t, i) => {
      if (t.trim()) out.push({ text: t.trim(), side: i > 0 })
    })
  }
  return out
}

interface Candidate {
  food: Food
  aliases: string[]
  bonus: number
}

function candidates(custom: Food[]): Candidate[] {
  // Eigene Varianten (z. B. „Skyr“ mit gemerkten Werten) ersetzen das Original
  // und übernehmen dessen Suchbegriffe („skyr“, „eier“ …).
  const overridden = new Map(custom.filter((f) => f.baseId).map((f) => [f.baseId!, f]))
  return [
    ...custom.map((f) => {
      const base = f.baseId ? FOODS.find((b) => b.id === f.baseId) : undefined
      return { food: f, aliases: [normalize(f.name), ...(base?.aliases.map(normalize) ?? [])], bonus: 50 }
    }),
    ...FOODS.filter((f) => !overridden.has(f.id)).map((f) => ({ food: f as Food, aliases: f.aliases.map(normalize), bonus: 0 })),
  ]
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/**
 * Kölner Phonetik: gleich klingende deutsche Wörter bekommen denselben Code
 * („Skier“ = „Skyr“, „Hänchen“ = „Hähnchen“). Fängt Fehler der Spracherkennung ab.
 */
export function phonetic(word: string): string {
  const w = normalize(word).replace(/[^a-z]/g, '')
  let code = ''
  for (let i = 0; i < w.length; i++) {
    const c = w[i]
    const prev = w[i - 1] ?? ''
    const next = w[i + 1] ?? ''
    let d = ''
    if ('aeijouy'.includes(c)) d = '0'
    else if (c === 'h') d = ''
    else if (c === 'b') d = '1'
    else if (c === 'p') d = next === 'h' ? '3' : '1'
    else if (c === 'd' || c === 't') d = 'csz'.includes(next) ? '8' : '2'
    else if ('fvw'.includes(c)) d = '3'
    else if ('gkq'.includes(c)) d = '4'
    else if (c === 'c') {
      if (i === 0) d = 'ahkloqrux'.includes(next) ? '4' : '8'
      else d = 'sz'.includes(prev) ? '8' : 'ahkoqux'.includes(next) ? '4' : '8'
    } else if (c === 'x') d = 'ckq'.includes(prev) ? '8' : '48'
    else if (c === 'l') d = '5'
    else if (c === 'm' || c === 'n') d = '6'
    else if (c === 'r') d = '7'
    else if (c === 's' || c === 'z') d = '8'
    code += d
  }
  // doppelte Ziffern zusammenfassen, Vokale (0) außer am Anfang entfernen
  let out = ''
  for (const d of code) if (d !== out[out.length - 1]) out += d
  return out[0] + out.slice(1).replace(/0/g, '')
}

function score(query: string, alias: string): number {
  if (!query || !alias) return 0
  if (query === alias) return 1000 + alias.length
  // Spracherkennung trennt oft zusammengesetzte Wörter: „Mager Quark“, „Hähnchen Brust“
  if (query.replace(/ /g, '') === alias.replace(/ /g, '')) return 900 + alias.length
  if ((' ' + query + ' ').includes(' ' + alias + ' ')) return 500 + alias.length * 10
  const qWords = query.split(' ')
  const aWords = alias.split(' ')
  if (qWords.map(stem).join(' ') === aWords.map(stem).join(' ')) return 450
  if (aWords.length === 1 && qWords.some((w) => stem(w) === stem(alias))) return 300 + alias.length
  const similarity = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length)
  let best = 0
  if (alias.length >= 4) {
    const sim = similarity(query, alias)
    if (sim >= 0.75) best = Math.round(200 * sim)
  }
  // Gleicher Klang zählt nur, wenn die Schreibweise auch halbwegs ähnlich ist
  // („Skier“ → „Skyr“ ja, „Bannane“ → „Bohnen“ nein, weil „Banane“ ähnlicher ist)
  if (alias.length >= 3 && query.length >= 4) {
    const pa = phonetic(alias)
    if (pa.length >= 2) {
      const whole = query.replace(/ /g, '')
      if (phonetic(whole) === pa) {
        const sim = similarity(whole, alias.replace(/ /g, ''))
        if (sim >= 0.4) best = Math.max(best, Math.round(150 + 100 * sim))
      } else if (aWords.length === 1) {
        for (const w of qWords) {
          if (w.length >= 4 && phonetic(w) === pa) {
            const sim = similarity(w, alias)
            if (sim >= 0.4) best = Math.max(best, Math.round(130 + 100 * sim))
          }
        }
      }
    }
  }
  return best
}

/** Bestes passendes Lebensmittel für einen Suchtext. */
export function matchFood(query: string, custom: Food[] = []): Food | undefined {
  return rankFoods(query, custom, 1)[0]
}

/** Lokale Suche (eigene Lebensmittel zuerst, dann Grunddatenbank). */
export function rankFoods(query: string, custom: Food[] = [], limit = 20): Food[] {
  return scoredFoods(query, custom, limit).map((x) => x.food)
}

function scoredFoods(query: string, custom: Food[], limit: number): { food: Food; s: number }[] {
  const q = normalize(query)
  if (!q) return []
  const scored: { food: Food; s: number }[] = []
  for (const c of candidates(custom)) {
    let best = 0
    for (const a of c.aliases) {
      best = Math.max(best, score(q, a))
      // Präfixsuche für das Suchfeld („skyr“ beim Tippen von „sky“)
      if (q.length >= 3 && a.startsWith(q)) best = Math.max(best, 150 + q.length)
    }
    if (best > 0) scored.push({ food: c.food, s: best + c.bonus })
  }
  scored.sort((a, b) => b.s - a.s)
  const seen = new Set<string>()
  return scored
    .filter(({ food }) => (seen.has(food.id) ? false : (seen.add(food.id), true)))
    .slice(0, limit)
}

function portionGrams(food: Food, label: string): number | undefined {
  return food.portions.find((p) => p.label.toLowerCase() === label.toLowerCase())?.grams
}

export function parseSegment(segment: string, side: boolean, custom: Food[] = []): ParsedItem {
  const tokens = normalize(segment).split(' ').filter(Boolean)
  let qty: number | undefined
  let massFactor: number | undefined
  let portionLabel: string | undefined
  let size = 1
  const rest: string[] = []
  // wie rest, aber inkl. Portionswort – für Namen wie „Protein Riegel“ oder „Dosen Mais“
  const restWithUnit: string[] = []

  for (const t of tokens) {
    const num = t.match(/^(\d+)(?:[.,](\d+))?$/)
    const frac = t.match(/^(\d+)\/(\d+)$/)
    if (num) qty = (qty ?? 1) * parseFloat(t.replace(',', '.'))
    else if (frac) qty = (qty ?? 1) * (Number(frac[1]) / Number(frac[2]))
    else if (t in NUMBER_WORDS) qty = (qty ?? 1) * NUMBER_WORDS[t]
    else if (t in MASS_UNITS && massFactor === undefined) massFactor = MASS_UNITS[t]
    else if (t in PORTION_UNITS && !portionLabel) {
      portionLabel = PORTION_UNITS[t]
      restWithUnit.push(t)
    } else if (t in SIZE_WORDS) size = SIZE_WORDS[t]
    else if (!FILLER.has(t)) {
      rest.push(t)
      restWithUnit.push(t)
    }
  }

  let food = matchFood(rest.join(' '), custom)
  if (portionLabel && rest.length) {
    const withUnit = scoredFoods(restWithUnit.join(' '), custom, 1)[0]
    if (withUnit && withUnit.s >= 900) {
      food = withUnit.food
      portionLabel = undefined
    }
  }
  const n = qty ?? 1
  if (!food) return { text: segment, amount: 0, portionText: '' }

  const unit = food.unit
  if (massFactor !== undefined) {
    const amount = Math.round(n * massFactor)
    return { text: segment, food, amount, portionText: `${amount} ${unit}` }
  }

  let label: string
  let grams: number
  if (portionLabel) {
    label = portionLabel
    grams = portionGrams(food, portionLabel) ?? GENERIC_GRAMS[portionLabel] ?? food.portions[0]?.grams ?? 100
  } else if (qty !== undefined && portionGrams(food, 'Stück')) {
    label = 'Stück'
    grams = portionGrams(food, 'Stück')!
  } else if (side && qty === undefined && food.portions.length) {
    // Beilage („Toast mit Avocado“): kleinste Portion annehmen
    const smallest = [...food.portions].sort((a, b) => a.grams - b.grams)[0]
    label = smallest.label
    grams = smallest.grams
  } else {
    const p = food.portions[0] ?? { label: '100 ' + unit, grams: 100 }
    label = p.label
    grams = p.grams
  }

  const amount = Math.round(n * grams * size)
  const countText = n === 1 ? '' : `${String(n).replace('.', ',')} × `
  return { text: segment, food, amount, portionText: `${countText}${label} · ${amount} ${unit}` }
}

export function parseInput(text: string, custom: Food[] = []): ParsedItem[] {
  return splitSegments(text).map((s) => parseSegment(s.text, s.side, custom))
}
