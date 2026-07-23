// คำนวณงบรายได้-ค่าใช้จ่าย + กระแสเงินสด จาก transaction_legs ดิบในช่วงเวลาที่เลือก
// amount เป็นสตางค์ signed (+เดบิต/-เครดิต) ตาม REQUIREMENTS §3.3 — ต้องแปลความหมายตาม type_id ไม่ใช่ดูเครื่องหมายตรงๆ
export type ReportLeg = {
  amount: number
  transactionId: string
  occurredOn: string
  account: {
    id: string
    name: string
    type_id: string
    subtype: string | null
    cashflow_class: string | null
    is_mortgage: boolean
  }
}

export type CategoryRow = {
  accountId: string
  name: string
  amount: number
}

export type IncomeStatement = {
  incomeRows: CategoryRow[]
  expenseRows: CategoryRow[]
  totalIncome: number
  totalExpense: number
  netIncome: number
}

function sortByAmountDesc(rows: CategoryRow[]) {
  return [...rows].sort((a, b) => b.amount - a.amount)
}

export function buildIncomeStatement(legs: ReportLeg[]): IncomeStatement {
  const incomeMap = new Map<string, CategoryRow>()
  const expenseMap = new Map<string, CategoryRow>()

  for (const leg of legs) {
    if (leg.account.type_id === 'income') {
      const row = incomeMap.get(leg.account.id) ?? { accountId: leg.account.id, name: leg.account.name, amount: 0 }
      row.amount += -leg.amount // credit leg (ลบ) = รายได้เพิ่ม
      incomeMap.set(leg.account.id, row)
    } else if (leg.account.type_id === 'expense') {
      const row = expenseMap.get(leg.account.id) ?? { accountId: leg.account.id, name: leg.account.name, amount: 0 }
      row.amount += leg.amount // debit leg (บวก) = ค่าใช้จ่ายเพิ่ม — ดอกเบี้ยเงินกู้ปนมาด้วยอัตโนมัติ, เงินต้นไม่ปนเพราะติด account liability
      expenseMap.set(leg.account.id, row)
    }
  }

  const incomeRows = sortByAmountDesc([...incomeMap.values()])
  const expenseRows = sortByAmountDesc([...expenseMap.values()])
  const totalIncome = incomeRows.reduce((sum, r) => sum + r.amount, 0)
  const totalExpense = expenseRows.reduce((sum, r) => sum + r.amount, 0)

  return { incomeRows, expenseRows, totalIncome, totalExpense, netIncome: totalIncome - totalExpense }
}

export type CashFlowStatement = {
  totalIncome: number
  fixedExpense: number
  variableExpense: number
  uncategorizedExpense: number
  savingsOutflow: number
  principalRepayment: number
  netIncome: number
  netCashFlow: number
  /** ส่วนต่างงบรายได้ๆ vs กระแสเงินสด = เงินออม + เงินต้นผ่อนหนี้ (net worth คงที่แต่เงินสดไหลออกจริง) */
  diffFromNetIncome: number
}

export function buildCashFlowStatement(legs: ReportLeg[]): CashFlowStatement {
  let totalIncome = 0
  let fixedExpense = 0
  let variableExpense = 0
  let uncategorizedExpense = 0
  let savingsOutflow = 0
  let principalRepayment = 0

  for (const leg of legs) {
    const { type_id, subtype, cashflow_class } = leg.account
    if (type_id === 'income') {
      totalIncome += -leg.amount
    } else if (type_id === 'expense') {
      if (cashflow_class === 'fixed') fixedExpense += leg.amount
      else if (cashflow_class === 'variable') variableExpense += leg.amount
      else uncategorizedExpense += leg.amount
    } else if (type_id === 'asset' && cashflow_class === 'savings' && leg.amount > 0) {
      savingsOutflow += leg.amount // โอนเข้าถังออม/ลงทุน — ไม่ใช่ expense แต่เป็นเงินสดไหลออกจริง (§3.5)
    } else if (type_id === 'liability' && subtype === 'loan' && leg.amount > 0) {
      principalRepayment += leg.amount // เงินต้นลดหนี้ — ไม่ใช่ expense แต่เป็นเงินสดไหลออกจริง
    }
  }

  const totalExpense = fixedExpense + variableExpense + uncategorizedExpense
  const netIncome = totalIncome - totalExpense
  const netCashFlow = netIncome - savingsOutflow - principalRepayment

  return {
    totalIncome,
    fixedExpense,
    variableExpense,
    uncategorizedExpense,
    savingsOutflow,
    principalRepayment,
    netIncome,
    netCashFlow,
    diffFromNetIncome: netIncome - netCashFlow,
  }
}

export type BalanceSheetAccountRow = {
  accountId: string
  name: string
  subtype: string | null
  balance: number
}

export type BalanceSheet = {
  assets: BalanceSheetAccountRow[]
  liabilities: BalanceSheetAccountRow[]
  equity: BalanceSheetAccountRow[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  netWorth: number
}

export function buildBalanceSheet(
  rows: { account_id: string; name: string; type_id: string; subtype: string | null; balance: number }[],
): BalanceSheet {
  const toRow = (r: (typeof rows)[number]): BalanceSheetAccountRow => ({
    accountId: r.account_id,
    name: r.name,
    subtype: r.subtype,
    balance: r.balance,
  })
  const byBalanceDesc = (a: BalanceSheetAccountRow, b: BalanceSheetAccountRow) => b.balance - a.balance

  const assets = rows.filter((r) => r.type_id === 'asset').map(toRow).sort(byBalanceDesc)
  const liabilities = rows.filter((r) => r.type_id === 'liability').map(toRow).sort(byBalanceDesc)
  const equity = rows.filter((r) => r.type_id === 'equity').map(toRow).sort(byBalanceDesc)

  const sum = (list: BalanceSheetAccountRow[]) => list.reduce((s, r) => s + r.balance, 0)
  const totalAssets = sum(assets)
  const totalLiabilities = sum(liabilities)
  const totalEquity = sum(equity)

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, netWorth: totalAssets - totalLiabilities }
}
