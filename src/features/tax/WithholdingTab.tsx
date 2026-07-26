import { useEffect, useState, type FormEvent } from 'react'
import { bahtToSatang, satangToBaht, formatSatangAsBaht } from '../../lib/money'
import type { Tables } from '../../types/database'
import type { TaxReturnHeader } from './types'

export function WithholdingTab({
  entries,
  total,
  loading,
  add,
  remove,
  header,
  saveHeader,
}: {
  entries: Tables<'tax_withholding_entries'>[]
  total: number
  loading: boolean
  add: (sourceLabel: string, amountSatang: number, note: string) => Promise<{ error: string | null }>
  remove: (id: string) => Promise<{ error: string | null }>
  header: TaxReturnHeader
  saveHeader: (h: TaxReturnHeader) => Promise<{ error: string | null }>
}) {
  const [sourceLabel, setSourceLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [pnd94Baht, setPnd94Baht] = useState(String(satangToBaht(header.pnd94_paid_satang)))
  const [pnd94Saving, setPnd94Saving] = useState(false)
  const [pnd94Saved, setPnd94Saved] = useState(false)

  useEffect(() => setPnd94Baht(String(satangToBaht(header.pnd94_paid_satang))), [header.pnd94_paid_satang])

  const handleSavePnd94 = async () => {
    setPnd94Saving(true)
    setPnd94Saved(false)
    const { error: saveError } = await saveHeader({ ...header, pnd94_paid_satang: bahtToSatang(pnd94Baht) })
    setPnd94Saving(false)
    if (!saveError) setPnd94Saved(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!sourceLabel.trim()) {
      setError('กรุณากรอกแหล่งที่มา')
      return
    }
    const satang = bahtToSatang(amount)
    if (satang <= 0) {
      setError('กรุณากรอกยอดภาษีที่หักไว้')
      return
    }
    setSubmitting(true)
    const { error: saveError } = await add(sourceLabel.trim(), satang, note.trim())
    setSubmitting(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setSourceLabel('')
    setAmount('')
    setNote('')
  }

  return (
    <div>
      <div className="group-title">ภาษีครึ่งปีที่ชำระไปแล้ว (ภ.ง.ด.94)</div>
      <div className="card">
        <div className="field-hint" style={{ margin: '0 0 8px' }}>
          สำหรับผู้มีเงินได้ 40(2)/(5)-(8) ที่ต้องยื่นครึ่งปีภายใน ก.ย. — ยอดนี้จะถูกหักออกจากภาษีเต็มปีเหมือนภาษีหัก ณ ที่จ่าย
        </div>
        {pnd94Saved && <div className="banner-info">บันทึกแล้ว</div>}
        <div className="field">
          <label htmlFor="pnd94Amount">ยอดภาษีที่ชำระไว้ตาม ภ.ง.ด.94 (บาท)</label>
          <input id="pnd94Amount" type="number" min={0} step="0.01" value={pnd94Baht} onChange={(e) => setPnd94Baht(e.target.value)} />
        </div>
        <button type="button" className="btn" onClick={handleSavePnd94} disabled={pnd94Saving}>
          {pnd94Saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>

      <div className="group-title">เพิ่มใบหัก ณ ที่จ่าย</div>
      <div className="card">
        {error && <div className="banner-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="sourceLabel">แหล่งที่มา</label>
            <input
              id="sourceLabel"
              placeholder="เช่น บริษัท ABC จำกัด"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="whtAmount">ยอดภาษีที่หักไว้ (บาท)</label>
            <input id="whtAmount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="whtNote">หมายเหตุ (ถ้ามี)</label>
            <input id="whtNote" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'เพิ่ม'}
          </button>
        </form>
      </div>

      <div className="group-title">รายการที่บันทึกไว้</div>
      {loading ? (
        <div className="empty-state">กำลังโหลด...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">ยังไม่มีใบหัก ณ ที่จ่าย</div>
      ) : (
        <div className="card">
          {entries.map((entry) => (
            <div key={entry.id} className="report-row">
              <div className="report-row-name">
                {entry.source_label}
                {entry.note && <span className="report-row-pct">{entry.note}</span>}
              </div>
              <div className="report-row-values">
                <span className="report-row-amount">{formatSatangAsBaht(entry.amount_satang)} บาท</span>
                <button type="button" className="btn btn-danger" onClick={() => remove(entry.id)}>
                  ลบ
                </button>
              </div>
            </div>
          ))}
          <div className="report-total-row">
            <span>รวม</span>
            <span className="report-row-amount">{formatSatangAsBaht(total)} บาท</span>
          </div>
        </div>
      )}
    </div>
  )
}
