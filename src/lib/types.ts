export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Portion {
  label: string
  grams: number
}

export type FoodSource = 'db' | 'off' | 'custom'

/** Ein Lebensmittel mit Nährwerten pro 100 g bzw. 100 ml. */
export interface Food {
  id: string
  name: string
  brand?: string
  per100: Nutrients
  unit: 'g' | 'ml'
  /** Erste Portion ist die Standardportion. */
  portions: Portion[]
  barcode?: string
  source: FoodSource
  favorite?: boolean
  /** Direkteintrag: Werte gelten pro Portion (= „100“ Einheiten) statt pro 100 g */
  direct?: boolean
  /** Eigene Variante eines Datenbank-Lebensmittels (z. B. Skyr mit eigenen Werten) */
  baseId?: string
  /** Selbst gekochtes Rezept: Zutaten und Anzahl Portionen */
  recipe?: { servings: number; ingredients: { name: string; amount: number; unit: 'g' | 'ml' }[] }
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Entry {
  id: string
  /** YYYY-MM-DD */
  date: string
  meal: Meal
  name: string
  brand?: string
  /** Gegessene Menge in g/ml. 0 bei Direkteinträgen ohne Menge. */
  amount: number
  unit: 'g' | 'ml'
  nutrients: Nutrients
  /** Kopie des Lebensmittels, damit man die Menge später ändern oder es wiederholen kann. */
  food?: Food
  createdAt: number
}

export type Sex = 'female' | 'male'
export type Goal = 'lose' | 'keep' | 'gain'

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  /** PAL-Faktor, z. B. 1.375 */
  activity: number
  goal: Goal
  targets: Nutrients
  /** true, wenn die Ziele von Hand gesetzt wurden */
  customTargets: boolean
}

export const MEALS: { id: Meal; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Frühstück', emoji: '🥐' },
  { id: 'lunch', label: 'Mittagessen', emoji: '🥗' },
  { id: 'dinner', label: 'Abendessen', emoji: '🍝' },
  { id: 'snack', label: 'Snacks', emoji: '🍎' },
]
