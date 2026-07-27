import { useMemo } from 'react'
import { addMonths, todayLocalDateString } from '../../lib/date'
import { useReportLegs } from '../reports/useReportLegs'
import { useBalancesAsOf } from '../reports/useBalancesAsOf'
import { useAvailableTaxYears, useTaxConfig } from '../tax/useTaxConfig'
import { useTaxReturn } from '../tax/useTaxReturn'
import { useTaxReturnDeductions } from '../tax/useTaxReturnDeductions'
import { calculateTaxReturn } from '../tax/taxCalculations'
import { buildIncomeByTypeFromLegs, calculateAnalysisFigures, type AnalysisFigures } from './ratioCalculations'

// ข้อมูลกลางของหน้า /analysis — 12 เดือนล่าสุด (flow) + ยอดคงเหลือวันนี้ (balance) ใช้ร่วมกันทั้งแท็บ ratio และ decision tools
// take-home ประเมินภาษีจริงจากรายได้ 12 เดือนล่าสุดผ่าน calculateTaxReturn (C6) — ใช้ config ปีภาษีล่าสุดที่มี +
// ค่าลดหย่อน/header ที่ผู้ใช้เคยกรอกไว้ในหน้า /tax ปีนั้น (ถ้ายังไม่เคยกรอกเลย ถือว่า 0 ทุกช่อง — ดีกว่าไม่ประเมินภาษีเลย)
// ไม่มี tax config เลย (ผู้ใช้ยังไม่เคยตั้งค่าภาษี) → fallback เป็นรายได้ก่อนหักภาษีเหมือนเดิม (ดู takeHomeIsAfterTax)
export function useAnalysisData(): { figures: AnalysisFigures; loading: boolean; error: string | null; asOf: string } {
  const asOf = todayLocalDateString()
  const range = useMemo(() => ({ from: addMonths(asOf, -12), to: asOf }), [asOf])

  const { legs, loading: legsLoading, error: legsError } = useReportLegs(range)
  const { rows: balanceRows, loading: balancesLoading, error: balancesError } = useBalancesAsOf(asOf)

  const availableTaxYears = useAvailableTaxYears()
  const latestTaxYear = availableTaxYears[0] ?? null
  const { config: taxConfig, loading: taxConfigLoading } = useTaxConfig(latestTaxYear)
  const { header: taxHeader, loading: taxHeaderLoading } = useTaxReturn(latestTaxYear)
  const { entries: taxDeductionEntries, loading: taxEntriesLoading } = useTaxReturnDeductions(latestTaxYear)

  const estimatedTaxSatang = useMemo(() => {
    if (!taxConfig) return null
    const incomeByType = buildIncomeByTypeFromLegs(legs)
    return calculateTaxReturn({
      incomeByType,
      config: taxConfig,
      header: taxHeader,
      deductionEntries: taxDeductionEntries,
      totalWithholding: 0,
    }).finalTax
  }, [legs, taxConfig, taxHeader, taxDeductionEntries])

  const figures = useMemo(
    () => calculateAnalysisFigures(legs, balanceRows, asOf, estimatedTaxSatang),
    [legs, balanceRows, asOf, estimatedTaxSatang],
  )

  return {
    figures,
    loading: legsLoading || balancesLoading || taxConfigLoading || taxHeaderLoading || taxEntriesLoading,
    error: legsError ?? balancesError,
    asOf,
  }
}
