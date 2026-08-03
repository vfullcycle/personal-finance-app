export type FlowType = 'income' | 'expense' | 'transfer'
export type Frequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual'
export type AmountMode = 'fixed' | 'variable'

export const FLOW_LABEL: Record<FlowType, string> = {
  income: 'เงินเข้า',
  expense: 'เงินออก',
  transfer: 'โอน',
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  monthly: 'รายเดือน',
  quarterly: 'ราย 3 เดือน',
  semiannual: 'ราย 6 เดือน',
  annual: 'รายปี',
}

export const AMOUNT_MODE_LABEL: Record<AmountMode, string> = {
  fixed: 'ยอดคงที่',
  variable: 'ยอดผันแปร',
}

// signed เหมือน transaction_legs.amount: +เดบิต / -เครดิต (REQUIREMENTS §3.3)
export type LegInput = {
  account_id: string
  amount: number
  note?: string | null
  logged_at?: string
}

// ผ่อนจ่ายหนี้ (เงินต้น+ดอกเบี้ย) มี leg ประเภท expense (ดอกเบี้ย) ปนอยู่ด้วย
// แต่ต้องจัดเป็น "โอน" ไม่ใช่ "เงินออก" ธรรมดา — สัญญาณที่แยกสองกรณีนี้ได้คือทิศทางของ leg หนี้สิน:
// เงินออกด้วยบัตร → leg หนี้สินเป็นฝั่งเครดิต (หนี้เพิ่ม, isDebit=false)
// ผ่อนจ่ายหนี้ → leg หนี้สินเป็นฝั่งเดบิต (หนี้ลด, isDebit=true)
// รับ shape กลางเพื่อให้ transaction_legs (amount signed) และ recurring_transaction_legs (sign แยกจาก amount) ใช้ร่วมกันได้
function detectFlowFromLegs(legs: { typeId: string; isDebit: boolean }[]): FlowType {
  if (legs.some((l) => l.typeId === 'income')) return 'income'
  if (legs.some((l) => l.typeId === 'liability' && l.isDebit)) return 'transfer'
  if (legs.some((l) => l.typeId === 'expense')) return 'expense'
  return 'transfer'
}

// ใช้กับรายการจริง (transaction_legs.amount เป็น signed: +เดบิต/-เครดิต)
export function detectFlow(legs: { account: { type_id: string }; amount: number }[]): FlowType {
  return detectFlowFromLegs(legs.map((l) => ({ typeId: l.account.type_id, isDebit: l.amount > 0 })))
}

// ใช้กับเทมเพลตรายการประจำ (recurring_transaction_legs.sign แยกจาก amount เพราะยอดผันแปรไม่รู้จำนวนล่วงหน้า)
export function detectRecurringFlow(legs: { account: { type_id: string }; sign: number }[]): FlowType {
  return detectFlowFromLegs(legs.map((l) => ({ typeId: l.account.type_id, isDebit: l.sign > 0 })))
}
