import { supabase } from '../../lib/supabase'
import { addPeriod } from './recurringDates'
import type { Frequency, LegInput } from './types'

// โพสต์ 1 occurrence ของรายการประจำ: สร้าง transaction+legs จริง แล้วเลื่อน next_due_date ไปรอบถัดไป
export async function postRecurringOccurrence(params: {
  userId: string
  recurringId: string
  occurredOn: string
  frequency: Frequency
  payee: string | null
  note: string | null
  legs: LegInput[]
}): Promise<{ error: { message: string } | null; nextDueDate?: string }> {
  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({ user_id: params.userId, occurred_on: params.occurredOn, payee: params.payee, note: params.note })
    .select()
    .single()

  if (txnError || !txn) {
    return { error: txnError ?? { message: 'สร้างรายการไม่สำเร็จ' } }
  }

  const { error: legsError } = await supabase
    .from('transaction_legs')
    .insert(params.legs.map((l) => ({ ...l, transaction_id: txn.id, user_id: params.userId })))

  if (legsError) {
    return { error: legsError }
  }

  const nextDueDate = addPeriod(params.occurredOn, params.frequency)
  const { error: updateError } = await supabase
    .from('recurring_transactions')
    .update({ next_due_date: nextDueDate, last_posted_date: params.occurredOn })
    .eq('id', params.recurringId)

  return { error: updateError, nextDueDate }
}
