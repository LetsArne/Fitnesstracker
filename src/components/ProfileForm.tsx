import { useState } from 'react'
import { ACTIVITY_LEVELS, GOALS, calcTargets, defaultProfile, fmt } from '../lib/nutrition'
import type { Nutrients, Profile } from '../lib/types'

export function ProfileForm({ initial, submitLabel, onSave }: { initial: Profile | null; submitLabel: string; onSave: (p: Profile) => void }) {
  const base = initial ?? { ...defaultProfile(), targets: calcTargets(defaultProfile()), customTargets: false }
  const [p, setP] = useState({ ...base })
  const [num, setNum] = useState({ age: String(base.age), heightCm: String(base.heightCm), weightKg: String(base.weightKg).replace('.', ',') })
  const [custom, setCustom] = useState(base.customTargets)
  const [targets, setTargets] = useState<Nutrients>(base.targets)

  const parsed = {
    ...p,
    age: parseFloat(num.age) || 0,
    heightCm: parseFloat(num.heightCm) || 0,
    weightKg: parseFloat(num.weightKg.replace(',', '.')) || 0,
  }
  const valid = parsed.age >= 10 && parsed.heightCm >= 100 && parsed.weightKg >= 30
  const auto = valid ? calcTargets(parsed) : base.targets
  const shown = custom ? targets : auto

  return (
    <div className="stack">
      <div className="seg">
        <button className={p.sex === 'female' ? 'on' : ''} onClick={() => setP({ ...p, sex: 'female' })}>
          Frau
        </button>
        <button className={p.sex === 'male' ? 'on' : ''} onClick={() => setP({ ...p, sex: 'male' })}>
          Mann
        </button>
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <label className="field">
          Alter
          <input inputMode="numeric" value={num.age} onChange={(e) => setNum({ ...num, age: e.target.value })} />
        </label>
        <label className="field">
          Größe (cm)
          <input inputMode="numeric" value={num.heightCm} onChange={(e) => setNum({ ...num, heightCm: e.target.value })} />
        </label>
        <label className="field">
          Gewicht (kg)
          <input inputMode="decimal" value={num.weightKg} onChange={(e) => setNum({ ...num, weightKg: e.target.value })} />
        </label>
      </div>

      <div className="section-title" style={{ margin: '6px 0 0' }}>
        Wie aktiv bist du?
      </div>
      <div className="options">
        {ACTIVITY_LEVELS.map((a) => (
          <button key={a.value} className={'option' + (p.activity === a.value ? ' on' : '')} onClick={() => setP({ ...p, activity: a.value })}>
            <b>{a.label}</b> <span className="muted small">– {a.hint}</span>
          </button>
        ))}
      </div>

      <div className="section-title" style={{ margin: '6px 0 0' }}>
        Dein Ziel
      </div>
      <div className="seg">
        {GOALS.map((g) => (
          <button key={g.value} className={p.goal === g.value ? 'on' : ''} onClick={() => setP({ ...p, goal: g.value })}>
            {g.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="row spread">
          <h3>Tagesziele</h3>
          <label className="row small" style={{ gap: 6 }}>
            <input
              type="checkbox"
              checked={custom}
              onChange={(e) => {
                setCustom(e.target.checked)
                if (e.target.checked) setTargets(auto)
              }}
              style={{ width: 18, height: 18 }}
            />
            selbst festlegen
          </label>
        </div>
        {custom ? (
          <div className="form-grid" style={{ marginTop: 10 }}>
            {(
              [
                ['kcal', 'Kalorien'],
                ['protein', 'Protein (g)'],
                ['carbs', 'Kohlenhydrate (g)'],
                ['fat', 'Fett (g)'],
              ] as const
            ).map(([k, label]) => (
              <label className="field" key={k}>
                {label}
                <input
                  inputMode="numeric"
                  value={String(targets[k])}
                  onChange={(e) => setTargets({ ...targets, [k]: parseFloat(e.target.value) || 0 })}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="totals" style={{ marginTop: 10 }}>
            <div>
              <b style={{ color: 'var(--kcal)' }}>{fmt(shown.kcal)}</b>
              <span>kcal</span>
            </div>
            <div>
              <b style={{ color: 'var(--protein)' }}>{fmt(shown.protein)}</b>
              <span>Protein g</span>
            </div>
            <div>
              <b>{fmt(shown.carbs)}</b>
              <span>KH g</span>
            </div>
            <div>
              <b>{fmt(shown.fat)}</b>
              <span>Fett g</span>
            </div>
          </div>
        )}
        {!custom && (
          <p className="small muted" style={{ marginBottom: 0 }}>
            Berechnet nach Mifflin-St-Jeor. Protein: {p.goal === 'lose' ? '1,8' : p.goal === 'gain' ? '2,0' : '1,6'} g pro kg
            Körpergewicht.
          </p>
        )}
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={!valid}
        onClick={() => onSave({ ...parsed, targets: shown, customTargets: custom })}
      >
        {submitLabel}
      </button>
    </div>
  )
}
