import { useState } from 'react'
import { formatSatangAsBaht, bahtToSatang } from '../../lib/money'
import { calculateBigPurchaseAffordability, calculateDebtHeadroom, calculateMaxLoanPrincipal } from './decisionTools'
import type { AnalysisFigures } from './ratioCalculations'

export function DecisionToolsTab({ figures }: { figures: AnalysisFigures }) {
  return (
    <div>
      <BigPurchaseCard figures={figures} />
      <DebtHeadroomCard figures={figures} />
    </div>
  )
}

function BigPurchaseCard({ figures }: { figures: AnalysisFigures }) {
  const [price, setPrice] = useState('')
  const [emergencyMonths, setEmergencyMonths] = useState('6')

  const priceSatang = bahtToSatang(price)
  const months = Number(emergencyMonths) || 0
  const result =
    priceSatang > 0
      ? calculateBigPurchaseAffordability({
          purchasePrice: priceSatang,
          liquidAssets: figures.liquidAssets,
          monthlyExpense: figures.monthlyExpense,
          discretionaryMonthlyCashFlow: figures.monthlyDiscretionaryCashFlow,
          emergencyFundTargetMonths: months,
        })
      : null

  return (
    <div>
      <div className="group-title">ความสามารถซื้อของชิ้นใหญ่</div>
      <div className="card" style={{ padding: 16 }}>
        <div className="field-hint" style={{ margin: '0 0 12px' }}>
          ใช้ได้ทั้งของชิ้นใหญ่ทั่วไปและเงินดาวน์ที่อยู่อาศัย — ระบบกันเงินสำรองฉุกเฉินไว้ก่อนคำนวณเสมอ
        </div>
        <div className="field">
          <label htmlFor="purchasePrice">ราคาสินค้า/เงินดาวน์ (บาท)</label>
          <input
            id="purchasePrice"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="เช่น 50000"
          />
        </div>
        <div className="field">
          <label htmlFor="emergencyMonths">เป้าสำรองฉุกเฉิน (เดือนของค่าใช้จ่าย)</label>
          <input
            id="emergencyMonths"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={emergencyMonths}
            onChange={(e) => setEmergencyMonths(e.target.value)}
          />
        </div>

        {result && (
          <div className="report-total-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div className="report-row">
              <span>เป้าสำรองฉุกเฉิน</span>
              <span className="report-row-amount">{formatSatangAsBaht(result.emergencyFundTarget)} บาท</span>
            </div>
            <div className="report-row">
              <span>สภาพคล่องส่วนเกิน (ใช้ซื้อได้เลย)</span>
              <span className="report-row-amount">{formatSatangAsBaht(result.excessLiquidity)} บาท</span>
            </div>
            <div className="report-row">
              <span>กระแสเงินสดส่วนที่เหลือ/เดือน</span>
              <span className={`report-row-amount${figures.monthlyDiscretionaryCashFlow < 0 ? ' negative' : ''}`}>
                {formatSatangAsBaht(figures.monthlyDiscretionaryCashFlow)} บาท
              </span>
            </div>
            {result.canAffordNow ? (
              <div className="banner-info">ซื้อได้เลยตอนนี้โดยไม่แตะเงินสำรองฉุกเฉิน</div>
            ) : result.monthsToAfford === null ? (
              <div className="banner-error">กระแสเงินสดต่อเดือนไม่เป็นบวก คำนวณระยะเวลาที่ต้องเก็บเพิ่มไม่ได้</div>
            ) : (
              <div className="banner-info">เก็บเพิ่มอีกประมาณ {result.monthsToAfford} เดือน ถึงซื้อได้โดยไม่แตะเงินสำรองฉุกเฉิน</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DebtHeadroomCard({ figures }: { figures: AnalysisFigures }) {
  const [rate, setRate] = useState('')
  const [termYears, setTermYears] = useState('')

  const headroom = calculateDebtHeadroom(figures.monthlyTakeHome, figures.monthlyDebtService)
  const rateNum = Number(rate)
  const termNum = Number(termYears)
  const maxPrincipal =
    !headroom.atCeiling && rate.trim() && termYears.trim()
      ? calculateMaxLoanPrincipal(headroom.monthlyHeadroom, rateNum, termNum)
      : null

  return (
    <div>
      <div className="group-title">ความสามารถเป็นหนี้ (Debt Headroom)</div>
      <div className="card" style={{ padding: 16 }}>
        <div className="report-row">
          <span>รายได้สุทธิเฉลี่ย/เดือน</span>
          <span className="report-row-amount">{formatSatangAsBaht(figures.monthlyTakeHome)} บาท</span>
        </div>
        <div className="report-row">
          <span>เงินผ่อนหนี้ปัจจุบัน/เดือน</span>
          <span className="report-row-amount">{formatSatangAsBaht(figures.monthlyDebtService)} บาท</span>
        </div>
        <div className="report-total-row">
          <span>วงเงินผ่อนที่กู้เพิ่มได้/เดือน (เพดาน DSR 35%)</span>
          <span className={`report-row-amount${headroom.atCeiling ? ' negative' : ''}`}>
            {formatSatangAsBaht(Math.max(0, headroom.monthlyHeadroom))} บาท
          </span>
        </div>

        {headroom.atCeiling ? (
          <div className="banner-error" style={{ marginTop: 12 }}>
            DSR ปัจจุบันเต็มเพดาน 35% แล้ว ไม่แนะนำก่อหนี้เพิ่ม
          </div>
        ) : (
          <>
            <div className="field-hint" style={{ margin: '12px 0' }}>
              กรอกดอกเบี้ย+ระยะเวลาที่คาดว่าจะกู้ เพื่อย้อนดูวงเงินกู้สูงสุดที่ยังอยู่ในเพดาน DSR
            </div>
            <div className="field">
              <label htmlFor="loanRate">อัตราดอกเบี้ยที่คาด (% ต่อปี)</label>
              <input
                id="loanRate"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="loanTermYears">ระยะเวลาที่คาด (ปี)</label>
              <input
                id="loanTermYears"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={termYears}
                onChange={(e) => setTermYears(e.target.value)}
              />
            </div>
            {maxPrincipal !== null && (
              <div className="banner-info">วงเงินกู้สูงสุดโดยประมาณ: {formatSatangAsBaht(maxPrincipal)} บาท</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
