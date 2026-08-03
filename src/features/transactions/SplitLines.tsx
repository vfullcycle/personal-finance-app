import { useState } from 'react'
import { CategorySelect } from './CategorySelect'
import { Modal } from '../../components/Modal'
import type { AccountRow } from '../accounts/useAccounts'
import { formatLocalTime } from '../../lib/date'
import { bahtToSatang, formatSatangAsBaht, satangToBaht } from '../../lib/money'

export type SplitLine = { id: string; accountId: string; amount: string; note: string; loggedAt: string; locked: boolean }

export function newSplitLine(): SplitLine {
  return { id: crypto.randomUUID(), accountId: '', amount: '', note: '', loggedAt: new Date().toISOString(), locked: false }
}

export function newLockedSplitLine(accountId: string, amount: string, note: string): SplitLine {
  return { id: crypto.randomUUID(), accountId, amount, note, loggedAt: new Date().toISOString(), locked: true }
}

function sharedAccountId(lines: SplitLine[]): string | null {
  const ids = new Set(lines.map((l) => l.accountId).filter(Boolean))
  return ids.size === 1 ? [...ids][0] : null
}

function AddAmountModal({
  initialAmount = '',
  initialNote = '',
  isEdit = false,
  onCancel,
  onConfirm,
}: {
  initialAmount?: string
  initialNote?: string
  isEdit?: boolean
  onCancel: () => void
  onConfirm: (amount: string, note: string) => void
}) {
  const [amount, setAmount] = useState(initialAmount)
  const [note, setNote] = useState(initialNote)

  return (
    <Modal title={isEdit ? 'แก้ไขยอด' : 'เพิ่มยอด'} onClose={onCancel}>
      <div className="field">
        <label htmlFor="add-amount-note">รายการ (ถ้ามี)</label>
        <input id="add-amount-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น มื้อเที่ยง" />
      </div>
      <div className="field">
        <label htmlFor="add-amount-value">จำนวนเงิน (บาท)</label>
        <input
          id="add-amount-value"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn-secondary btn" onClick={onCancel}>
          ยกเลิก
        </button>
        <button
          type="button"
          className="btn"
          disabled={bahtToSatang(amount) <= 0}
          onClick={() => onConfirm(amount, note.trim())}
        >
          {isEdit ? 'บันทึก' : 'ตกลง'}
        </button>
      </div>
    </Modal>
  )
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
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const update = (id: string, patch: Partial<SplitLine>) =>
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id))
  const add = () => onChange([...lines, newSplitLine()])

  const unlockedLines = lines.filter((l) => !l.locked)
  const lockedLines = lines.filter((l) => l.locked)
  const canAccumulate = sharedAccountId(lines) !== null

  const historySatangFor = (accountId: string) =>
    lockedLines.filter((l) => l.accountId === accountId).reduce((sum, l) => sum + bahtToSatang(l.amount), 0)

  // ประวัติต้องรวมยอดที่กรอกครั้งแรก (บรรทัดหลัก) ด้วย ไม่ใช่แค่ยอดที่เพิ่มทีหลังผ่าน +
  const historyEntries = unlockedLines
    .filter((l) => historySatangFor(l.accountId) > 0)
    .flatMap((l) => [l, ...lockedLines.filter((x) => x.accountId === l.accountId)])
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))

  return (
    <div>
      {unlockedLines.map((line, idx) => (
        <div className="split-line" key={line.id}>
          <div className="field">
            <label htmlFor={`split-category-${line.id}`}>{unlockedLines.length > 1 ? `หมวดที่ ${idx + 1}` : 'หมวดหมู่'}</label>
            <CategorySelect
              id={`split-category-${line.id}`}
              accounts={categories}
              value={line.accountId}
              onChange={(v) => update(line.id, { accountId: v })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`split-amount-${line.id}`}>จำนวนเงิน (บาท){historySatangFor(line.accountId) > 0 ? ' (ยอดรวม)' : ''}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id={`split-amount-${line.id}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={
                  historySatangFor(line.accountId) > 0
                    ? String(satangToBaht(bahtToSatang(line.amount) + historySatangFor(line.accountId)))
                    : line.amount
                }
                onChange={(e) => {
                  const history = historySatangFor(line.accountId)
                  const newAmount = history > 0 ? String(satangToBaht(bahtToSatang(e.target.value) - history)) : e.target.value
                  update(line.id, { amount: newAmount })
                }}
                required
              />
              {canAccumulate && (
                <button type="button" className="btn-secondary btn" onClick={() => setAddingFor(line.id)}>
                  +
                </button>
              )}
            </div>
          </div>
          {unlockedLines.length > 1 && (
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
          {unlockedLines.length > 1 && (
            <button type="button" className="btn-secondary btn btn-block" onClick={() => remove(line.id)}>
              ลบหมวดนี้
            </button>
          )}
        </div>
      ))}

      {historyEntries.length > 0 && (
        <div className="split-history">
          <div>ประวัติที่เพิ่ม:</div>
          <ul>
            {historyEntries.map((line, idx) => (
              <li key={line.id}>
                {idx + 1}. {line.note || 'ไม่ระบุรายการ'} · {formatSatangAsBaht(bahtToSatang(line.amount))} บาท · เพิ่มเมื่อ{' '}
                {formatLocalTime(new Date(line.loggedAt))} น.
                {line.locked && (
                  <>
                    {' '}
                    <button type="button" className="btn-secondary" onClick={() => setEditingId(line.id)}>
                      แก้ไข
                    </button>{' '}
                    <button type="button" className="btn-secondary" onClick={() => remove(line.id)}>
                      ลบ
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="btn-secondary btn btn-block" onClick={add}>
        + เพิ่มหมวด (แยกรายการในบิลเดียว)
      </button>

      {addingFor && (
        <AddAmountModal
          onCancel={() => setAddingFor(null)}
          onConfirm={(amount, note) => {
            const line = lines.find((l) => l.id === addingFor)
            if (line) onChange([...lines, newLockedSplitLine(line.accountId, amount, note)])
            setAddingFor(null)
          }}
        />
      )}

      {editingId &&
        (() => {
          const line = lines.find((l) => l.id === editingId)
          if (!line) return null
          return (
            <AddAmountModal
              isEdit
              initialAmount={line.amount}
              initialNote={line.note}
              onCancel={() => setEditingId(null)}
              onConfirm={(amount, note) => {
                update(line.id, { amount, note })
                setEditingId(null)
              }}
            />
          )
        })()}
    </div>
  )
}
