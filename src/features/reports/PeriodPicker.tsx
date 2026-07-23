import { availableCompareModes, getRange, shiftAnchor, type CompareMode, type PeriodType } from './period'

const PERIOD_TYPES: { id: PeriodType; label: string }[] = [
  { id: 'month', label: 'รายเดือน' },
  { id: 'year', label: 'รายปี' },
]

export function PeriodPicker({
  periodType,
  anchor,
  compareMode,
  onPeriodTypeChange,
  onAnchorChange,
  onCompareModeChange,
}: {
  periodType: PeriodType
  anchor: Date
  compareMode: CompareMode
  onPeriodTypeChange: (t: PeriodType) => void
  onAnchorChange: (d: Date) => void
  onCompareModeChange: (m: CompareMode) => void
}) {
  const range = getRange(anchor, periodType)

  return (
    <div className="period-picker">
      <div className="tabs">
        {PERIOD_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${periodType === t.id ? ' active' : ''}`}
            onClick={() => {
              onPeriodTypeChange(t.id)
              onCompareModeChange('none')
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="list-header">
        <button
          type="button"
          className="btn-secondary btn"
          aria-label="ช่วงก่อนหน้า"
          onClick={() => onAnchorChange(shiftAnchor(anchor, periodType, -1))}
        >
          ‹
        </button>
        <div style={{ fontWeight: 700 }}>{range.label}</div>
        <button
          type="button"
          className="btn-secondary btn"
          aria-label="ช่วงถัดไป"
          onClick={() => onAnchorChange(shiftAnchor(anchor, periodType, 1))}
        >
          ›
        </button>
      </div>

      <div className="radio-group">
        {availableCompareModes(periodType).map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`radio-chip${compareMode === opt.value ? ' active' : ''}`}
            onClick={() => onCompareModeChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
