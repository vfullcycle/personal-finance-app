export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type AssetSubtype = 'cash' | 'bank' | 'investment' | 'other_asset'
export type LiabilitySubtype = 'credit_card' | 'loan'
export type CashflowClass = 'fixed' | 'variable' | 'savings'
export type AssetLiquidity = 'liquid' | 'marketable' | 'illiquid'
export type Term = 'current' | 'long_term'
export type IncomeType = '40(1)' | '40(2)' | '40(3)' | '40(4)' | '40(5)' | '40(6)' | '40(7)' | '40(8)'

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: 'สินทรัพย์',
  liability: 'หนี้สิน',
  equity: 'ทุน',
  income: 'รายได้',
  expense: 'ค่าใช้จ่าย',
}

export const ASSET_SUBTYPE_LABEL: Record<AssetSubtype, string> = {
  cash: 'เงินสด',
  bank: 'ธนาคาร',
  investment: 'เงินลงทุน',
  other_asset: 'สินทรัพย์อื่นๆ',
}

export const LIABILITY_SUBTYPE_LABEL: Record<LiabilitySubtype, string> = {
  credit_card: 'บัตรเครดิต',
  loan: 'เงินกู้',
}

export const CASHFLOW_CLASS_LABEL: Record<CashflowClass, string> = {
  fixed: 'รายจ่ายคงที่',
  variable: 'รายจ่ายแปรผัน',
  savings: 'เพื่อการออม',
}

export const ASSET_LIQUIDITY_LABEL: Record<AssetLiquidity, string> = {
  liquid: 'สภาพคล่องสูง (เงินสด/ใกล้เงินสด)',
  marketable: 'ซื้อขายได้ (หุ้น/กองทุน)',
  illiquid: 'สภาพคล่องต่ำ (บ้าน/PVD)',
}

export const TERM_LABEL: Record<Term, string> = {
  current: 'ระยะสั้น',
  long_term: 'ระยะยาว',
}

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  '40(1)': '40(1) เงินเดือน/ค่าจ้าง',
  '40(2)': '40(2) รับจ้างทำงาน/ฟรีแลนซ์',
  '40(3)': '40(3) ค่าลิขสิทธิ์/กู๊ดวิลล์',
  '40(4)': '40(4) ดอกเบี้ย/เงินปันผล',
  '40(5)': '40(5) ค่าเช่าทรัพย์สิน',
  '40(6)': '40(6) วิชาชีพอิสระ',
  '40(7)': '40(7) รับเหมาก่อสร้าง',
  '40(8)': '40(8) เงินได้อื่นๆ/ธุรกิจ',
}

export const ASSET_SUBTYPE_DEFAULTS: Record<AssetSubtype, { asset_liquidity: AssetLiquidity; is_invested: boolean }> = {
  cash: { asset_liquidity: 'liquid', is_invested: false },
  bank: { asset_liquidity: 'liquid', is_invested: false },
  investment: { asset_liquidity: 'marketable', is_invested: true },
  other_asset: { asset_liquidity: 'illiquid', is_invested: false },
}

export const LIABILITY_SUBTYPE_DEFAULTS: Record<LiabilitySubtype, { term: Term; is_mortgage: boolean }> = {
  credit_card: { term: 'current', is_mortgage: false },
  loan: { term: 'long_term', is_mortgage: false },
}
