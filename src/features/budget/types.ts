// Domain types สำหรับ Budget (M7, C7 ช่วง 2) — ตารางเดียว budget_items (รวมชั้น A+B เดิมเข้าด้วยกันระหว่างแชต)
// เหตุผลที่รวม: ชั้น B (เดิม) ครอบคลุมทุกอย่างที่ชั้น A ทำได้ (ชั้น A = ชั้น B ที่ end_date ไม่มีกำหนด) การแยกสร้างความกำกวม
// ("ต่อปี" ของชั้น A เดิมหมายถึงเฉลี่ยเรียบ ต่างจากชั้น B ที่ลงก้อนเดียว) — ดูรายละเอียดใน SPEC-budget.md
import type { Tables } from '../../types/database'

export type BudgetDirection = 'outflow' | 'inflow' | 'transfer_to_asset'
export type BudgetFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'onetime'

export type BudgetItem = Tables<'budget_items'>

export const BUDGET_DIRECTION_LABEL: Record<BudgetDirection, string> = {
  outflow: 'จ่ายออก',
  inflow: 'รับเข้า',
  transfer_to_asset: 'โยกเข้าสินทรัพย์',
}

export const BUDGET_FREQUENCY_LABEL: Record<BudgetFrequency, string> = {
  monthly: 'รายเดือน',
  quarterly: 'ราย 3 เดือน',
  semiannual: 'ราย 6 เดือน',
  annual: 'รายปี',
  onetime: 'ครั้งเดียว',
}

// direction ↔ account.type_id ต้องตรงกันเสมอ (บังคับซ้ำที่ DB trigger ด้วย) — ใช้กรองดรอปดาวน์บัญชีในฟอร์ม
export const BUDGET_DIRECTION_ACCOUNT_TYPE: Record<BudgetDirection, 'income' | 'expense' | 'asset'> = {
  outflow: 'expense',
  inflow: 'income',
  transfer_to_asset: 'asset',
}

export const YEAR_CUT_MODE_LABEL: Record<'calendar' | 'full_year', string> = {
  calendar: 'ปีปฏิทิน',
  full_year: 'เต็มปีจากวันปิด',
}

export const MONTH_LABEL_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]
