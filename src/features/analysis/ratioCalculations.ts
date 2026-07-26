// Personal financial ratio 8 ตัว 3 กลุ่ม ตาม REQUIREMENTS §7 (อิงหลักสูตร Muang Thai Academy)
// balance-sheet ratio ใช้ยอด ณ วันนี้ (fn_account_balances_as_of), flow ratio ใช้ผลรวม 12 เดือนล่าสุด
// (หรือเท่าที่มีข้อมูลจริงถ้าเปิดบัญชีมาไม่ถึง 12 เดือน) — reuse ตัวแปรจาก reportCalculations.ts (C4) ไม่คำนวณซ้ำ
import { buildCashFlowStatement, buildIncomeStatement, type ReportLeg } from '../reports/reportCalculations'
import type { BalanceAsOfRow } from '../reports/useBalancesAsOf'

export type RatioStatus = 'pass' | 'fail' | 'info' | 'na'

export type RatioResult = {
  id: string
  label: string
  formula: string
  value: number | null // สัดส่วนดิบ (0.15 = 15%, 2.3 = 2.3 เท่า) — null = คำนวณไม่ได้ (N/A)
  format: 'percent' | 'multiple'
  benchmarkLabel: string
  status: RatioStatus
  statusLabel: string
}

export type RatioGroup = {
  id: 'liquidity' | 'debt' | 'savings'
  label: string
  ratios: RatioResult[]
}

// ตัวเลขกลาง ใช้ร่วมกันทั้งแท็บ ratio และแท็บ decision tools (กันคำนวณซ้ำ)
export type AnalysisFigures = {
  months: number
  liquidAssets: number
  liquidAndMarketableAssets: number
  investedAssets: number
  currentLiabilities: number
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  totalIncome: number
  monthlyTakeHome: number
  monthlyExpense: number
  netIncome: number
  netCashFlow: number
  monthlyDiscretionaryCashFlow: number
  savingsOutflow: number
  totalDebtService: number
  monthlyDebtService: number
  nonMortgageDebtService: number
}

// ธุรกรรมไหนมี debit leg บนหนี้สิน subtype=loan ให้ debit leg ฝั่ง expense ที่อยู่ธุรกรรมเดียวกัน = ดอกเบี้ยของเงินกู้ก้อนนั้น
// (โครงสร้าง legs ของ "ผ่อนจ่ายหนี้" ถูกบังคับรูปแบบนี้ที่ชั้น UI เสมอ — ไม่จับชื่อบัญชี "ดอกเบี้ยเงินกู้" เพราะแก้ชื่อได้และผู้ใช้เลือกหมวดดอกเบี้ยเองได้)
function calculateDebtService(legs: ReportLeg[]): { totalDebtService: number; nonMortgageDebtService: number } {
  const byTransaction = new Map<string, ReportLeg[]>()
  for (const leg of legs) {
    const list = byTransaction.get(leg.transactionId) ?? []
    list.push(leg)
    byTransaction.set(leg.transactionId, list)
  }

  let totalDebtService = 0
  let nonMortgageDebtService = 0

  for (const txLegs of byTransaction.values()) {
    const loanLegs = txLegs.filter((l) => l.account.type_id === 'liability' && l.account.subtype === 'loan' && l.amount > 0)
    if (loanLegs.length === 0) continue

    const principal = loanLegs.reduce((s, l) => s + l.amount, 0)
    const interest = txLegs.filter((l) => l.account.type_id === 'expense' && l.amount > 0).reduce((s, l) => s + l.amount, 0)
    const isMortgage = loanLegs.some((l) => l.account.is_mortgage)

    totalDebtService += principal + interest
    if (!isMortgage) nonMortgageDebtService += principal + interest
  }

  return { totalDebtService, nonMortgageDebtService }
}

function sumBalance(rows: BalanceAsOfRow[], predicate: (r: BalanceAsOfRow) => boolean): number {
  return rows.filter(predicate).reduce((s, r) => s + r.balance, 0)
}

// จำนวนเดือนของข้อมูลจริงที่ใช้เฉลี่ย "ต่อเดือน" — นับจากธุรกรรมแรกสุดในช่วงที่ดึงมาถึงวันนี้ ปัดขึ้น ครอบ [1, 12]
// กันตัวเลขเฉลี่ยต่อเดือนต่ำเกินจริงสำหรับบัญชีที่เพิ่งเปิดมาไม่ถึงปี
function monthsOfDataAvailable(legs: ReportLeg[], asOf: string): number {
  if (legs.length === 0) return 12
  const earliest = legs.reduce((min, l) => (l.occurredOn < min ? l.occurredOn : min), legs[0].occurredOn)
  const [ey, em] = earliest.split('-').map(Number)
  const [ty, tm] = asOf.split('-').map(Number)
  const months = (ty - ey) * 12 + (tm - em) + 1
  return Math.min(12, Math.max(1, months))
}

export function calculateAnalysisFigures(legs: ReportLeg[], balanceRows: BalanceAsOfRow[], asOf: string): AnalysisFigures {
  const months = monthsOfDataAvailable(legs, asOf)

  const liquidAssets = sumBalance(balanceRows, (r) => r.type_id === 'asset' && r.asset_liquidity === 'liquid')
  const liquidAndMarketableAssets = sumBalance(
    balanceRows,
    (r) => r.type_id === 'asset' && (r.asset_liquidity === 'liquid' || r.asset_liquidity === 'marketable'),
  )
  const investedAssets = sumBalance(balanceRows, (r) => r.type_id === 'asset' && r.is_invested)
  const currentLiabilities = sumBalance(balanceRows, (r) => r.type_id === 'liability' && r.term === 'current')
  const totalAssets = sumBalance(balanceRows, (r) => r.type_id === 'asset')
  const totalLiabilities = sumBalance(balanceRows, (r) => r.type_id === 'liability')

  const incomeStatement = buildIncomeStatement(legs)
  const cashFlow = buildCashFlowStatement(legs)
  const { totalDebtService, nonMortgageDebtService } = calculateDebtService(legs)
  const totalExpense = cashFlow.fixedExpense + cashFlow.variableExpense + cashFlow.uncategorizedExpense

  return {
    months,
    liquidAssets,
    liquidAndMarketableAssets,
    investedAssets,
    currentLiabilities,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    totalIncome: incomeStatement.totalIncome,
    // take-home (รายได้สุทธิ) เฟส 1 = รายได้รวมตามที่บันทึกจริง ยังไม่หักภาษี (Thai PIT อยู่ C6)
    monthlyTakeHome: incomeStatement.totalIncome / months,
    monthlyExpense: totalExpense / months,
    netIncome: incomeStatement.netIncome,
    netCashFlow: cashFlow.netCashFlow,
    monthlyDiscretionaryCashFlow: cashFlow.netCashFlow / months,
    savingsOutflow: cashFlow.savingsOutflow,
    totalDebtService,
    monthlyDebtService: totalDebtService / months,
    nonMortgageDebtService,
  }
}

function ratio(
  id: string,
  label: string,
  formula: string,
  value: number | null,
  format: 'percent' | 'multiple',
  benchmarkLabel: string,
  status: RatioStatus,
  statusLabel: string,
): RatioResult {
  return { id, label, formula, value, format, benchmarkLabel, status, statusLabel }
}

function passFail(
  value: number | null,
  pass: (v: number) => boolean,
  passLabel: string,
  failLabel: string,
  naLabel: string,
): { status: RatioStatus; statusLabel: string } {
  if (value === null) return { status: 'na', statusLabel: naLabel }
  return pass(value) ? { status: 'pass', statusLabel: passLabel } : { status: 'fail', statusLabel: failLabel }
}

export function buildRatioGroups(f: AnalysisFigures): RatioGroup[] {
  const liquidityRatio = f.currentLiabilities > 0 ? f.liquidAssets / f.currentLiabilities : null
  const basicLiquidityRatio = f.monthlyExpense > 0 ? f.liquidAssets / f.monthlyExpense : null
  const liquidToNetWorth = f.netWorth > 0 ? f.liquidAndMarketableAssets / f.netWorth : null
  const debtToAsset = f.totalAssets > 0 ? f.totalLiabilities / f.totalAssets : null
  const dsr = f.totalIncome > 0 ? f.totalDebtService / f.totalIncome : null
  const nonMortgageDsr = f.totalIncome > 0 ? f.nonMortgageDebtService / f.totalIncome : null
  // REQUIREMENTS §7: saving ratio = (รายจ่ายเพื่อการออม + กระแสเงินสดสุทธิ) ÷ รายได้ โดย
  // กระแสเงินสดสุทธิ(ของสูตรนี้) = รายได้ − ค่าใช้จ่าย − รายจ่ายเพื่อการออม = netIncome − savingsOutflow
  // บวกกันแล้ว savingsOutflow หักล้างตัวเองเสมอ เหลือ netIncome ล้วนๆ — ถูกต้องตามนิยาม เพราะ §3.5 ไม่นับ
  // รายจ่ายเพื่อการออมเป็น "ค่าใช้จ่าย" อยู่แล้ว เงินที่ไม่ถูกใช้จ่ายจริง (netIncome) จึงเท่ากับ "เงินออม" ทั้งก้อน
  // ไม่ว่าจะโอนเข้าบัญชีออมจริงหรือค้างเป็นเงินสดเฉยๆ (คนละตัวกับ cashFlow.netCashFlow ของงบกระแสเงินสด C4
  // ที่รวมเงินต้นผ่อนหนี้/เงินกู้ใหม่/ถอนเงินออมด้วย — บั๊กเดิมคือ reuse ตัวนั้นผิดจุด)
  const savingRatio = f.totalIncome > 0 ? f.netIncome / f.totalIncome : null
  const netInvestmentToNetWorth = f.netWorth > 0 ? f.investedAssets / f.netWorth : null

  const liquidityStatus = passFail(liquidityRatio, (v) => v > 1, 'ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์', 'ไม่มีหนี้สินระยะสั้น')
  const basicLiquidityStatus =
    basicLiquidityRatio === null
      ? { status: 'na' as RatioStatus, statusLabel: 'ไม่มีค่าใช้จ่ายในช่วงที่คำนวณ' }
      : basicLiquidityRatio < 3
        ? { status: 'fail' as RatioStatus, statusLabel: 'ต่ำกว่าเกณฑ์' }
        : basicLiquidityRatio > 6
          ? { status: 'info' as RatioStatus, statusLabel: 'สูงกว่าเกณฑ์ (เงินสดเกินความจำเป็นระยะสั้น)' }
          : { status: 'pass' as RatioStatus, statusLabel: 'อยู่ในเกณฑ์' }
  const liquidToNetWorthStatus = passFail(liquidToNetWorth, (v) => v >= 0.15, 'ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์', 'net worth ติดลบหรือเป็นศูนย์')
  const debtToAssetStatus = passFail(debtToAsset, (v) => v <= 0.5, 'ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์', 'ไม่มีสินทรัพย์')
  const dsrStatus = passFail(dsr, (v) => v <= 0.35, 'ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์', 'ไม่มีรายได้ในช่วงที่คำนวณ')
  const nonMortgageDsrStatus = passFail(nonMortgageDsr, (v) => v <= 0.15, 'ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์', 'ไม่มีรายได้ในช่วงที่คำนวณ')
  const savingRatioStatus = passFail(savingRatio, (v) => v >= 0.1, 'ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์', 'ไม่มีรายได้ในช่วงที่คำนวณ')
  const netInvestmentStatus = passFail(netInvestmentToNetWorth, (v) => v >= 0.5, 'ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์', 'net worth ติดลบหรือเป็นศูนย์')

  return [
    {
      id: 'liquidity',
      label: 'กลุ่มสภาพคล่อง',
      ratios: [
        ratio(
          'liquidity_ratio',
          'Liquidity Ratio',
          'สินทรัพย์สภาพคล่อง(แคบ) ÷ หนี้สินระยะสั้น',
          liquidityRatio,
          'multiple',
          '> 1 เท่า',
          liquidityStatus.status,
          liquidityStatus.statusLabel,
        ),
        ratio(
          'basic_liquidity_ratio',
          'Basic Liquidity Ratio',
          'สินทรัพย์สภาพคล่อง(แคบ) ÷ ค่าใช้จ่ายเฉลี่ย/เดือน',
          basicLiquidityRatio,
          'multiple',
          '3–6 เท่า',
          basicLiquidityStatus.status,
          basicLiquidityStatus.statusLabel,
        ),
        ratio(
          'liquid_assets_to_net_worth',
          'Liquid Assets to Net Worth',
          'สินทรัพย์สภาพคล่อง(กว้าง) ÷ net worth',
          liquidToNetWorth,
          'percent',
          '≥ 15%',
          liquidToNetWorthStatus.status,
          liquidToNetWorthStatus.statusLabel,
        ),
      ],
    },
    {
      id: 'debt',
      label: 'กลุ่มหนี้สิน',
      ratios: [
        ratio(
          'debt_to_asset',
          'Debt to Asset',
          'หนี้สินรวม ÷ สินทรัพย์รวม',
          debtToAsset,
          'percent',
          '≤ 50%',
          debtToAssetStatus.status,
          debtToAssetStatus.statusLabel,
        ),
        ratio(
          'dsr',
          'Debt Servicing Ratio (DSR)',
          'เงินผ่อนหนี้รวม ÷ รายได้สุทธิ (take-home)',
          dsr,
          'percent',
          '≤ 35%',
          dsrStatus.status,
          dsrStatus.statusLabel,
        ),
        ratio(
          'non_mortgage_dsr',
          'Non-Mortgage DSR',
          'เงินผ่อนหนี้ที่ไม่ใช่จำนอง ÷ take-home',
          nonMortgageDsr,
          'percent',
          '≤ 15%',
          nonMortgageDsrStatus.status,
          nonMortgageDsrStatus.statusLabel,
        ),
      ],
    },
    {
      id: 'savings',
      label: 'กลุ่มการออม',
      ratios: [
        ratio(
          'saving_ratio',
          'Saving Ratio',
          '(รายจ่ายเพื่อการออม + กระแสเงินสดสุทธิ) ÷ รายได้รวม',
          savingRatio,
          'percent',
          '≥ 10%',
          savingRatioStatus.status,
          savingRatioStatus.statusLabel,
        ),
        ratio(
          'net_investment_to_net_worth',
          'Net Investment to Net Worth',
          'สินทรัพย์ลงทุน ÷ net worth',
          netInvestmentToNetWorth,
          'percent',
          '≥ 50%',
          netInvestmentStatus.status,
          netInvestmentStatus.statusLabel,
        ),
      ],
    },
  ]
}
