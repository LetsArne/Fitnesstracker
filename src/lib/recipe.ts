import { scale, sum, uid } from './nutrition'
import { parseSegment } from './parser'
import type { Food, Nutrients } from './types'

export interface Ingredient {
  id: string
  /** Originalzeile aus dem Rezept */
  text: string
  food?: Food
  amount: number
}

export interface ParsedRecipe {
  title: string
  servings: number
  ingredients: Ingredient[]
}

// Ab hier beginnt meist die Zubereitung – keine Zutaten mehr
const STEPS = /^(zubereitung|anleitung|so geht|schritt|step|method|instructions|directions|tipp|notiz)/i
const HEADINGS = /^(zutaten|ingredients|für den|für die|fur den|fur die|teig|topping|belag|füllung|soße|sauce|dressing)\b/i
const SERVINGS =
  /(?:für|fur|ergibt|reicht für|menge|portionen?:?)\s*(\d+)\s*(portionen|portion|personen|person|stück|stk|pfannkuchen|pancakes|muffins|riegel|kugeln|scheiben)?|(\d+)\s*(portionen|personen|pfannkuchen|pancakes|muffins|stück)\b/i

function cleanLine(line: string): string {
  return line
    .replace(/^[\s•·*\-–—▪◦●○□☐✓✔>]+/, '') // Aufzählungszeichen
    .replace(/\(.*?\)/g, ' ') // Klammern („1 Ei (Größe M)“)
    .replace(/(\d+(?:[.,]\d+)?)\s*[-–]\s*\d+(?:[.,]\d+)?/g, '$1') // „1-2 EL“ → „1 EL“
    .replace(/\s+/g, ' ')
    .trim()
}

const hasQuantity = (line: string) => /^\s*(\d|½|¼|¾|ein|eine|zwei|drei|vier|halb|prise|etwas|1\/2)/i.test(line)

/** Zerlegt Rezepttext (eingefügt oder per Texterkennung) in Zutaten. */
export function parseRecipe(text: string, custom: Food[] = []): ParsedRecipe {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let title = ''
  let servings = 0
  const ingredients: Ingredient[] = []
  // Zeilen ohne Mengenangabe („Salz“) zählen erst im Zutatenteil
  let inIngredients = false

  for (const raw of lines) {
    if (/zutaten|ingredients/i.test(raw)) inIngredients = true
    const m = raw.match(SERVINGS)
    if (m && !servings) {
      const n = Number(m[1] ?? m[3])
      if (n > 0 && n <= 50) {
        servings = n
        // Zeilen wie „Zutaten für 2 Portionen“ sind keine Zutat
        if (!hasQuantity(raw) || /portion|person/i.test(raw)) continue
      }
    }
    if (STEPS.test(raw) && ingredients.length) break
    const line = cleanLine(raw)
    if (!line || HEADINGS.test(line) && !hasQuantity(line)) continue
    if (line.length > 70) continue // Fließtext/Anleitung

    const item = parseSegment(line, false, custom)
    const quantity = hasQuantity(line) || /\d/.test(line)
    if (quantity) inIngredients = true
    if (item.food && (quantity || (inIngredients && line.split(' ').length <= 3))) {
      ingredients.push({ id: uid(), text: line, food: item.food, amount: item.amount })
    } else if (quantity && /[a-zäöü]{3,}/i.test(line)) {
      ingredients.push({ id: uid(), text: line, amount: 0 })
    } else if (!title && !ingredients.length && line.length >= 3 && line.length <= 50 && !/\d/.test(line)) {
      title = line
    }
  }

  return { title, servings: servings || 1, ingredients }
}

export function recipeTotals(ingredients: Ingredient[]): { nutrients: Nutrients; grams: number } {
  const known = ingredients.filter((i) => i.food)
  return {
    nutrients: sum(known.map((i) => scale(i.food!.per100, i.amount))),
    grams: known.reduce((a, i) => a + i.amount, 0),
  }
}

/** Speichert das Rezept als eigenes Lebensmittel mit Nährwerten pro 100 g und einer Portion. */
export function recipeToFood(name: string, servings: number, ingredients: Ingredient[], id?: string): Food {
  const { nutrients, grams } = recipeTotals(ingredients)
  const g = grams || 100
  const per100 = scale(nutrients, (100 / g) * 100)
  return {
    id: id ?? 'recipe-' + uid(),
    name: name.trim() || 'Rezept',
    per100,
    unit: 'g',
    portions: [{ label: 'Portion', grams: Math.round(g / Math.max(1, servings)) }],
    source: 'custom',
    recipe: {
      servings,
      ingredients: ingredients
        .filter((i) => i.food)
        .map((i) => ({ name: i.food!.name, amount: i.amount, unit: i.food!.unit })),
    },
  }
}
