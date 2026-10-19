// Kopiert die Texterkennung (Tesseract) samt deutschem Sprachpaket nach public/ocr,
// damit die App sie selbst ausliefert – ohne fremde CDNs und auch offline.
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const out = join(import.meta.dirname, '..', 'public', 'ocr')
mkdirSync(join(out, 'lang'), { recursive: true })

const tesseract = dirname(require.resolve('tesseract.js/package.json'))
const core = dirname(require.resolve('tesseract.js-core/package.json'))
const deu = dirname(require.resolve('@tesseract.js-data/deu/package.json'))

cpSync(join(tesseract, 'dist', 'worker.min.js'), join(out, 'worker.min.js'))
// Nur die LSTM-Varianten werden gebraucht (Standard-Modus von createWorker)
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) {
  cpSync(join(core, f), join(out, f))
}
cpSync(join(deu, '4.0.0_best_int', 'deu.traineddata.gz'), join(out, 'lang', 'deu.traineddata.gz'))
console.log('OCR-Dateien nach public/ocr kopiert')
