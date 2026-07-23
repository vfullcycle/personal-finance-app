// map ปุ่มผู้ใช้ (เงินเข้า/เงินออก/โอน) -> legs ตาม REQUIREMENTS §3.4/§3.5
// amount ทุกที่เป็นสตางค์ (bigint), signed: +เดบิต / -เครดิต
import type { LegInput } from './types'

export type CategorySplit = {
  accountId: string
  amount: number
  note?: string | null
}

export function buildIncomeLegs(assetAccountId: string, splits: CategorySplit[]): LegInput[] {
  const total = splits.reduce((sum, s) => sum + s.amount, 0)
  return [
    { account_id: assetAccountId, amount: total },
    ...splits.map((s) => ({ account_id: s.accountId, amount: -s.amount, note: s.note ?? null })),
  ]
}

export function buildExpenseLegs(payAccountId: string, splits: CategorySplit[]): LegInput[] {
  const total = splits.reduce((sum, s) => sum + s.amount, 0)
  return [
    ...splits.map((s) => ({ account_id: s.accountId, amount: s.amount, note: s.note ?? null })),
    { account_id: payAccountId, amount: -total },
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
