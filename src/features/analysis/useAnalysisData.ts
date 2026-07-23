import { useMemo } from 'react'
import { addMonths, todayLocalDateString } from '../../lib/date'
import { useReportLegs } from '../reports/useReportLegs'
import { useBalancesAsOf } from '../reports/useBalancesAsOf'
import { calculateAnalysisFigures, type AnalysisFigures } from './ratioCalculations'

// ข้อมูลกลางของหน้า /analysis — 12 เดือนล่าสุด (flow) + ยอดคงเหลือวันนี้ (balance) ใช้ร่วมกันทั้งแท็บ ratio และ decision tools
export function useAnalysisData(): { figures: AnalysisFigures; loading: boolean; error: string | null; asOf: string } {
  const asOf = todayLocalDateString()
  const range = useMemo(() => ({ from: addMonths(asOf, -12), to: asOf }), [asOf])

  const { legs, loading: legsLoading, error: legsError } = useReportLegs(range)
  const { rows: balanceRows, loading: balancesLoading, error: balancesError } = useBalancesAsOf(asOf)

  const figures = useMemo(() => calculateAnalysisFigures(legs, balanceRows, asOf), [legs, balanceRows, asOf])

  return {
    figures,
    loading: legsLoading || balancesLoading,
    error: legsError ?? balancesError,
    asOf,
  }
}
