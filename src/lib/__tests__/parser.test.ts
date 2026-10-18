import { describe, expect, it } from 'vitest'
import { parseInput, rankFoods } from '../parser'
import { parseLabel } from '../label'
import { calcTargets } from '../nutrition'

const short = (text: string) => parseInput(text).map((i) => [i.food?.name, i.amount])

describe('Schnelleingabe', () => {
  it('versteht Mengen, Zahlwörter und Beilagen', () => {
    expect(short('2 Eier, ein Toast mit Avocado und 200g Skyr')).toEqual([
      ['Ei', 116],
      ['Toast', 25],
      ['Avocado', 70],
      ['Skyr', 200],
    ])
  })

  it('versteht Portionswörter', () => {
    expect(short('2 Scheiben Vollkornbrot mit Frischkäse')).toEqual([
      ['Vollkornbrot', 100],
      ['Frischkäse', 20],
    ])
    expect(short('ein Glas Milch')).toEqual([['Milch 1,5 %', 200]])
    expect(short('Kaffee mit Milch')).toEqual([['Kaffee schwarz', 200], ['Milch 1,5 %', 30]])
    expect(short('1 EL Erdnussbutter')).toEqual([['Erdnussbutter', 15]])
    expect(short('eine halbe Avocado')).toEqual([['Avocado', 70]])
    expect(short('1,5 l Wasser')).toEqual([['Wasser', 1500]])
  })

  it('verwechselt ähnliche Wörter nicht', () => {
    expect(short('eine Kugel Eis')).toEqual([['Speiseeis', 60]])
    expect(short('Reis')[0][0]).toBe('Reis (gekocht)')
    expect(short('griechischer Joghurt')[0][0]).toBe('Griechischer Joghurt 10 %')
    expect(short('Banane')).toEqual([['Banane', 120]])
    expect(short('große Banane')).toEqual([['Banane', 156]])
  })

  it('verzeiht Tippfehler', () => {
    expect(short('Hänchenbrust')[0][0]).toBe('Hähnchenbrust')
    expect(short('Bannane')[0][0]).toBe('Banane')
  })

  it('meldet Unbekanntes', () => {
    expect(parseInput('Xylophon')[0].food).toBeUndefined()
  })

  it('findet beim Tippen', () => {
    expect(rankFoods('sky')[0].name).toBe('Skyr')
    expect(rankFoods('quark')[0].name).toBe('Magerquark')
  })
})

describe('Etikett lesen', () => {
  it('liest typische Nährwerttabelle', () => {
    const text = `Nährwerte pro 100 g pro Portion
Brennwert 1046 kJ / 250 kcal 125 kcal
Fett 9,5 g 4,8 g
davon gesättigte Fettsäuren 3,1 g
Kohlenhydrate 30 g 15 g
davon Zucker 4,2 g
Eiweiß 10,2 g 5,1 g
Salz 0,9 g`
    expect(parseLabel(text)).toEqual({ kcal: 250, fat: 9.5, carbs: 30, protein: 10.2 })
  })
})

describe('Ziele', () => {
  it('berechnet plausible Tagesziele', () => {
    const t = calcTargets({ sex: 'female', age: 28, heightCm: 168, weightKg: 62, activity: 1.375, goal: 'keep' })
    expect(t.kcal).toBeGreaterThan(1800)
    expect(t.kcal).toBeLessThan(2200)
    expect(t.protein).toBe(99)
  })
})
