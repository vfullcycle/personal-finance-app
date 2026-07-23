# SPEC — Reports (C4)

> Frozen: 23 ก.ค. 2569 — อ้างอิง `REQUIREMENTS.md` v1.4 §3.4, §3.5, §4 M5
> พึ่งพา C1 (`SPEC-foundation.md`), C2 (`SPEC-auth-coa-accounts.md`), C3 (`SPEC-transactions-recurring.md`)

## ขอบเขต
หน้า `/reports` — งบรายได้-ค่าใช้จ่าย, งบกระแสเงินสด, งบดุล, กราฟ net worth ย้อนหลัง + เทียบช่วงเวลา (MoM/YoY/ปีก่อนหน้า) ทุกงบ ตาม REQUIREMENTS §4 M5

## Data layer ใหม่ (migration additive)

งบรายได้ๆ/กระแสเงินสด ดึง `transaction_legs` join `accounts`/`transactions.occurred_on` ตรงๆ ฝั่ง client (แบบเดียวกับ `useTransactions` ใน C3) ไม่ต้องมี view ใหม่ — แต่งบดุล/net worth trend ต้องการยอด ณ วันที่ในอดีต ซึ่ง `v_account_balances`/`v_balance_sheet` เดิม (C1) คำนวณ**ปัจจุบันเท่านั้น** จึงเพิ่ม 2 function (`20260723110001_reports_history.sql`, ไม่ใช้ security definer ให้ RLS ของตารางต้นทางมีผลผ่านอัตโนมัติเหมือน view เดิม):

| Function | คืนค่า | ใช้ที่ |
|---|---|---|
| `fn_account_balances_as_of(as_of date)` | `(account_id, user_id, name, type_id, subtype, balance)` ต่อบัญชี | งบดุล (ปัจจุบัน = เรียกด้วยวันนี้, เทียบช่วง = เรียกด้วยวันสิ้นสุดช่วงก่อนหน้า) |
| `fn_net_worth_history(month_count int default 12)` | `(as_of, total_assets, total_liabilities, net_worth)` ต่อสิ้นเดือนย้อนหลัง | กราฟแนวโน้ม net worth |

**ส่วนขยายที่ตกลงเพิ่มระหว่างแชต:** เพิ่ม subtype `receivable` (ลูกหนี้ — เงินให้ยืม/รอเบิกคืน) แยกจาก `other_asset` (migration `20260723110000_receivable_subtype.sql`, widen `chk_accounts_subtype`) พร้อม label + default (`asset_liquidity=illiquid`) ใน `constants.ts` — REQUIREMENTS bump เป็น v1.4 §3.2

## ตรรกะคำนวณ (`src/features/reports/reportCalculations.ts`)

**งบรายได้-ค่าใช้จ่าย** (`buildIncomeStatement`) — group legs ตาม account: รายได้ = `-sum(amount)` ต่อบัญชี income, ค่าใช้จ่าย = `sum(amount)` ต่อบัญชี expense สุทธิ = รายได้ − ค่าใช้จ่าย ดอกเบี้ยเงินกู้ปนเข้ามาอัตโนมัติ (leg ติด expense อยู่แล้วจาก C3) เงินต้นไม่ปน (ติด liability)

**งบกระแสเงินสด** (`buildCashFlowStatement`) — จาก legs ชุดเดียวกัน แยก 6 บรรทัด: รายรับ / รายจ่ายคงที่ / รายจ่ายแปรผัน / รายจ่ายไม่ระบุถัง (`cashflow_class is null`) / เงินออม-ลงทุน (debit leg บน asset ที่ `cashflow_class=savings`) / เงินต้นผ่อนหนี้ (debit leg บน liability ที่ `subtype=loan`) กระแสเงินสดสุทธิ = รายรับ − ทุกบรรทัดหัก มี callout เทียบกับรายได้สุทธิให้เห็นส่วนต่างชัด (ตรง REQUIREMENTS ข้อ 2)

**งบดุล** (`buildBalanceSheet`) — จาก `fn_account_balances_as_of`, group by `type_id` แล้ว UI group ย่อยตาม `subtype` (ลำดับเดียวกับ `/accounts`) รวม assets/liabilities/equity (ซ่อน section ถ้าไม่มียอด — ระบบยังไม่มี flow ไหน post เข้า `equity` type ได้ ตั้งใจ ดูหัวข้อ "หมายเหตุสำคัญ" ด้านล่าง)

**Reconciliation ระหว่าง 3 งบ** (ตอบคำถามวีระหว่าง UAT):
- Δ net worth (งบดุล 2 จุดเวลา) = รายได้สุทธิ (งบรายได้ๆ) ของช่วงเดียวกันเสมอ เพราะเงินออม/เงินต้นผ่อนหนี้ไม่กระทบ net worth (ลด/ย้ายสินทรัพย์เท่ากับลดหนี้/ย้ายสินทรัพย์เท่านั้น)
- กระแสเงินสดสุทธิ ≠ Δ net worth เพราะหักเงินออม+เงินต้นเพิ่ม (เงินสดไหลออกจริงแต่ net worth คงที่)
- ยังไม่มีหน้าจอเช็ค tie ระหว่าง 2 ตัวเลขนี้ตรงๆ (แค่ callout ในกระแสเงินสด) — backlog ถ้าต้องการ

## Period comparison (`period.ts`, `PeriodPicker.tsx`)

`PeriodType` (เดือน/ปี) + `CompareMode` (ไม่เทียบ/เดือนก่อนหน้า MoM/เดือนเดียวกันปีก่อน YoY สำหรับรายเดือน, ปีก่อนหน้าอย่างเดียวสำหรับรายปี) ใช้ร่วมกัน 3 แท็บแรก (รายได้ๆ/กระแสเงินสด/งบดุล) กราฟ net worth มี range selector แยก (6/12/24/ทั้งหมดเดือน) ไม่ผูกกับ PeriodPicker

`DeltaChip.tsx` — ทิศทาง "ดี/แย่" กำหนดตามประเภทบรรทัด (`goodDirection` prop) ไม่ auto ตามเครื่องหมาย: รายได้/net worth เพิ่ม=เขียว, รายจ่ายเพิ่ม=แดง ฐานเทียบ=0 → โชว์ป้าย "ใหม่" แทน %

## Net worth chart (`NetWorthChart.tsx`)

Recharts `AreaChart` เส้นเดียว (net worth) — single series ไม่ต้องมี legend ตาม dataviz convention สีจากโทเค็น CSS ของแอป (`var(--brand)`) ไม่ hardcode hex เพื่อรองรับ dark mode อัตโนมัติ มี custom tooltip + range selector

## หน้าจอ

`/reports` (nav ใหม่ "📊 รายงาน") — การ์ดสรุปด่วนบนสุด (net worth ปัจจุบัน / กระแสเงินสดสุทธิเดือนนี้ / กำไรสุทธิเดือนนี้ คำนวณอิสระจากแท็บที่เลือก) + แท็บ 4 อัน ตาม `.tabs`/`.card`/`.item-row` component เดิมของแอป Mobile: แถวรายงาน stack (ชื่อ+ยอด+% เปลี่ยนแปลง), Desktop (`≥620px`): แถวเดียวคอลัมน์เดียวกัน — ไม่ต้องทำ horizontal-scroll เพราะแถวไม่กว้างมาก

## หมายเหตุสำคัญที่ฟีเจอร์ถัดไปต้องรู้

- **Equity ติด 0 เสมอโดยดีไซน์** — ไม่มี flow ใน §3.4 (เงินเข้า/เงินออก/โอน) ที่ post เข้าบัญชี `equity` ได้ (ตัวเลือกปลายทาง/ต้นทางของปุ่มโอนดึงเฉพาะ `asset`/`liability`) `Net worth = สินทรัพย์ − หนี้สิน` จับ "ส่วนของเจ้าของ" ให้อัตโนมัติผ่านสมการอยู่แล้ว **ตราบใดที่ผู้ใช้บันทึกสินทรัพย์คู่กับหนี้สินที่เกี่ยวข้องให้ครบ** (เช่น กู้ซื้อบ้านต้องสร้างบัญชี "บ้าน" เป็นสินทรัพย์คู่กับ "สินเชื่อบ้าน" เป็นหนี้สิน ไม่งั้น net worth จะติดลบเกินจริง) — เจอเคสนี้จริงตอน UAT กับบัญชี test (ลืมสร้างบัญชี "บ้าน" คู่กับสินเชื่อบ้าน ทำให้ net worth ติดลบ 1.4M ทั้งที่ควรเป็นบวก 558,624 พอเพิ่มบัญชีบ้านแล้วตัวเลขกลับมาถูกต้อง)
- `fn_account_balances_as_of`/`fn_net_worth_history` นับรวมบัญชีที่ archive แล้วด้วยเสมอ (ไม่กรอง `is_active`) — ตรงตาม invariant "ยอดคงเหลือ...เป็น view คำนวณสด" ของ C1 (ยอดจริงยังอยู่ไม่ว่าจะซ่อนจาก `/accounts` หรือไม่) ทดสอบยืนยันแล้วกับบัญชีที่ archive ระหว่าง UAT
- credit card (subtype `credit_card`) ไม่ถูกนับเป็น "เงินต้นผ่อนหนี้" ในกระแสเงินสด (เช็คเฉพาะ `subtype='loan'`) — การจ่ายบิลบัตรเป็นแค่ transfer ธรรมดา เพราะรายจ่ายถูกนับเป็น expense ไปแล้วตอนรูดบัตร ไม่ใช่ตอนจ่ายบิล
- ratio ใน REQUIREMENTS §7 (Liquidity, DSR, Saving Ratio ฯลฯ) ใช้ตัวแปรชุดเดียวกับที่ export จาก `reportCalculations.ts` นี้ (เช่น เงินออม/เงินต้นผ่อนหนี้/กระแสเงินสดสุทธิ) — C5 เรียกใช้ต่อได้เลยไม่ต้องคำนวณซ้ำ

## Routes
เพิ่ม `/reports` ใน `AppShell` (nav item ใหม่ "📊 รายงาน" ต่อจาก "ประจำ")

## Non-goals ของ C4
- Personal financial ratios + decision tools (M8) — C5
- ปุ่ม/หน้าจอเช็ค reconciliation ระหว่าง 3 งบโดยตรง — backlog ถ้าต้องการ
- Export/print งบ — M6 (เฟส 3)
- Automated test suite — ทดสอบด้วย live browser (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase admin API สำหรับรอบตรวจสอบอัตโนมัติ, แยกจากบัญชี `test` ถาวรที่สร้างให้วี UAT ด้วยมือ)
