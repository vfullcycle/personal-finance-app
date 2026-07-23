import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { todayLocalDateString } from '../../lib/date'
import { emitTransactionsChanged } from './events'
import { postRecurringOccurrence } from './postRecurring'
import { resolveRecurringLegs, type ResolvableRecurringLeg } from './recurringLegBuilder'
import type { Frequency } from './types'

const MAX_CATCHUP_OCCURRENCES = 36

type DueRow = {
  id: string
  frequency: string
  amount_mode: string
  auto_post: boolean
  payee: string | null
  note: string | null
  next_due_date: string
  end_date: string | null
  recurring_transaction_legs: (Omit<ResolvableRecurringLeg, 'account'> & { accounts: ResolvableRecurringLeg['account'] })[]
}

async function deactivate(id: string) {
  await supabase.from('recurring_transactions').update({ is_active: false }).eq('id', id)
}

// รันตอนเปิดแอป: รายการประจำแบบ "ยอดคงที่ + auto-post" ให้บันทึกอัตโนมัติ (ไล่ occurrence ที่ค้างให้ครบ)
// รายการที่เหลือ (ยอดผันแปร หรือไม่ auto-post) แค่นับไว้ให้ผู้ใช้ไปยืนยันเองที่หน้า /recurring
// ผ่อนจ่ายหนี้ที่ตั้งค่าเงินกู้ไว้ครบ: resolveRecurringLegs คำนวณเงินต้น/ดอกเบี้ยสดต่อ occurrence (ไม่ใช้ค่า template คงที่)
// เลย end_date แล้ว -> ปิดใช้งานอัตโนมัติ (กันโพสต์/ค้างเตือนต่อด้วยยอด fallback ที่ไม่ตรงอีกต่อไป)
export function useDueRecurring() {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [autoPostedCount, setAutoPostedCount] = useState(0)
  const ranRef = useRef(false)

  const process = useCallback(async () => {
    if (!user) return
    const todayIso = todayLocalDateString()

    const { data } = await supabase
      .from('recurring_transactions')
      .select(
        'id, frequency, amount_mode, auto_post, payee, note, next_due_date, end_date, recurring_transaction_legs(account_id, sign, amount, note, accounts(type_id, subtype, loan_original_principal, loan_annual_rate, loan_term_months, loan_start_date, loan_interest_method))',
      )
      .eq('is_active', true)
      .lte('next_due_date', todayIso)

    const due = (data ?? []) as unknown as DueRow[]
    if (due.length === 0) {
      setPendingCount(0)
      setAutoPostedCount(0)
      return
    }

    let posted = 0
    let pending = 0

    for (const rec of due) {
      const alreadyPastEnd = rec.end_date != null && rec.next_due_date > rec.end_date
      if (alreadyPastEnd) {
        await deactivate(rec.id)
        continue
      }

      if (rec.amount_mode === 'fixed' && rec.auto_post) {
        const legsForResolve: ResolvableRecurringLeg[] = rec.recurring_transaction_legs.map((l) => ({
          account_id: l.account_id,
          sign: l.sign,
          amount: l.amount,
          note: l.note,
          account: l.accounts,
        }))
        let nextDue = rec.next_due_date
        let iterations = 0
        let ranPastEnd = false
        while (nextDue <= todayIso && iterations < MAX_CATCHUP_OCCURRENCES) {
          if (rec.end_date && nextDue > rec.end_date) {
            ranPastEnd = true
            break
          }
          let legs
          try {
            legs = resolveRecurringLegs(legsForResolve, nextDue)
          } catch {
            break
          }
          const result = await postRecurringOccurrence({
            userId: user.id,
            recurringId: rec.id,
            occurredOn: nextDue,
            frequency: rec.frequency as Frequency,
            payee: rec.payee,
            note: rec.note,
            legs,
          })
          if (result.error || !result.nextDueDate) break
          nextDue = result.nextDueDate
          posted += 1
          iterations += 1
        }
        if (ranPastEnd || (rec.end_date && nextDue > rec.end_date)) {
          await deactivate(rec.id)
        }
      } else {
        pending += 1
      }
    }

    setAutoPostedCount(posted)
    setPendingCount(pending)
    if (posted > 0) emitTransactionsChanged()
  }, [user])

  useEffect(() => {
    if (ranRef.current || !user) return
    ranRef.current = true
    process()
  }, [user, process])

  return { pendingCount, autoPostedCount, refresh: process }
}
