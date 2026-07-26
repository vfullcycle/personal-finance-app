# SPEC — Analysis: ratios + decision tools + savings goals (C5)

> Frozen: 24 ก.ค. 2569 — อ้างอิง `REQUIREMENTS.md` v1.4 §7, M8
> พึ่งพา C1 (`SPEC-foundation.md`), C2 (`SPEC-auth-coa-accounts.md`), C3 (`SPEC-transactions-recurring.md`), C4 (`SPEC-reports.md`)

## ขอบเขต
หน้า `/analysis` — ratio ทางการ 8 ตัว 3 กลุ่ม (สภาพคล่อง/หนี้สิน/การออม) เทียบเกณฑ์มาตรฐาน §7, decision tools (ความสามารถซื้อของชิ้นใหญ่ + debt headroom), เป้าหมายการออม (ตั้ง+ติดตามความคืบหน้า) ตาม REQUIREMENTS §4 M8

## Data layer

| อะไร | เนื้อหา |
|---|---|
| `fn_account_balances_as_of` (migration `20260724000000`, drop+recreate) | เพิ่ม 4 คอลัมน์ที่เดิม (C4) ไม่ได้คืน: `asset_liquidity`, `is_invested`, `term`, `is_mortgage` — ต้องใช้ป้อน ratio กลุ่มสภาพคล่อง/หนี้สิน/ออม |
| `useReportLegs`/`ReportLeg` (`src/features/reports/`) | เพิ่ม `transactionId` + `occurredOn` ต่อ leg และ `is_mortgage` บน `account` — ใช้คำนวณเงินผ่อนหนี้รวม (ดูหัวข้อถัดไป) และหาช่วงข้อมูลจริงที่มี |
| ตาราง `savings_goals` (ใหม่) | `id, user_id, account_id → accounts(restrict), name, target_amount, target_date, created_at, updated_at` + RLS ต่อ user + trigger บังคับ `account_id` เป็นของ user เดียวกันและต้องเป็น `type_id=asset` เท่านั้น ลบได้ตรงๆ (ไม่ archive เพราะไม่ใช่ ledger record) |

### เงินผ่อนหนี้รวม (เงินต้น+ดอกเบี้ย) — ไม่จับชื่อบัญชี
ธุรกรรม "ผ่อนจ่ายหนี้" ตาม SPEC-transactions-recurring ถูกบังคับโครงสร้างที่ชั้น UI เสมอ (debit หนี้สิน `subtype=loan` + debit ค่าใช้จ่ายดอกเบี้ย ถ้ามี + credit บัญชีต้นทาง อยู่ธุรกรรมเดียวกัน) `calculateDebtService` (`src/features/analysis/ratioCalculations.ts`) group legs ตาม `transactionId`: ธุรกรรมไหนมี debit leg บนหนี้สิน `subtype=loan` ให้ debit leg ฝั่ง `expense` ที่อยู่ธุรกรรมเดียวกันทั้งหมด = ดอกเบี้ยของก้อนนั้น แยก mortgage/non-mortgage ด้วย `is_mortgage` บนบัญชีหนี้สิน — **ไม่ใช้การจับคู่ชื่อบัญชี** "ดอกเบี้ยเงินกู้" เพราะฟอร์มผ่อนหนี้ให้ผู้ใช้เลือกหมวดดอกเบี้ยเป็นหมวดใดก็ได้ (`TransactionFormDialog.tsx`) และชื่อบัญชีแก้ไขได้

## Ratio 8 ตัว (`ratioCalculations.ts`)

`calculateAnalysisFigures(legs, balanceRows, asOf)` คำนวณตัวเลขกลาง (`AnalysisFigures`) ใช้ร่วมกันทั้งแท็บ ratio และ decision tools — reuse `buildIncomeStatement`/`buildCashFlowStatement` จาก C4 ไม่คำนวณซ้ำ

**ช่วงเวลา:** balance-sheet ratio ใช้ยอด ณ วันนี้ (`fn_account_balances_as_of`) flow ratio ใช้ผลรวม 12 เดือนล่าสุด (`from = addMonths(today, -12)` ถึงวันนี้) `monthsOfDataAvailable()` นับจากธุรกรรมแรกสุดที่ดึงมาได้จริงถึงวันนี้ ครอบ [1, 12] — กันตัวเลขเฉลี่ย/เดือนต่ำเกินจริงสำหรับบัญชีที่เพิ่งเปิดมาไม่ถึงปี

`buildRatioGroups(figures)` คืน 3 กลุ่มตามตาราง REQUIREMENTS §7 พร้อมสถานะ:
- `pass` / `fail` — ตามเกณฑ์ตรงตัว
- `na` — ตัวหารเป็น 0 หรือ net worth ≤ 0 (เช่น "ไม่มีหนี้สินระยะสั้น" สำหรับ Liquidity Ratio)
- `info` (เฉพาะ Basic Liquidity Ratio ที่ >6 เท่า) — เงินสดเกินความจำเป็นระยะสั้น ไม่ถือเป็นความเสี่ยงแบบเดียวกับต่ำกว่าเกณฑ์ จึงไม่ขึ้นเป็นสีแดงเหมือน fail

รายได้สุทธิ (take-home) เฟส 1 = `totalIncome` ตรงจากงบรายได้ๆ ยังไม่หักภาษี (Thai PIT อยู่ C6) — DSR/Non-Mortgage DSR จะดูดีกว่าความจริงเล็กน้อยจนกว่า C6 เสร็จ มีข้อความกำกับใต้ตารางในหน้าจอ

**Saving Ratio (v1.1 fix):** ตาม REQUIREMENTS §7 นิยาม `saving ratio = (รายจ่ายเพื่อการออม + กระแสเงินสดสุทธิ) ÷ รายได้` โดย "กระแสเงินสดสุทธิ" ของสูตรนี้คือ `รายได้ − ค่าใช้จ่าย − รายจ่ายเพื่อการออม` (ไม่ใช่ `cashFlow.netCashFlow` ของงบกระแสเงินสด C4 ที่รวมเงินต้นผ่อนหนี้/เงินกู้ใหม่/ถอนเงินออมด้วย) v1.0 reuse `netCashFlow` ตัวหลังผิดจุด ทำให้ตัวเลขดันไปนับเงินกู้ใหม่/เงินถอนออมเป็น "เงินออม" ได้ (เคยเห็น Saving Ratio 184.8% ซึ่งเป็นไปไม่ได้ทางคณิตศาสตร์) — เมื่อกางสมการนิยามที่ถูกต้องออกมาจะเห็นว่า "รายจ่ายเพื่อการออม" หักล้างตัวเองพอดีเสมอ เหลือ `saving ratio = netIncome ÷ totalIncome` ตรงๆ (สมเหตุสมผลเพราะ §3.5 ไม่นับรายจ่ายเพื่อการออมเป็น "ค่าใช้จ่าย" อยู่แล้ว เงินที่ไม่ถูกใช้จ่ายจริงจึงเท่ากับเงินออมทั้งก้อนไม่ว่าจะโอนเข้าบัญชีออมจริงหรือค้างเป็นเงินสด)

## Decision tools (`decisionTools.ts`)

- `calculateBigPurchaseAffordability` — สภาพคล่องส่วนเกิน = max(0, สินทรัพย์สภาพคล่อง(แคบ) − เป้าสำรองฉุกเฉิน) เป้าสำรองฉุกเฉิน = ค่าใช้จ่ายเฉลี่ย/เดือน × จำนวนเดือนที่กรอก (default 6 แก้ได้) ถ้าสภาพคล่องส่วนเกิน ≥ ราคา → ซื้อได้เลย ไม่งั้นหารด้วย discretionary cash flow/เดือน (= netCashFlow เฉลี่ย 12 เดือน) ได้จำนวนเดือนที่ต้องเก็บเพิ่ม (null ถ้า cash flow ไม่เป็นบวก) ใช้ได้ทั้งของทั่วไปและเงินดาวน์ที่อยู่อาศัย ไม่แยกเครื่องมือ
- `calculateDebtHeadroom` + `calculateMaxLoanPrincipal` — headroom/เดือน = 35%×take-home/เดือน − เงินผ่อนหนี้ปัจจุบัน/เดือน ถ้า ≤0 แจ้ง "DSR เต็มเพดาน" ไม่ให้กรอกต่อ ถ้า >0 กรอกดอกเบี้ย%/ปี+ระยะเวลา(ปี) → ย้อนเป็นวงเงินกู้สูงสุดด้วยสูตร annuity มาตรฐาน (แนวทางเดียวกับ `loanAmortization.ts` แต่แก้สมการกลับด้าน หาเงินต้นจาก payment แทน)

## Savings goals

ผูกกับบัญชีสินทรัพย์ที่มีอยู่จริง (asset ใดก็ได้ ไม่บังคับเฉพาะ `cashflow_class=savings`) ไม่เก็บ "ออมแล้วเท่าไหร่" แยก — ความคืบหน้าอ่านจากยอดคงเหลือปัจจุบันของบัญชีนั้นตรงๆ (`v_account_balances`) กันข้อมูลสองชุดไม่ตรงกัน ถ้ามี `target_date` แสดงเดือนที่เหลือ + ยอดที่ต้องออมเพิ่ม/เดือนให้ทันเป้า (`remaining / monthsLeft` ปัดขึ้น)

## หน้าจอ

`/analysis` (nav ใหม่ "📈 วิเคราะห์" ต่อจาก "รายงาน") 3 แท็บ: **อัตราส่วนการเงิน** / **เครื่องมือช่วยตัดสินใจ** / **เป้าหมายการออม** ใช้ `.tabs`/`.card`/`.report-row`/`.badge` component เดิมจาก C4 เพิ่ม CSS ใหม่ 2 อย่าง: `.badge-bad` (สีแดง, ใช้คู่กับ `.badge` เดิมที่เป็นสีเขียวอยู่แล้วสำหรับ pass/`.badge-muted` เดิมสำหรับ na/info) และ `.goal-progress-track`/`.goal-progress-fill` (progress bar เป้าหมายออม)

## ทดสอบ

Live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase — สร้างผ่าน Admin API, ลบผ่าน SQL โดยตรงเพราะ Admin API `deleteUser` คืน 500 ชั่วคราวตอนทดสอบ ไม่กระทบ flow ปกติของแอปที่ไม่ได้ใช้ endpoint นี้) ยืนยันด้วยข้อมูลจำลอง 12 เดือน (เงินเดือน, ค่าใช้จ่ายคงที่/แปรผันครบ, โอนเข้าถังออม 2 บัญชี, ผ่อนหนี้ 2 ก้อน — เงินกู้บ้าน `is_mortgage=true` + เงินกู้รถ `is_mortgage=false`) เทียบตัวเลขที่หน้าจอแสดงกับคำนวณมือ ตรงทุกตัว (ครอบคลุมทั้ง 3 สถานะ pass/fail/na) รวมถึง decision tools 2 ตัวและ savings goal CRUD (สร้าง/แก้ไข/ลบ) ทั้ง desktop (1280px) และ mobile (390px)

## Non-goals ของ C5
- ปรับช่วงเวลาคำนวณ ratio เอง (fix ที่ 12 เดือนล่าสุดเสมอใน v1)
- Thai PIT (M11) — take-home ยังไม่หักภาษีแม่นยำจนกว่า C6 เสร็จ
- Budget/projection (M7) — C7
