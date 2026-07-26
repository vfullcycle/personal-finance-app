import { useMemo } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { INCOME_TYPE_LABEL } from '../accounts/constants'
import { INCOME_ITEM_NUMBER } from './constants'
import { calculateTaxReturn } from './taxCalculations'
import type { DeductionEntries, FullTaxConfig, IncomeByType, TaxReturnHeader } from './types'

// เดินตามเลข "ข้อ" / "บรรทัด" ของแบบ ภ.ง.ด.90 จริง (ไม่ใช่แค่สรุปกลมๆ) — ตกลงกับวีหลัง reconcile กับแบบฟอร์มจริง
// เพื่อให้วีเทียบเลขทีละบรรทัดกับแบบฟอร์มตัวจริงได้ ถ้าเคยยื่นภาษีมาก่อน
export function TaxSummaryTab({
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
  const result = useMemo(
    () => calculateTaxReturn({ incomeByType, config, header, deductionEntries, totalWithholding }),
    [incomeByType, config, header, deductionEntries, totalWithholding],
  )

  const hasIncome = result.expense.totalGross > 0
  const bracketLines = result.bracket.lines.filter((l) => l.taxableAmount > 0)

  // จัดกลุ่มเงินได้ตามเลข "ข้อ" ของแบบฟอร์มจริง (40(1)+40(2) รวมเป็นข้อ 1 เดียวกัน ที่เหลือคนละข้อ)
  const incomeGroups = useMemo(() => {
    const groups = new Map<number, typeof result.expense.byType>()
    for (const row of result.expense.byType) {
      if (row.gross <= 0) continue
      const itemNo = INCOME_ITEM_NUMBER[row.incomeType]
      groups.set(itemNo, [...(groups.get(itemNo) ?? []), row])
    }
    return [...groups.entries()].sort(([a], [b]) => a - b)
  }, [result.expense.byType])

  const doubleDonationTotal = result.deductions.lines
    .filter((l) => l.category === 'donation' && ['donation_education_hospital'].includes(l.key))
    .reduce((s, l) => s + l.applied, 0)
  const generalDonationTotal = result.deductions.donationTotal - doubleDonationTotal

  // บรรทัด 3/5 ของแบบฟอร์มจริง ไม่มีทางติดลบ (ลดหย่อน/บริจาคเกินเงินได้ = ใช้ได้แค่เท่าที่มี ส่วนเกินไม่ยกไปลบต่อ) — clamp ที่ 0 กันแสดงเลขติดลบที่ทำให้งง
  const line3 = Math.max(0, result.expense.totalNet - result.deductions.otherTotal)
  const line5 = Math.max(0, line3 - doubleDonationTotal)

  // เพดานหักค่าใช้จ่ายร่วม 40(1)+40(2) (50% ไม่เกิน 100,000) — เตือนถ้าเต็มแล้ว กันงงว่าทำไมรายได้ส่วนเพิ่มไม่ได้หักเพิ่ม
  const salaryFreelanceRule = config.expenseRules.find((r) => r.shared_group === 'salary_freelance')
  const salaryFreelanceExpense = result.expense.byType
    .filter((r) => r.incomeType === '40(1)' || r.incomeType === '40(2)')
    .reduce((s, r) => s + r.expense, 0)
  const salaryFreelanceCapFull =
    !!salaryFreelanceRule?.cap_satang && salaryFreelanceExpense >= salaryFreelanceRule.cap_satang

  return (
    <div>
      {!hasIncome ? (
        <div className="empty-state">ยังไม่มีรายการเงินได้ที่ติด "ต้องเสียภาษี" ในปีภาษีนี้</div>
      ) : (
        incomeGroups.map(([itemNo, rows]) => (
          <div key={itemNo}>
            <div className="group-title">
              ข้อ {itemNo} · เงินได้พึงประเมินตามมาตรา {rows.map((r) => r.incomeType).join(', ')}
            </div>
            <div className="card">
              {rows.map((row) => (
                <div key={row.incomeType} className="report-row">
                  <div className="report-row-name">
                    {INCOME_TYPE_LABEL[row.incomeType]}
                    <span className="report-row-pct">หักค่าใช้จ่าย {formatSatangAsBaht(row.expense)} บาท</span>
                  </div>
                  <div className="report-row-values">
                    <span className="report-row-amount">{formatSatangAsBaht(row.net)} บาท</span>
                  </div>
                </div>
              ))}
              <div className="report-total-row">
                <span>คงเหลือ</span>
                <span className="report-row-amount">{formatSatangAsBaht(rows.reduce((s, r) => s + r.net, 0))} บาท</span>
              </div>
            </div>
            {itemNo === 1 && salaryFreelanceCapFull && (
              <div className="banner-info" style={{ marginTop: 8 }}>
                เพดานหักค่าใช้จ่ายรวม 40(1)+40(2) เต็มแล้ว ({formatSatangAsBaht(salaryFreelanceRule!.cap_satang!)} บาท) — เงินได้ส่วนที่เพิ่มจากนี้ในสองประเภทนี้จะไม่ได้หักค่าใช้จ่ายเพิ่มอีก
              </div>
            )}
          </div>
        ))
      )}

      <div className="group-title">ข้อ 11 บรรทัด 1 · เงินได้หลังจากหักค่าใช้จ่าย (รวมทุกข้อ)</div>
      <div className="report-total-row">
        <span>รวมเงินได้หลังหักค่าใช้จ่าย</span>
        <span className="report-row-amount">{formatSatangAsBaht(result.expense.totalNet)} บาท</span>
      </div>

      <div className="group-title">บรรทัด 2 · หัก ค่าลดหย่อนฯ (ไม่รวมเงินบริจาค)</div>
      <div className="card">
        <div className="report-row">
          <div className="report-row-name">รวมค่าลดหย่อน</div>
          <div className="report-row-values">
            <span className="report-row-amount">{formatSatangAsBaht(result.deductions.otherTotal)} บาท</span>
          </div>
        </div>
        {result.deductions.retirementCapApplied && (
          <div className="banner-info" style={{ marginTop: 8 }}>
            กลุ่มประกัน/เกษียณรวมกันเกินเพดาน {formatSatangAsBaht(result.deductions.retirementAppliedTotal)} บาท — ระบบตัดให้อัตโนมัติแล้ว
            (กรอกไว้จริง {formatSatangAsBaht(result.deductions.retirementRawTotal)} บาท)
          </div>
        )}
        {result.deductions.lifeHealthCapApplied && (
          <div className="banner-info" style={{ marginTop: 8 }}>
            เบี้ยประกันชีวิต+สุขภาพตนเองรวมกันเกินเพดาน {formatSatangAsBaht(result.deductions.lifeHealthAppliedTotal)} บาท —
            ระบบตัดให้อัตโนมัติแล้ว (กรอกไว้จริง {formatSatangAsBaht(result.deductions.lifeHealthRawTotal)} บาท)
          </div>
        )}
      </div>

      <div className="report-total-row">
        <span>บรรทัด 3 · คงเหลือ</span>
        <span className="report-row-amount">{formatSatangAsBaht(line3)} บาท</span>
      </div>

      {doubleDonationTotal > 0 && (
        <>
          <div className="group-title">
            บรรทัด 4 · หัก เงินบริจาค 2 เท่า (การศึกษา/กีฬา/รพ.รัฐ) — {formatSatangAsBaht(doubleDonationTotal)} บาท
          </div>
          <div className="report-total-row">
            <span>บรรทัด 5 · คงเหลือ</span>
            <span className="report-row-amount">{formatSatangAsBaht(line5)} บาท</span>
          </div>
        </>
      )}

      {generalDonationTotal > 0 && (
        <div className="group-title">บรรทัด 6 · หัก เงินบริจาคทั่วไป — {formatSatangAsBaht(generalDonationTotal)} บาท</div>
      )}

      <div className={`report-net-card`} style={{ marginTop: 8 }}>
        <span>บรรทัด 7 · เงินได้สุทธิ</span>
        <span className="report-row-amount">{formatSatangAsBaht(result.netTaxableIncome)} บาท</span>
      </div>

      <div className="group-title">บรรทัด 8 · ภาษีคำนวณจากเงินได้สุทธิ (ขั้นบันได)</div>
      <div className="card">
        {bracketLines.length === 0 ? (
          <div className="report-row">
            <div className="report-row-name">อยู่ในเกณฑ์ยกเว้น (150,000 บาทแรก)</div>
          </div>
        ) : (
          bracketLines.map((l) => (
            <div key={l.seq} className="report-row">
              <div className="report-row-name">อัตรา {l.rate_percent}%</div>
              <div className="report-row-values">
                <span className="report-row-pct">ฐาน {formatSatangAsBaht(l.taxableAmount)} บาท</span>
                <span className="report-row-amount">{formatSatangAsBaht(l.tax)} บาท</span>
              </div>
            </div>
          ))
        )}
        <div className="report-total-row">
          <span>ภาษีวิธีขั้นบันได</span>
          <span className="report-row-amount">{formatSatangAsBaht(result.bracket.tax)} บาท</span>
        </div>
      </div>

      {result.section48_2Tax > 0 && (
        <div className="banner-info" style={{ marginTop: 8 }}>
          บรรทัด 9-10 · มีเงินได้ประเภท 40(2)-(8) เข้าเกณฑ์ต้องเทียบวิธีมาตรา 48(2): 0.5% ของเงินได้พึงประเมิน ={' '}
          {formatSatangAsBaht(result.section48_2Tax)} บาท —{' '}
          {result.methodUsed === 'section48_2' ? 'วิธีนี้สูงกว่า ใช้วิธีนี้แทน' : 'วิธีขั้นบันไดยังสูงกว่า ใช้วิธีขั้นบันได'}
        </div>
      )}

      <div className={`report-net-card${result.owe > 0 ? ' negative' : ''}`} style={{ marginTop: 16 }}>
        <span>บรรทัด 10 · ภาษีที่ต้องชำระทั้งปี</span>
        <span className="report-row-amount">{formatSatangAsBaht(result.finalTax)} บาท</span>
      </div>

      <div className="group-title">บรรทัด 15 · หัก ภาษีเงินได้หัก ณ ที่จ่าย และภาษีชำระไว้ล่วงหน้า</div>
      <div className="card">
        <div className="report-row">
          <div className="report-row-name">ภาษีหัก ณ ที่จ่ายสะสม</div>
          <div className="report-row-values">
            <span className="report-row-amount">{formatSatangAsBaht(result.totalWithholding)} บาท</span>
          </div>
        </div>
        {result.pnd94Paid > 0 && (
          <div className="report-row">
            <div className="report-row-name">ภาษีครึ่งปีที่ชำระไว้ (ภ.ง.ด.94)</div>
            <div className="report-row-values">
              <span className="report-row-amount">{formatSatangAsBaht(result.pnd94Paid)} บาท</span>
            </div>
          </div>
        )}
      </div>

      {result.refund > 0 ? (
        <div className="report-net-card" style={{ marginTop: 8 }}>
          <span>บรรทัด 25 · คืนภาษี</span>
          <span className="report-row-amount">{formatSatangAsBaht(result.refund)} บาท</span>
        </div>
      ) : result.owe > 0 ? (
        <div className="report-net-card negative" style={{ marginTop: 8 }}>
          <span>บรรทัด 25 · ต้องจ่ายเพิ่ม</span>
          <span className="report-row-amount">{formatSatangAsBaht(result.owe)} บาท</span>
        </div>
      ) : (
        <div className="banner-info" style={{ marginTop: 8 }}>เท่ากันพอดี ไม่ต้องจ่ายเพิ่ม ไม่ได้คืน</div>
      )}
    </div>
  )
}
