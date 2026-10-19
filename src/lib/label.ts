import type { Nutrients } from './types'

// Liest Nährwerte aus dem erkannten Text eines Nährwert-Etiketts (pro 100 g = erste Spalte).

function toNumber(s: string): number {
  return parseFloat(s.replace(/[oO]/g, '0').replace(',', '.'))
}

const NUM = '(\\d+(?:[.,]\\d+)?)'

function firstNumberAfter(text: string, keyword: RegExp): number | undefined {
  for (const line of text.split('\n')) {
    const m = line.match(keyword)
    if (!m) continue
    const after = line.slice((m.index ?? 0) + m[0].length)
    const n = after.match(new RegExp(NUM))
    if (n) return toNumber(n[1])
  }
  return undefined
}

export function parseLabel(raw: string): Partial<Nutrients> {
  // Häufige OCR-Fehler glätten
  const text = raw.replace(/\r/g, '').replace(/(\d)\s*[,.]\s*(\d)/g, '$1,$2')
  const result: Partial<Nutrients> = {}

  const kcal = text.match(new RegExp(NUM + '\\s*kcal', 'i'))
  if (kcal) result.kcal = toNumber(kcal[1])
  else {
    const kj = text.match(new RegExp(NUM + '\\s*kj', 'i'))
    if (kj) result.kcal = Math.round(toNumber(kj[1]) / 4.184)
  }

  // „Fett“ – aber nicht „davon gesättigte Fettsäuren“
  result.fat = firstNumberAfter(text, /^\s*fett(?!s)\b/im) ?? firstNumberAfter(text, /\bfat\b/i)
  result.carbs = firstNumberAfter(text, /kohlen\s?hydrate?/i) ?? firstNumberAfter(text, /carbohydrate/i)
  result.protein = firstNumberAfter(text, /eiwei(ß|ss|b|s)|protein/i)

  for (const k of Object.keys(result) as (keyof Nutrients)[]) {
    if (result[k] === undefined || Number.isNaN(result[k])) delete result[k]
  }
  return result
}

/** Verkleinert das Foto und erhöht den Kontrast – macht die Texterkennung zuverlässiger. */
async function prepareImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  // Breite begrenzen, lange Screenshots aber nicht zu stark verkleinern
  const scaleBy = Math.min(1, 1600 / bitmap.width, 4000 / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scaleBy)
  canvas.height = Math.round(bitmap.height * scaleBy)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.filter = 'grayscale(1)'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  // Dunkelmodus-Screenshots (helle Schrift auf dunklem Grund) umdrehen
  const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let sumL = 0
  let count = 0
  for (let i = 0; i < sample.length; i += 4 * 97) {
    sumL += sample[i]
    count++
  }
  const dark = count > 0 && sumL / count < 110
  ctx.filter = `grayscale(1) contrast(1.4)${dark ? ' invert(1)' : ''}`
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Erkennt Text auf einem Foto oder Screenshot – läuft komplett auf dem Gerät. */
export async function readText(file: File, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('deu', 1, {
    // Von der App selbst ausgeliefert (scripts/copy-ocr.mjs) – kein CDN nötig
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/',
    langPath: '/ocr/lang',
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  try {
    const image = await prepareImage(file)
    const { data } = await worker.recognize(image)
    return data.text
  } finally {
    await worker.terminate()
  }
}

export async function readLabel(file: File, onProgress?: (p: number) => void): Promise<{ text: string; values: Partial<Nutrients> }> {
  const text = await readText(file, onProgress)
  return { text, values: parseLabel(text) }
}
