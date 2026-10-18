import { useEffect, useRef, useState } from 'react'

/** Kamera-Barcodescanner (EAN/UPC). Nutzt ZXing – läuft komplett im Browser. */
export function Scanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const done = useRef(false)

  useEffect(() => {
    let controls: { stop: () => void } | undefined
    let cancelled = false
    ;(async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ])
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
        if (cancelled || !videoRef.current) return
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } },
          videoRef.current,
          (result) => {
            if (result && !done.current) {
              done.current = true
              navigator.vibrate?.(60)
              controls?.stop()
              onDetected(result.getText())
            }
          },
        )
        if (cancelled) controls.stop()
      } catch (err) {
        console.error(err)
        setError(
          (err as Error)?.name === 'NotAllowedError'
            ? 'Kein Kamerazugriff. Bitte in den Browser-Einstellungen erlauben.'
            : 'Kamera konnte nicht gestartet werden.',
        )
      }
    })()
    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [onDetected])

  const code = manual.replace(/\D/g, '')

  return (
    <div className="stack">
      {error ? (
        <div className="notice">{error}</div>
      ) : (
        <div className="scanner">
          <video ref={videoRef} playsInline muted />
          <div className="scanner-frame" />
        </div>
      )}
      <p className="muted small" style={{ margin: 0, textAlign: 'center' }}>
        Barcode in den Rahmen halten – er wird automatisch erkannt.
      </p>
      <div className="row">
        <input
          inputMode="numeric"
          placeholder="Barcode-Nummer eintippen"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn" disabled={code.length < 8} onClick={() => onDetected(code)}>
          Suchen
        </button>
      </div>
    </div>
  )
}
