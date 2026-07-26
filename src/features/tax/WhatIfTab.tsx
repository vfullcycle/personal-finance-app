import { useMemo, useState } from 'react'
import { bahtToSatang, formatSatangAsBaht } from '../../lib/money'
import { calculateTaxReturn } from './taxCalculations'
import type { DeductionEntries, FullTaxConfig, IncomeByType, TaxReturnHeader } from './types'

// what-if: ลองเพิ่มยอดลดหย่อนรายการใดรายการหนึ่ง (เช่น "ซื้อ RMF เพิ่ม") ดูภาษีที่ประหยัดได้ทันที — reuse engine เดียวกับ /tax สรุปภาษี
export function WhatIfTab({
  incomeByType,
  config,
  header,
  deductionEntries,
  totalWithholding,
}: {
  incomeByType: IncomeByType
  config: FullTaxConfig
  header: TaxReturnHeader
  deductionEntries: DeductionEntries
  totalWithholding: number
}) {
  const candidateItems = config.deductionItems.filter((i) => i.calc_type === 'user_amount')
  const [itemKey, setItemKey] = useState(candidateItems.find((i) => i.retirement_group)?.key ?? candidateItems[0]?.key ?? '')
  const [extraAmount, setExtraAmount] = useState('')

  const baseResult = useMemo(
    () => calculateTaxReturn({ incomeByType, config, header, deductionEntries, totalWithholding }),
    [incomeByType, config, header, deductionEntries, totalWithholding],
  )

  const whatIfResult = useMemo(() => {
    const extraSatang = bahtToSatang(extraAmount)
    if (!itemKey || extraSatang <= 0) return null
    const mergedEntries: DeductionEntries = { ...deductionEntries, [itemKey]: (deductionEntries[itemKey] ?? 0) + extraSatang }
    return calculateTaxReturn({ incomeByType, config, header, deductionEntries: mergedEntries, totalWithholding })
  }, [itemKey, extraAmount, incomeByType, config, header, deductionEntries, totalWithholding])

  const taxSaved = whatIfResult ? baseResult.finalTax - whatIfResult.finalTax : 0
  const selectedItem = candidateItems.find((i) => i.key === itemKey)
  const overRetirementCap =
    selectedItem?.retirement_group &&
    whatIfResult &&
    whatIfResult.deductions.retirementCapApplied &&
    baseResult.deductions.retirementCapApplied

  return (
    <div>
      <div className="group-title">ลองเพิ่มค่าลดหย่อน</div>
      <div className="card">
        <div className="field">
          <label htmlFor="whatIfItem">รายการที่จะซื้อ/จ่ายเพิ่ม</label>
          <select id="whatIfItem" value={itemKey} onChange={(e) => setItemKey(e.target.value)}>
            {candidateItems.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label_th}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="extraAmount">จำนวนเงินที่จะซื้อเพิ่ม (บาท)</label>
          <input id="extraAmount" type="number" min={0} step="0.01" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} />
        </div>
      </div>

      {whatIfResult && (
        <>
          <div className={`report-net-card${taxSaved <= 0 ? ' negative' : ''}`} style={{ marginTop: 16 }}>
            <span>ประหยัดภาษีได้</span>
            <span className="report-row-amount">{formatSatangAsBaht(taxSaved)} บาท</span>
          </div>

          {overRetirementCap && (
            <div className="banner-info" style={{ marginTop: 8 }}>
              กลุ่มประกัน/เกษียณของคุณเกินเพดานรวม 500,000 บาทแล้ว — เงินก้อนนี้อาจไม่ช่วยประหยัดภาษีเพิ่มเลย
            </div>
          )}

          <div className="card" style={{ marginTop: 12 }}>
            <div className="report-row">
              <div className="report-row-name">ภาษีเดิม</div>
              <div className="report-row-values">
                <span className="report-row-amount">{formatSatangAsBaht(baseResult.finalTax)} บาท</span>
              </div>
            </div>
            <div className="report-row">
              <div className="report-row-name">ภาษีหลังซื้อเพิ่ม</div>
              <div className="report-row-values">
                <span className="report-row-amount">{formatSatangAsBaht(whatIfResult.finalTax)} บาท</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
