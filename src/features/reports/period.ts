// ช่วงเวลา + การเทียบช่วงสำหรับงบทุกตัวใน C4 (REQUIREMENTS §4 M5 ข้อ 5 "เทียบช่วงทุกงบ")
import { toLocalDateString } from '../../lib/date'

export type PeriodType = 'month' | 'year'
export type CompareMode = 'none' | 'previous' | 'yoy'

export type DateRange = {
  from: string
  to: string
  /** วันสิ้นสุดช่วง ใช้เป็น as-of date สำหรับงบดุล/net worth */
  asOf: string
  label: string
}

function monthRange(anchor: Date): DateRange {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return {
    from: toLocalDateString(from),
    to: toLocalDateString(to),
    asOf: toLocalDateString(to),
    label: anchor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
  }
}

function yearRange(anchor: Date): DateRange {
  const from = new Date(anchor.getFullYear(), 0, 1)
  const to = new Date(anchor.getFullYear(), 11, 31)
  return {
    from: toLocalDateString(from),
    to: toLocalDateString(to),
    asOf: toLocalDateString(to),
    label: `ปี ${anchor.toLocaleDateString('th-TH', { year: 'numeric' })}`,
  }
}

export function getRange(anchor: Date, periodType: PeriodType): DateRange {
  return periodType === 'month' ? monthRange(anchor) : yearRange(anchor)
}

export function shiftAnchor(anchor: Date, periodType: PeriodType, delta: number): Date {
  return periodType === 'month'
    ? new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1)
    : new Date(anchor.getFullYear() + delta, 0, 1)
}

// ทางเลือกเทียบช่วงที่ใช้ได้ตาม periodType (ปี เทียบปีก่อนหน้าได้ทางเดียว)
export function availableCompareModes(periodType: PeriodType): { value: CompareMode; label: string }[] {
  if (periodType === 'year') {
    return [
      { value: 'none', label: 'ไม่เทียบ' },
      { value: 'previous', label: 'ปีก่อนหน้า' },
    ]
  }
  return [
    { value: 'none', label: 'ไม่เทียบ' },
    { value: 'previous', label: 'เดือนก่อนหน้า (MoM)' },
    { value: 'yoy', label: 'เดือนเดียวกันปีก่อน (YoY)' },
  ]
}

export function getCompareRange(anchor: Date, periodType: PeriodType, compareMode: CompareMode): DateRange | null {
  if (compareMode === 'none') return null
  if (compareMode === 'yoy') return getRange(shiftAnchor(anchor, 'year', -1), 'month')
  return getRange(shiftAnchor(anchor, periodType, -1), periodType)
}

// เปอร์เซ็นต์เปลี่ยนแปลง — คืน null ถ้าฐานเป็น 0 (ให้ผู้เรียกโชว์ป้าย "ใหม่" แทน)
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}
