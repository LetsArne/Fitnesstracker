export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return toKey(new Date())
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function labelFor(key: string): string {
  const t = todayKey()
  if (key === t) return 'Heute'
  if (key === addDays(t, -1)) return 'Gestern'
  if (key === addDays(t, 1)) return 'Morgen'
  return fromKey(key).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function shortWeekday(key: string): string {
  return fromKey(key).toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')
}

/** Mahlzeit, die zur aktuellen Uhrzeit am wahrscheinlichsten ist. */
export function mealForNow(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h >= 17 && h < 22) return 'dinner'
  return 'snack'
}
