import { useEffect, useRef, useState } from 'react'
import { readLabel } from '../lib/label'
import type { Nutrients } from '../lib/types'

/** Foto vom Nährwert-Etikett → Texterkennung direkt auf dem Gerät (kostenlos). */
export function LabelScan({ onResult }: { onResult: (values: Partial<Nutrients>, photoUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    // Kamera direkt öffnen
    inputRef.current?.click()
  }, [])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhoto(url)
    setBusy(true)
    setProgress(0)
    try {
      const { values } = await readLabel(file, setProgress)
      onResult(values, url)
    } catch (err) {
      console.error(err)
      onResult({}, url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {photo && <img src={photo} alt="Etikett" className="photo-preview" />}
      {busy ? (
        <>
          <div className="progress">
            <div style={{ width: `${Math.max(5, progress * 100)}%` }} />
          </div>
          <p className="muted small" style={{ margin: 0, textAlign: 'center' }}>
            Lese Nährwerte … (beim ersten Mal lädt die Texterkennung kurz)
          </p>
        </>
      ) : (
        <>
          <div className="notice">
            📸 Fotografiere die <b>Nährwerttabelle</b> möglichst gerade und hell. Die Werte werden automatisch erkannt – du
            kannst sie danach prüfen.
          </div>
          <button className="btn btn-primary btn-block" onClick={() => inputRef.current?.click()}>
            Foto aufnehmen
          </button>
        </>
      )}
    </div>
  )
}
