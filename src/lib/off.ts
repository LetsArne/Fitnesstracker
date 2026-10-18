import type { Food, Nutrients } from './types'

// Open Food Facts: freie, kostenlose Produktdatenbank (https://world.openfoodfacts.org)

const FIELDS = 'code,product_name,product_name_de,generic_name_de,brands,nutriments,serving_quantity,product_quantity,quantity'

interface OffProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  generic_name_de?: string
  brands?: string
  nutriments?: Record<string, number | string | undefined>
  serving_quantity?: number | string
  product_quantity?: number | string
  quantity?: string
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : undefined
}

export function offToFood(p: OffProduct): Food | undefined {
  const n = p.nutriments ?? {}
  let kcal = num(n['energy-kcal_100g'])
  if (kcal === undefined) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
    if (kj !== undefined) kcal = kj / 4.184
  }
  const name = (p.product_name_de || p.product_name || p.generic_name_de || '').trim()
  if (kcal === undefined || !name) return undefined

  const per100: Nutrients = {
    kcal: Math.round(kcal),
    protein: num(n['proteins_100g']) ?? 0,
    carbs: num(n['carbohydrates_100g']) ?? 0,
    fat: num(n['fat_100g']) ?? 0,
  }
  const isLiquid = /\b(ml|cl|l)\b/i.test(p.quantity ?? '')
  const portions = []
  const serving = num(p.serving_quantity)
  if (serving && serving > 0) portions.push({ label: 'Portion', grams: Math.round(serving) })
  const pack = num(p.product_quantity)
  if (pack && pack > 0 && pack !== serving && pack <= 1500) portions.push({ label: 'Packung', grams: Math.round(pack) })

  return {
    id: `off-${p.code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    per100,
    unit: isLiquid ? 'ml' : 'g',
    portions,
    barcode: p.code,
    source: 'off',
  }
}

export async function lookupBarcode(code: string): Promise<Food | undefined> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`)
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (${res.status})`)
  const data = (await res.json()) as { status: number; product?: OffProduct }
  if (data.status !== 1 || !data.product) return undefined
  return offToFood({ ...data.product, code })
}

export async function searchProducts(query: string, signal?: AbortSignal): Promise<Food[]> {
  const url =
    `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (${res.status})`)
  const data = (await res.json()) as { products?: OffProduct[] }
  return (data.products ?? []).map(offToFood).filter((f): f is Food => !!f)
}
