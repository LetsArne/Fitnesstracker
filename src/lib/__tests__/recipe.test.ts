import { describe, expect, it } from 'vitest'
import { parseRecipe, recipeToFood, recipeTotals } from '../recipe'

const PANCAKES = `Protein-Pfannkuchen
Zutaten für 2 Portionen:
• 250 g Magerquark
• 2 Eier (Größe M)
• 50 g Haferflocken
• 1 Banane
• 1-2 EL Milch
• 1/2 TL Backpulver
• 1 Prise Salz
• 1 TL Kokosöl zum Braten
Zubereitung:
1. Alle Zutaten in einen Mixer geben und 30 Sekunden pürieren.
2. In einer Pfanne mit 1 TL Kokosöl ausbacken.`

describe('Rezept', () => {
  it('erkennt Titel, Portionen und Zutaten', () => {
    const r = parseRecipe(PANCAKES)
    expect(r.title).toBe('Protein-Pfannkuchen')
    expect(r.servings).toBe(2)
    expect(r.ingredients.map((i) => [i.food?.name, i.amount])).toEqual([
      ['Magerquark', 250],
      ['Ei', 116],
      ['Haferflocken', 50],
      ['Banane', 120],
      ['Milch 1,5 %', 15],
      ['Backpulver', 2],
      ['Salz', 1],
      ['Kokosöl', 4],
    ])
  })

  it('rechnet Werte pro Portion', () => {
    const r = parseRecipe(PANCAKES)
    const { nutrients } = recipeTotals(r.ingredients)
    expect(nutrients.protein).toBeCloseTo(53.1, 0)
    const food = recipeToFood(r.title, r.servings, r.ingredients)
    const portion = food.portions[0].grams
    expect(portion).toBe(279)
    expect((food.per100.protein * portion) / 100).toBeCloseTo(26.5, 0)
  })

  it('markiert Unbekanntes statt es zu verschlucken', () => {
    const r = parseRecipe('200 g Xanthan-Gummi\n100 g Skyr')
    expect(r.ingredients[0].food).toBeUndefined()
    expect(r.ingredients[1].food?.name).toBe('Skyr')
  })
})
