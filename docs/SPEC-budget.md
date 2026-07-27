# SPEC — Budget: ชั้น A (งบประจำ) + ชั้น B (แผนกำหนดการ) (C7 ช่วง 1)

> Frozen: 27 ก.ค. 2569 — อ้างอิง `REQUIREMENTS.md` v1.4 §5.1, M7
> พึ่งพา C2 (`SPEC-auth-coa-accounts.md`), C3 (`SPEC-transactions-recurring.md`), C5 (`SPEC-analysis.md`), C6 (`SPEC-tax.md`)
> C7 แบ่งเป็น 4 ช่วงย่อย ทยอย freeze/UAT — เอกสารนี้ครอบคลุมเฉพาะช่วง 1 (โครงสร้าง budget 2 ชั้น)
> ช่วงถัดไป (projection / variance / import-export) จะเพิ่มเข้าเอกสารนี้เมื่อ freeze แต่ละช่วง

## ขอบเขตช่วง 1
1. M7 (บางส่วน): โครงสร้าง budget 2 ชั้น — ชั้น A งบประจำ (baseline) + ชั้น B แผนกำหนดการ (schedule/CF matrix) พร้อม CRUD UI
2. จัดที่ทาง nav ใหม่เพื่อเปิดที่ให้ "งบประมาณ" ใน bottom nav (ตกลงระหว่างแชต)
3. แก้บั๊ก take-home ที่ค้างมาตั้งแต่ C5/C6 — `ratioCalculations.ts` ยังใช้รายได้ก่อนหักภาษีจริง

## Schema (migration `20260726120000_budget_baseline_schedule.sql`, additive)

### `budget_baseline_items` (ชั้น A — งบประจำ)
รายการสม่ำเสมอ **ไม่มีปีเริ่ม-จบ** (ใช้ตลอดช่วง projection ทั้งหมด) ขับด้วยจำนวน/เดือนหรือ/ปี + growth%/ปี

| field | ค่า |
|---|---|
| `account_id` | FK `accounts` — จำกัดเฉพาะ income / expense / asset ที่ `cashflow_class='savings'` (บังคับด้วย trigger `enforce_budget_baseline_account_consistency`) — หนี้ที่มีกำหนดระยะเวลาไปอยู่ชั้น B แทน |
| `amount_per_period_satang` | จำนวนต่องวด |
| `period` | `month` \| `year` |
| `growth_percent_per_year` | default 0 |
| `is_active` | เปิด/ปิดโดยไม่ต้องลบ |

ทิศทาง (รับเข้า/จ่ายออก/โยกเข้าสินทรัพย์) **ไม่เก็บเป็น field แยก** — derive จาก `account.type_id` ตอนคำนวณ/แสดงผล (income→รับเข้า, expense→จ่ายออก, asset savings→โยกเข้าสินทรัพย์) เพราะเลือกหมวดแล้วไม่กำกวม ต่างจากชั้น B ที่เก็บ direction จริง (ดูด้านล่าง)

### `budget_schedule_items` (ชั้น B — แผนกำหนดการ)
รายการผูกช่วงปีเฉพาะ (พ.ศ.) ตรงตาม REQUIREMENTS §5.1 ทุก field

| field | ค่า |
|---|---|
| `name` | ชื่อรายการ (free text) |
| `account_id` | FK `accounts` |
| `direction` | `outflow` (จ่ายออก) \| `inflow` (รับเข้า) \| `transfer_to_asset` (โยกเข้าสินทรัพย์) — เก็บเป็น field จริง (ต่างจากชั้น A) เพื่อ UX: เลือกทิศทางก่อน (ปุ่มใหญ่ 3 ปุ่ม) แล้วกรองดรอปดาวน์บัญชีให้ตรง type |
| `frequency` | `monthly`\|`quarterly`\|`semiannual`\|`annual`\|`onetime` (5 แบบ — เพิ่ม "ครั้งเดียว" จาก 4 แบบของ recurring transactions เดิม เพราะ budget วางแผนรายการที่เกิดครั้งเดียวได้) |
| `year_start` / `year_end` | พ.ศ. — `onetime` บังคับให้เท่ากัน (constraint `chk_budget_schedule_onetime_single_year`) |
| `amount_per_occurrence_satang` | ต่อครั้ง (ไม่ใช่ยอดรวม) |
| `growth_percent_per_year` | default 0 |
| `start_month` | 1-12, optional, default = เดือนปัจจุบันตอนสร้างรายการในฟอร์ม (ไม่ใช่ค่า global) — ใช้ระบุว่างวดตกเดือนไหนตอนแสดงจอรายเดือน (ช่วง 2) |

Trigger `enforce_budget_schedule_account_consistency` บังคับ `direction` ↔ `account.type_id` ตรงกันเสมอที่ชั้น DB (outflow→expense, inflow→income, transfer_to_asset→asset) ไม่ใช่แค่กรองฝั่ง UI

**หนี้ที่ตั้งค่าเงินกู้ครบแล้ว (`loanAmortization.ts`, C3)** ไม่มีตัวเลือกในฟอร์มชั้น B เลย (ไม่มี liability ในดรอปดาวน์ทุก direction) — ตั้งใจเว้นไว้ให้ projection (ช่วง 2) ดึง amortization schedule มาใช้อัตโนมัติ กันกรอกซ้ำซ้อนและกันตัวเลขสองชุดไม่ตรงกัน

RLS ทั้ง 2 ตาราง: per `user_id` แบบเดียวกับ `savings_goals` (C5)

## UX

หน้า `/budget` (nav ใหม่ "งบประมาณ" 🎯) 2 แท็บ: **งบประจำ** (ชั้น A) / **แผนกำหนดการ** (ชั้น B) — แท็บ "คาดการณ์"/"เทียบงบ" จะเพิ่มเมื่อ freeze ช่วง 2/3

- ชั้น A: list การ์ด (`.report-row`) + ปุ่ม "+ เพิ่มรายการ" → dialog เลือกหมวดจาก dropdown จัดกลุ่ม (optgroup) รายรับ/รายจ่าย/เงินออม-ลงทุน, จำนวนเงิน, ความถี่ (ต่อเดือน/ต่อปี), growth% ซ่อนใต้ "ตัวเลือกเพิ่มเติม" (progressive disclosure)
- ชั้น B: list การ์ด + dialog — เลือก**ทิศทาง**ก่อน (ปุ่มใหญ่ 3 ปุ่มแบบเดียวกับเงินเข้า/ออก/โอนของ M3) แล้วดรอปดาวน์บัญชีกรองให้ตรง type อัตโนมัติ (เปลี่ยนทิศทางแล้วบัญชีเดิมไม่ตรง type จะถูกเคลียร์ทิ้ง), ปีเริ่ม-จบ (ล็อกให้เท่ากันถ้าเลือก "ครั้งเดียว"), ความถี่ (dropdown ชื่อ ไม่ให้กรอกเลข), เดือนเริ่มงวดซ่อนใต้ "ตัวเลือกเพิ่มเติม"

## จัดที่ทาง nav (ตกลงเพิ่มระหว่างแชต)
Bottom nav มือถือคงไว้ที่ 6 รายการตามที่ตกลงไว้ตั้งแต่ Tags v1.0 — ย้าย "ประจำ" ออกจาก nav หลัก ไปเป็นปุ่ม "รายการประจำ →" มุมขวาบนของหน้า `/transactions` แทน (route `/recurring` และ FAB เดิมไม่เปลี่ยน แค่ทางเข้าเปลี่ยน) เปิดที่ให้ "งบประมาณ" 🎯 เข้ามาแทนตำแหน่งเดิมของ "ประจำ"

## แก้บั๊ก take-home (`ratioCalculations.ts`, ค้างมาตั้งแต่ C5/C6)

`calculateAnalysisFigures` รับ parameter ใหม่ `estimatedTaxSatang: number | null` — คำนวณจาก `buildIncomeByTypeFromLegs` (จัดกลุ่ม legs 12 เดือนล่าสุดที่ใช้อยู่แล้วในหน้า `/analysis` ตาม 40(1)-(8)) ส่งเข้า `calculateTaxReturn` (C6) ตรงๆ โดยใช้:
- **Tax config**: ปีภาษีล่าสุดที่มีจริง (`useAvailableTaxYears()[0]`)
- **Header/ค่าลดหย่อน**: ที่ผู้ใช้เคยกรอกไว้ในหน้า `/tax` ปีนั้นจริง (ถ้ายังไม่เคยกรอกเลย ถือเป็น 0 ทุกช่อง — ยังดีกว่าไม่ประเมินภาษีเลย)
- `totalWithholding: 0` เสมอ (ใช้แค่ `finalTax` เป็นตัวประมาณภาษีที่ต้องจ่ายจริง ไม่สนใจยอดคืน/จ่ายเพิ่มที่ต้องพึ่งข้อมูล WHT ของช่วงเวลาที่ตรงกันเป๊ะ)

`monthlyTakeHome = (totalIncome − estimatedTaxSatang) / months` — ไม่มี tax config เลย (ผู้ใช้ยังไม่เคยตั้งค่าภาษี) → `estimatedTaxSatang = null` → fallback เป็นพฤติกรรมเดิม (pre-tax) พร้อม field ใหม่ `takeHomeIsAfterTax: boolean` ให้ UI แสดง caveat ต่างกัน (ข้อความใต้ตารางในหน้า `/analysis` อัปเดตตามสถานะนี้)

**ข้อจำกัดที่ทราบและยอมรับ**: ช่วงเวลาของ ratio (12 เดือนล่าสุดแบบ rolling) กับปีภาษี (ปฏิทิน) ไม่ตรงกันเป๊ะ — เป็นการประมาณโดยใช้รายได้ 12 เดือนล่าสุดผ่านสูตรภาษีปีล่าสุดที่มี ไม่ใช่ภาษีที่ต้องจ่ายจริงเป๊ะ 100% แต่แม่นกว่ารายได้ก่อนหักภาษีมาก

## ทดสอบ
Live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase Admin API — ลบทิ้งหลังทดสอบ ไม่เหลือรอยในระบบ) ครบ flow: nav ใหม่ (bottom-nav ไม่มี "ประจำ" มี "งบประมาณ" แทน), ปุ่ม "รายการประจำ" → `/recurring`, เพิ่มรายการชั้น A + ชั้น B, toggle ทิศทางชั้น B กรองบัญชีตาม type ถูกต้อง, หน้า `/analysis` โหลดพร้อม take-home caveat ใหม่ — ไม่มี console error ตลอด flow, `tsc --noEmit`/`oxlint` ผ่านสะอาด

## Non-goals ของช่วง 1 (รอช่วงถัดไป)
- Projection engine (คาดการณ์กระแสเงินสด/net worth ล่วงหน้า, ผูก tax engine ต่อปี, extrapolate config) — ช่วง 2
- Variance (เทียบชั้น A vs actual รายเดือน) — ช่วง 3
- Import/Export (CSV, backup/restore) — ช่วง 4
- Automated test suite — ยังทดสอบด้วย Playwright ชั่วคราวเหมือนทุกแชตก่อนหน้า (backlog ข้ามแชต)
