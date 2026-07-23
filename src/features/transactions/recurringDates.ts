import { addMonths } from '../../lib/date'
import type { Frequency } from './types'

const MONTHS_PER_FREQUENCY: Record<Frequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
}

export function addPeriod(dateIso: string, frequency: Frequency): string {
  return addMonths(dateIso, MONTHS_PER_FREQUENCY[frequency])
}
