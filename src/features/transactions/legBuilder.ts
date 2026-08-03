// map ปุ่มผู้ใช้ (เงินเข้า/เงินออก/โอน) -> legs ตาม REQUIREMENTS §3.4/§3.5
// amount ทุกที่เป็นสตางค์ (bigint), signed: +เดบิต / -เครดิต
import type { LegInput } from './types'

export type CategorySplit = {
  accountId: string
  amount: number
  note?: string | null
  logged_at?: string
}

// หมายเหตุสำคัญ: insert() ทั้ง array ใน query เดียว (multi-row VALUES) ต้องให้ทุก leg มี key `logged_at`
// ครบเหมือนกันหมด — ถ้าบาง leg มี key นี้บาง leg ไม่มี Postgres จะ insert NULL ให้ leg ที่ไม่มี key
// แทนที่จะใช้ column default (default ใช้ได้เฉพาะตอน "ทั้ง statement" ไม่ระบุคอลัมน์นั้นเลย ไม่ใช่ต่อแถว)
// leg รวม (aggregate) จึงต้องใส่เวลาปัจจุบันด้วย แม้ไม่มีความหมายพิเศษ (ไม่เคยถูกแสดงผล)

export function buildIncomeLegs(assetAccountId: string, splits: CategorySplit[]): LegInput[] {
  const total = splits.reduce((sum, s) => sum + s.amount, 0)
  return [
    { account_id: assetAccountId, amount: total, logged_at: new Date().toISOString() },
    ...splits.map((s) => ({ account_id: s.accountId, amount: -s.amount, note: s.note ?? null, logged_at: s.logged_at })),
  ]
}

export function buildExpenseLegs(payAccountId: string, splits: CategorySplit[]): LegInput[] {
  const total = splits.reduce((sum, s) => sum + s.amount, 0)
  return [
    ...splits.map((s) => ({ account_id: s.accountId, amount: s.amount, note: s.note ?? null, logged_at: s.logged_at })),
    { account_id: payAccountId, amount: -total, logged_at: new Date().toISOString() },
  ]
}

export function buildTransferLegs(sourceAccountId: string, destAccountId: string, amount: number): LegInput[] {
  return [
    { account_id: destAccountId, amount },
    { account_id: sourceAccountId, amount: -amount },
  ]
}

// ผ่อนจ่ายหนี้: แยกเงินต้น(ลดหนี้)/ดอกเบี้ย(expense) ห้ามเหมาก้อนเดียว (REQUIREMENTS §3.5)
export function buildDebtPaymentLegs(
  sourceAccountId: string,
  loanAccountId: string,
  interestExpenseAccountId: string,
  principal: number,
  interest: number,
): LegInput[] {
  const legs: LegInput[] = [{ account_id: loanAccountId, amount: principal }]
  if (interest > 0) {
    legs.push({ account_id: interestExpenseAccountId, amount: interest })
  }
  legs.push({ account_id: sourceAccountId, amount: -(principal + interest) })
  return legs
}
