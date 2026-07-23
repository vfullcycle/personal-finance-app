import { CategorySelect } from './CategorySelect'
import type { AccountRow } from '../accounts/useAccounts'

export type SplitLine = { id: string; accountId: string; amount: string; note: string }

export function newSplitLine(): SplitLine {
  return { id: crypto.randomUUID(), accountId: '', amount: '', note: '' }
}

export function SplitLines({
  lines,
  categories,
  onChange,
}: {
  lines: SplitLine[]
  categories: AccountRow[]
  onChange: (lines: SplitLine[]) => void
}) {
  const update = (id: string, patch: Partial<SplitLine>) =>
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id))
  const add = () => onChange([...lines, newSplitLine()])

  return (
    <div>
      {lines.map((line, idx) => (
        <div className="split-line" key={line.id}>
          <div className="field">
            <label htmlFor={`split-category-${line.id}`}>{lines.length > 1 ? `หมวดที่ ${idx + 1}` : 'หมวดหมู่'}</label>
            <CategorySelect
              id={`split-category-${line.id}`}
              accounts={categories}
              value={line.accountId}
              onChange={(v) => update(line.id, { accountId: v })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`split-amount-${line.id}`}>จำนวนเงิน (บาท)</label>
            <input
              id={`split-amount-${line.id}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={line.amount}
              onChange={(e) => update(line.id, { amount: e.target.value })}
              required
            />
          </div>
          {lines.length > 1 && (
            <div className="field">
              <label htmlFor={`split-note-${line.id}`}>โน้ต (ถ้ามี)</label>
              <input
                id={`split-note-${line.id}`}
                value={line.note}
                onChange={(e) => update(line.id, { note: e.target.value })}
                placeholder="เช่น ขนม 50, นม 30"
              />
            </div>
          )}
          {lines.length > 1 && (
            <button type="button" className="btn-secondary btn btn-block" onClick={() => remove(line.id)}>
              ลบหมวดนี้
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn-secondary btn btn-block" onClick={add}>
        + เพิ่มหมวด (แยกรายการในบิลเดียว)
      </button>
    </div>
  )
}
