import type { Entry, Food, Goal, Meal, Nutrients, Profile, Sex } from './types'

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function scale(per100: Nutrients, amount: number): Nutrients {
  const f = amount / 100
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
  }
}

export function sum(list: Nutrients[]): Nutrients {
  return list.reduce(
    (a, n) => ({
      kcal: a.kcal + n.kcal,
      protein: a.protein + n.protein,
      carbs: a.carbs + n.carbs,
      fat: a.fat + n.fat,
    }),
    ZERO,
  )
}

export function totals(entries: Entry[]): Nutrients {
  return sum(entries.map((e) => e.nutrients))
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function entryFromFood(food: Food, amount: number, date: string, meal: Meal): Entry {
  return {
    id: uid(),
    date,
    meal,
    name: food.name,
    brand: food.brand,
    amount,
    unit: food.unit,
    nutrients: scale(food.per100, amount),
    food: { ...food, favorite: undefined },
    createdAt: Date.now(),
  }
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Kaum Bewegung', hint: 'Bürojob, wenig Sport' },
  { value: 1.375, label: 'Leicht aktiv', hint: '1–3× Sport pro Woche' },
  { value: 1.55, label: 'Aktiv', hint: '3–5× Sport pro Woche' },
  { value: 1.725, label: 'Sehr aktiv', hint: 'fast täglich Sport' },
]

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Abnehmen' },
  { value: 'keep', label: 'Gewicht halten' },
  { value: 'gain', label: 'Muskeln aufbauen' },
]

/** Tagesziele nach Mifflin-St-Jeor, Protein pro kg Körpergewicht. */
export function calcTargets(p: {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: number
  goal: Goal
}): Nutrients {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  const tdee = bmr * p.activity
  const kcal = Math.round((tdee + (p.goal === 'lose' ? -400 : p.goal === 'gain' ? 250 : 0)) / 10) * 10
  const proteinPerKg = p.goal === 'lose' ? 1.8 : p.goal === 'gain' ? 2.0 : 1.6
  const protein = Math.round(p.weightKg * proteinPerKg)
  const fat = Math.round((kcal * 0.28) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

export function defaultProfile(): Omit<Profile, 'targets' | 'customTargets'> {
  return { sex: 'female', age: 28, heightCm: 168, weightKg: 62, activity: 1.375, goal: 'keep' }
}

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}
