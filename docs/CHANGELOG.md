# CHANGELOG

รูปแบบ: `## <ฟีเจอร์> vX.Y — <วันที่>` ตามโปรโตคอลใน `PROJECT_BIBLE.md` §7

## Budget v1.0 (ช่วง 1/4) — 27 ก.ค. 2569

- M7 (บางส่วน): โครงสร้าง budget 2 ชั้น — หน้า `/budget` ใหม่ 2 แท็บ: **งบประจำ** (ชั้น A, baseline ไม่มีปีเริ่ม-จบ) / **แผนกำหนดการ** (ชั้น B, ผูกช่วงปีเฉพาะ) — ดูรายละเอียด schema/UX ใน `SPEC-budget.md`
  - ชั้น A: จำนวน/เดือนหรือ/ปี + growth%/ปี ผูกหมวด income/expense/asset(savings) — ทิศทาง derive จาก account type ไม่เก็บแยก
  - ชั้น B: ทิศทาง (จ่ายออก/รับเข้า/โยกเข้าสินทรัพย์) เป็น field จริง + ความถี่ 5 แบบ (เพิ่ม "ครั้งเดียว") + ปีเริ่ม-จบ (พ.ศ.) + เดือนเริ่มงวด — trigger บังคับ direction↔account type ตรงกันที่ชั้น DB
  - หนี้ที่ตั้งค่าเงินกู้ครบแล้ว (C3) ไม่มีในดรอปดาวน์ชั้น B เลย — เว้นไว้ให้ projection (ช่วง 2) ดึง amortization schedule มาใช้อัตโนมัติ
- **จัดที่ทาง nav** (ตกลงเพิ่มระหว่างแชต): ย้าย "ประจำ" ออกจาก bottom nav หลัก → ปุ่ม "รายการประจำ →" มุมขวาบนของ `/transactions` แทน เปิดที่ให้ "งบประมาณ" 🎯 เข้า bottom nav (คงไว้ 6 รายการตาม §8.1)
- **แก้บั๊ก take-home ค้างมาตั้งแต่ C5/C6** (`ratioCalculations.ts`): เดิมใช้รายได้ก่อนหักภาษีจริงมาคำนวณ DSR/Non-Mortgage DSR ในหน้า `/analysis` — แก้ให้ประเมินภาษีจริงจากรายได้ 12 เดือนล่าสุดผ่าน `calculateTaxReturn` (C6, ปีภาษีล่าสุดที่มี config + ค่าลดหย่อนที่เคยกรอกไว้จริง) fallback เป็นพฤติกรรมเดิมถ้ายังไม่เคยตั้งค่าภาษีเลย พร้อม caveat ข้อความใต้ตารางที่เปลี่ยนตามสถานะ
- Migration ใหม่ 1 ไฟล์ (additive): `budget_baseline_items` + `budget_schedule_items` พร้อม RLS + trigger บังคับความสอดคล้อง account/direction
- ทดสอบผ่าน: live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase Admin API ไม่ทิ้งรอยในโปรเจกต์จริง) ครบ flow nav ใหม่, CRUD ชั้น A/B, toggle ทิศทางกรองบัญชีถูกต้อง, หน้า `/analysis` โหลดพร้อม take-home ใหม่ — ไม่มี console error, `tsc --noEmit`/`oxlint` ผ่านสะอาด
- หมายเหตุ scope: เป็นช่วง 1/4 ของ C7 (Budget+Projection+Import/Export) — projection engine/variance/import-export ยังไม่ทำ (ช่วง 2-4 ถัดไป)

## Analysis v1.1 — 26 ก.ค. 2569

- แก้บั๊ก Saving Ratio (`buildRatioGroups`, `src/features/analysis/ratioCalculations.ts`): เดิม (v1.0) reuse `cashFlow.netCashFlow` ของงบกระแสเงินสด C4 (รวมเงินต้นผ่อนหนี้/เงินกู้ใหม่/ถอนเงินออมด้วย) ผิดจุด — ตาม REQUIREMENTS §7 "กระแสเงินสดสุทธิ" ของสูตรนี้ต้องเป็น `รายได้ − ค่าใช้จ่าย − รายจ่ายเพื่อการออม` เท่านั้น ผลคือมีเคสได้ Saving Ratio 184.8% (เป็นไปไม่ได้ทางคณิตศาสตร์) เจอระหว่าง UAT จริงของวี — แก้ให้ตรงนิยาม สรุปแล้วสูตรที่ถูกต้องลดรูปเหลือ `netIncome ÷ totalIncome` ตรงๆ (พิสูจน์ด้วยพีชคณิต, `tsc --noEmit` ผ่าน) ดูรายละเอียดใน `SPEC-analysis.md`
- เจอระหว่างการตรวจสอบตัวเลข ratio ที่ขัดแย้งกันช่วง UAT ของ C5 (Debt to Asset 94.9% vs DSR 0.0%, Liquidity Ratio 0.50 vs Basic Liquidity Ratio 17.39) — ตรวจแล้วมีแค่จุดนี้ที่เป็นบั๊กโค้ดจริง ส่วนที่เหลือเป็นพฤติกรรมถูกต้องบนข้อมูลที่ยังกรอกไม่ครบ (หนี้สหกรณ์ไม่เคยลง transaction ผ่อนจ่ายจริง มีแต่ยอดเปิดบัญชี)
- ไม่มี migration ไม่กระทบ field อื่นใน `AnalysisFigures`
- ทดสอบผ่าน: `tsc --noEmit` clean, ตรวจสอบด้วยพีชคณิตว่าค่าที่ได้เหมือนเดิมทุกกรณี

## Transactions v1.1 — 26 ก.ค. 2569

- เพิ่มปุ่ม "ทำซ้ำ" ต่อรายการในหน้า `/transactions` — ส่วนขยายเล็กของ M3 (ไม่ใช่โมดูลใหม่) ดูรายละเอียดใน `SPEC-transactions-recurring.md`
- กดแล้วเปิด `TransactionFormDialog` โหมด `duplicate` ใหม่: prefill ยอด/หมวด/บัญชี/payee/note/tag จากรายการต้นฉบับ (ใช้ path prefill เดิมทั้งหมด ไม่แยกโค้ดเพราะเดิมอ่านจาก `initial` อยู่แล้วไม่ผูกกับ edit) ครอบคลุมทั้งเงินเข้า/เงินออก (รวม split) และโอน (รวมผ่อนหนี้)
- วันที่ default เป็น**วันนี้** (ไม่ใช่วันที่รายการต้นฉบับ) ต้องแก้เองก่อนบันทึกเสมอ — ผ่อนหนี้ที่บัญชีปลายทางตั้งค่าเงินกู้ครบจะคำนวณเงินต้น/ดอกเบี้ยทับใหม่ตามวันนี้ทันที (ใช้ effect auto-calc เดิมของโหมดสร้างใหม่)
- กดบันทึก = insert รายการใหม่เสมอ ไม่กระทบรายการต้นฉบับ ไม่มีปุ่ม "ลบถาวร" ในโหมดนี้
- ไม่มี migration
- ทดสอบผ่านโดยวี (UAT บนแอปจริง)

## Thai PIT v1.0 — 26 ก.ค. 2569

- M11: หน้า `/tax` (เข้าถึงผ่านแท็บ "ภาษี" ใน `/accounts` — nav หลักเหลือ 6 รายการ) 5 แท็บ: สรุปภาษี, ค่าลดหย่อน, ภาษีหัก ณ ที่จ่าย, What-if, ตั้งค่าภาษี — ดูรายละเอียด schema/สูตร/เหตุผลการตัดสินใจใน `SPEC-tax.md`
  - เงินได้ 40(1)-(8) ดึงจาก ledger อัตโนมัติ (บัญชี income ที่ `taxable=true`) → หักค่าใช้จ่าย → หักลดหย่อน → bracket ขั้นบันได เทียบมาตรา 48(2) → เทียบภาษีหัก ณ ที่จ่าย + ภ.ง.ด.94 → คืน/จ่ายเพิ่ม
  - Tax config (bracket/ค่าใช้จ่าย/ลดหย่อน) เป็น**ตาราง versioned** ไม่ hardcode ตัวเลข — seed เริ่มต้นปีภาษี 2568/2569 ด้วยตัวเลขจาก search กรมสรรพากร/แหล่งรองตอน build (bracket คงที่ตั้งแต่ 2560, ประกันสังคมเพดานต่างกันจริงตามปี 9,000 vs 10,500)
  - แก้ได้เฉพาะ username `admin` (บังคับที่ RLS ผ่าน `is_admin()`) ทุกคนพรีวิวผลกระทบต่อภาษีตัวเองได้ก่อนบันทึกจริงในแท็บ "ตั้งค่าภาษี" — แก้ = สร้าง version ใหม่เสมอ ไม่ overwrite ของเก่า
- Migration ใหม่ 5 ไฟล์ (additive): schema+seed config 2 ปี, ตารางข้อมูลผู้ใช้ (`tax_returns`/`tax_return_deductions`/`tax_withholding_entries`), แก้ไขหลัง reconcile (แยกเพดานประกันชีวิต+สุขภาพ, เพิ่มรายการลดหย่อนที่ขาด, `pnd94_paid_satang`), fix view `v_tax_config_current`
- **Reconcile กับ ภ.ง.ด.90 ตัวจริงปีภาษี 2568 ที่วีส่งมาให้ตรวจ** — ป้อนเลขเดียวกันผ่านหน้าจอจริง ได้ผลตรงทุกบรรทัด (เงินได้สุทธิ 23,231.60, คืนภาษี 5,883.98) หลังแก้ 4 จุด: แยกเพดานประกันชีวิต(ไม่มีเพดานย่อย)+สุขภาพ(เพดานย่อย 25,000)ในเพดานรวม 100,000, เพดานบริจาคแบบ cascade (2เท่าคำนวณก่อนจากฐานเต็ม ทั่วไปคำนวณจากฐานที่ลดแล้ว ไม่ใช่ฐานเดียวกัน), ตัดบริจาคพรรคการเมืองออกจากรายการลดหย่อน (ไม่ใช่ตัวลดเงินได้สุทธิ เป็นการเจียดภาษีที่คำนวณเสร็จแล้ว), เพิ่ม ภ.ง.ด.94 (ภาษีครึ่งปีที่ชำระไปแล้ว) เป็นเครดิตอีกทาง
- หน้าสรุปภาษี**เดินตามเลข "ข้อ"/"บรรทัด" ของ ภ.ง.ด.90 จริง** (ตกลงเพิ่มระหว่างแชตหลัง reconcile) — จัดกลุ่มเงินได้ตามข้อ 1-7, ข้อ 11 กำกับเลขบรรทัด 1-25 ตรงแบบฟอร์ม เพื่อให้วีเทียบเลขได้ทีละบรรทัดถ้าเคยยื่นจริงมาก่อน
- **บั๊กที่เจอระหว่าง build/UAT และแก้แล้ว:**
  - `v_tax_config_current` (view `select *`) ไม่ดึงคอลัมน์ใหม่ที่เพิ่มทีหลังผ่าน `ALTER TABLE` อัตโนมัติ (ข้อจำกัดของ Postgres) — ทำให้ค่า config บาง field เป็น `undefined` แล้วคำนวณพังทั้งหน้าเป็น NaN โดยไม่มี error ชัดเจน แก้ด้วย `CREATE OR REPLACE VIEW` ใหม่ทุกครั้งที่เพิ่มคอลัมน์
  - ช่องกรอกเงินบาท (`type="number"`) ในฟีเจอร์ภาษีขาด `step="0.01"` ตามธรรมเนียมโปรเจกต์ — กรอกทศนิยม (เช่น 5,883.98) แล้ว browser บล็อกการ submit เงียบๆ ไม่มี error ให้เห็นเลย (HTML5 validation default step=1)
  - "บรรทัด 3/5" ของหน้าสรุปภาษี แสดงเลขติดลบได้เมื่อลดหย่อน/บริจาคเกินเงินได้ (ไม่มีทางเกิดในแบบฟอร์มจริง) แก้ clamp ที่ 0 + แก้สูตรบรรทัด 5 ที่คำนวณผิดตัวระหว่างทาง
- เพิ่ม banner เตือนเมื่อเพดานรวม 40(1)+40(2)/กลุ่มเกษียณ/กลุ่มประกันชีวิต+สุขภาพเต็ม กันสับสนว่าทำไมรายได้/ยอดที่กรอกเพิ่มไม่ได้ลดภาษีเพิ่ม
- ทดสอบผ่าน: live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase admin API หลายรอบ) ครบ flow ทุกแท็บ รวมถึง reconcile กับตัวเลขจริงจาก ภ.ง.ด.90 ที่วีส่งมา 3 รอบ (ตรงเป๊ะทุกครั้งหลังแก้บั๊ก), ทดสอบสิทธิ์ admin/non-admin แยกกัน, ทดสอบเพดานรวมอิ่มตัว (40(1) ก้อนใหญ่ + 40(2) เพิ่ม ไม่ได้หักค่าใช้จ่ายเพิ่ม — ยืนยันถูกต้องตามกฎหมายไม่ใช่บั๊ก)
- หมายเหตุ scope: ไม่ทำ final-tax election ของ 40(4)/เครดิตภาษีปันผล/เครดิตภาษีต่างประเทศ, ไม่ทำข้อ8(ขายอสังหาฯ)/ข้อ9(เงินให้-รับ)/เขตพัฒนาพิเศษ/ยื่นเพิ่มเติม/คริปโต, `ratioCalculations.ts` (C5) ยังไม่ดึงภาษีจริงมาหัก take-home (backlog แยกตามที่ตกลงไว้ตั้งแต่ต้น C6), ไม่เชื่อม e-filing กรมสรรพากรจริง

## Tags: management + usage v1.0 — 24 ก.ค. 2569

- ปิด gap ที่ C3 ตัดไว้ (แท็กสร้างได้อย่างเดียว) — เพิ่มแก้ชื่อ/ลบ พร้อมใช้ประโยชน์จากแท็กจริง (กรอง + สรุปยอดข้ามหมวดหมู่) ดูรายละเอียดใน `SPEC-tags.md`
  - **จัดการแท็ก** — ย้าย "หมวดหมู่" จาก nav หลักเข้า `/settings` เป็น tab (ลด nav มือถือ 7→6 ตาม §8.1) เพิ่ม tab ใหม่ "แท็ก/มิติ" (list + จำนวนรายการที่ผูก + แก้ชื่อ + ลบพร้อม confirm) `/categories` เดิม redirect ไป `/settings?tab=categories` อัตโนมัติ
  - **กรองตามแท็กใน `/transactions`** — เลือกแท็กจาก chip กรองรายการ + โชว์สรุปยอด (จำนวน/รายรับ/รายจ่าย) ของรายการที่กรองได้
  - **สรุปตามแท็กใน `/reports`** — แท็บใหม่ "ตามแท็ก" เลือกแท็ก+ช่วงเวลา โชว์ breakdown รายรับ/รายจ่ายข้ามหมวดหมู่ (จุดประสงค์เดิมของคำว่า "มิติ" ตั้งแต่ C3)
- ไม่มี migration ใหม่ (schema `tags`/`transaction_tags` เผื่อ RLS `update`/`delete` ไว้ตั้งแต่ C3 อยู่แล้ว) — เพิ่มแค่ optional `tagId` param ใน `useReportLegs` (backward compatible)
- rename `CategoriesPage.tsx` → `CategoriesTab.tsx` (ตัด wrapper `.page`/`h1` ออกเพราะอยู่ใต้ tab settings แล้ว)
- ทดสอบผ่าน: live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase) ครบ flow — nav/redirect, สร้าง/แก้ชื่อ/ลบแท็ก, กรองรายการ, สรุปยอดตามแท็กในรายงาน (เทียบยอดมือตรง: 2 รายการติดแท็กเดียวกัน รวมรายจ่าย 3,500 บาทข้าม 2 หมวดหมู่ ตรงทั้งหน้ารายการและหน้ารายงาน)
- หมายเหตุ scope: กรองได้ทีละแท็ก (ไม่มี AND/OR หลายแท็ก), แท็บ "ตามแท็ก" ไม่มีโหมดเทียบช่วงเวลา, ไม่ย้าย `/accounts` เข้า settings (ยังใช้บ่อยกว่าหมวดหมู่/แท็ก)

## Reports v1.1 — 24 ก.ค. 2569

- แก้บั๊กงบกระแสเงินสด (`buildCashFlowStatement`, `src/features/reports/reportCalculations.ts`): เดิมนับแค่ leg ขาออก (เงินออม/ลงทุน, เงินต้นผ่อนหนี้) แต่ไม่นับ leg ขาเข้าฝั่งตรงข้าม (**ถอนเงินออม/ลงทุน**, **รับเงินกู้ใหม่**) ทำให้กระแสเงินสดสุทธิไม่ตรงกับเงินสดที่เพิ่มขึ้นจริงเวลามีการกู้เงินใหม่หรือถอนเงินออมกลับมาใช้ — เพิ่ม 2 บรรทัดใหม่ในหน้า `/reports` แท็บกระแสเงินสด, `netCashFlow` reconcile กับยอดเงินสดจริงแล้ว (ทดสอบเคส: รายรับ-รายจ่าย-ออม-ผ่อนหนี้-ถอนออม-รับเงินกู้ใหม่ผสมกันในเดือนเดียว เทียบยอดบัญชีธนาคารตรงเป๊ะ)
- เจอระหว่าง UAT ของ C5 (วีถามเรื่องบันทึกบัญชีหนี้สินที่เพิ่งกู้มาใหม่ พบว่าเงินสดที่ได้จากเงินกู้ไม่โผล่ในงบกระแสเงินสด) — ไม่กระทบ schema/migration ไม่กระทบ `ratioCalculations.ts` (C5) เพราะเป็นการเพิ่ม field ใหม่ ของเดิมยังใช้ได้ปกติและได้ผลแม่นขึ้นอัตโนมัติ
- ดูรายละเอียดสูตรที่อัปเดตใน `SPEC-reports.md`

## Analysis v1.0 — 24 ก.ค. 2569

- M8: หน้า `/analysis` — personal financial ratio 8 ตัว 3 กลุ่ม (สภาพคล่อง/หนี้สิน/การออม) เทียบเกณฑ์มาตรฐาน REQUIREMENTS §7 พร้อม badge ผ่าน/ไม่ผ่านเกณฑ์ + decision tools (ความสามารถซื้อของชิ้นใหญ่, debt headroom) + เป้าหมายการออม (ตั้ง+ติดตามความคืบหน้า) — ดูรายละเอียดสูตรคำนวณใน `SPEC-analysis.md`
  - reuse ตัวแปรจาก `reportCalculations.ts` (C4) ไม่คำนวณซ้ำ (รายได้/ค่าใช้จ่าย/เงินออม/กระแสเงินสดสุทธิ)
  - เงินผ่อนหนี้รวม (เงินต้น+ดอกเบี้ย) คำนวณจาก transaction co-occurrence ไม่จับชื่อบัญชี "ดอกเบี้ยเงินกู้" (ผู้ใช้เลือกหมวดดอกเบี้ยเองได้ตอนผ่อนหนี้ และแก้ชื่อบัญชีได้ ชื่อจึงอ้างอิงไม่ได้)
  - เป้าหมายการออมผูกกับบัญชีสินทรัพย์จริง ไม่เก็บ "ออมแล้วเท่าไหร่" แยก กันข้อมูลสองชุดไม่ตรงกัน
- Migration ใหม่ 1 ไฟล์ (additive แต่ drop+recreate `fn_account_balances_as_of` เพราะเปลี่ยน return signature): เพิ่ม `asset_liquidity`/`is_invested`/`term`/`is_mortgage` ในผลลัพธ์ฟังก์ชัน + ตารางใหม่ `savings_goals`
- ทดสอบผ่าน: live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase) ด้วยข้อมูลจำลอง 12 เดือนครบทุก cashflow_class + เงินกู้ 2 ก้อน (มี/ไม่มีจำนอง) เทียบตัวเลขหน้าจอกับคำนวณมือตรงทุกตัว ครอบคลุมสถานะ pass/fail/na ครบ + decision tools + savings goal CRUD ทั้ง desktop/mobile
- หมายเหตุ scope: ช่วงเวลาคำนวณ ratio fix ที่ 12 เดือนล่าสุด ยังไม่ทำตัวเลือกปรับช่วงเอง, take-home ยังไม่หักภาษีแม่นยำจนกว่า Thai PIT (C6) เสร็จ

## Reports v1.0 — 23 ก.ค. 2569

- M5: หน้า `/reports` — งบรายได้-ค่าใช้จ่าย, งบกระแสเงินสด, งบดุล, กราฟ net worth ย้อนหลัง (Recharts) + เทียบช่วงเวลา (MoM/YoY/ปีก่อนหน้า) ทุกงบ — ดูรายละเอียดสูตรคำนวณใน `SPEC-reports.md`
  - งบกระแสเงินสดแยก 6 บรรทัด (รายรับ/คงที่/แปรผัน/ไม่ระบุถัง/เงินออม-ลงทุน/เงินต้นผ่อนหนี้) พร้อม callout เทียบผลต่างจากรายได้สุทธิให้เห็นชัด
  - การ์ดสรุปด่วนบนสุดของหน้า (net worth ปัจจุบัน/กระแสเงินสดสุทธิเดือนนี้/กำไรสุทธิเดือนนี้)
- Migration ใหม่ 2 ไฟล์ (additive): `fn_account_balances_as_of`/`fn_net_worth_history` (balance ณ วันที่ในอดีต — `v_account_balances`/`v_balance_sheet` เดิมคำนวณปัจจุบันเท่านั้น)
- **ส่วนขยาย (ตกลงเพิ่มระหว่างแชต):** เพิ่ม subtype `receivable` (ลูกหนี้) แยกจาก `other_asset` ใน `accounts` (migration additive + label ใน C2 `constants.ts`) — REQUIREMENTS bump เป็น v1.4 §3.2
- **ประเด็นที่คุยกับวีระหว่าง UAT (บันทึกไว้กันงงซ้ำ):**
  - Equity ติด 0 เสมอโดยดีไซน์ (ไม่มี flow ไหน post เข้าบัญชี equity ได้) — `Net worth = สินทรัพย์ − หนี้สิน` จับ "ส่วนของเจ้าของ" อัตโนมัติ ตราบใดที่บันทึกสินทรัพย์คู่กับหนี้สินที่เกี่ยวข้องครบ (เช่น กู้บ้านต้องมีบัญชี "บ้าน" เป็นสินทรัพย์คู่ด้วย ไม่งั้น net worth ติดลบเกินจริง — เจอเคสนี้จริงกับบัญชี test ตอน UAT แก้โดยเพิ่มบัญชีบ้านให้)
  - credit card ไม่ถูกนับเป็น "เงินต้นผ่อนหนี้" ในกระแสเงินสด (เช็คเฉพาะ `subtype=loan`) เพราะรายจ่ายถูกนับเป็น expense ไปแล้วตอนรูดบัตร จ่ายบิลเป็นแค่ transfer
- ทดสอบผ่าน: live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase admin API สำหรับรอบตรวจสอบอัตโนมัติ) ครบทุกแท็บ ทั้ง mobile/desktop, ตัวเลขไขว้กันถูกทุกจุด (งบดุล assets−liabilities=net worth ตรงทุกกรณี รวมกรณีบัญชี archive/เดือนขาดทุน/ลูกหนี้บางส่วน-เต็มจำนวน) + สร้างบัญชี `test` (username `test`) พร้อมข้อมูลจำลอง 14 เดือนถาวรให้วี UAT ด้วยมือ
- หมายเหตุ scope: personal financial ratios + decision tools (M8) ยังไม่ทำ (C5), ยังไม่มีหน้าจอเช็ค reconciliation ระหว่าง 3 งบโดยตรง (แค่ callout ในกระแสเงินสด), export/print งบเป็น M6 (เฟส 3)

## Transactions + Split + Recurring v1.0 — 23 ก.ค. 2569

- M3 Transactions: ปุ่มเงินเข้า/เงินออก/โอน ซ่อน debit/credit ทั้งหมด (map อัตโนมัติตาม REQUIREMENTS §3.4) — ดูรายละเอียดใน `SPEC-transactions-recurring.md`
  - Split หลายหมวด/บิลในรายการเดียว (เงินเข้า/เงินออก), tag/มิติ (ผูกระดับหัวรายการ), payee/note ใน "ตัวเลือกเพิ่มเติม"
  - ผ่อนจ่ายหนี้: เลือกปลายทางเป็นบัญชีเงินกู้ → ฟอร์มสลับแยกเงินต้น/ดอกเบี้ยอัตโนมัติ (ห้ามเหมาเป็น expense ก้อนเดียวตาม §3.5)
  - หน้า `/transactions` (default landing แทน `/accounts`) + FAB "เพิ่มรายการ" ลอยทุกหน้าใน AppShell
- M4 Recurring: หน้า `/recurring`, ความถี่ 4 แบบ (ไม่มี "ครั้งเดียว"), ยอดคงที่/ผันแปร, auto-post ตรวจตอนเปิดแอป (client-side) หรือเตือนยืนยันเอง
- ส่วนต่อขยาย (ตกลงเพิ่มระหว่างแชต): ตั้งค่าเงินกู้ต่อบัญชี (ยอดกู้/ดอกเบี้ย/ระยะเวลา/วันเริ่มสัญญา/วิธีคำนวณ Flat หรือ Reducing balance) → คำนวณแยกเงินต้น/ดอกเบี้ยอัตโนมัติทุกงวดทั้งตอนบันทึกมือและรายการประจำ (`src/features/accounts/loanAmortization.ts`)
- Migration ใหม่ 3 ไฟล์ (additive): `transaction_legs.note` + `tags`/`transaction_tags`, `recurring_transactions`/`recurring_transaction_legs`, `accounts.loan_*` fields
- **บั๊กที่เจอระหว่าง build/UAT และแก้แล้ว:**
  - `detectFlow` จัดประเภทรายการผ่อนจ่ายหนี้ผิดเป็น "เงินออก" ธรรมดา (เพราะมี leg ดอกเบี้ยเป็น expense ปน) ทำให้หน้ารายการโชว์ยอดไม่ครบและแก้ไขรายการพัง — แก้ให้เช็คทิศทางของ leg หนี้สินเป็นตัวตัดสินก่อน
  - `end_date` ของรายการประจำถูกเก็บไว้แต่ไม่เคยถูกบังคับใช้จริงในโค้ดที่ post — auto-post จะโพสต์ต่อเรื่อยๆ เกินกำหนดสัญญาด้วยยอด fallback ที่ไม่ตรง แก้ให้ปิดใช้งานอัตโนมัติเมื่อเลย end_date
  - Timezone: `addPeriod`/`today()`/ช่วงเดือนของหน้ารายการ ใช้ `toISOString()` ซึ่งแปลงเป็น UTC เสมอ — ทำให้วันที่เลื่อนถอยหลัง 1 วันทุกครั้งที่คำนวณสำหรับ timezone ไทย (+7) แก้เป็นคำนวณด้วยปฏิทินท้องถิ่นล้วนๆ (`src/lib/date.ts`)
- ทดสอบผ่าน: live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase admin API ไม่ทิ้งรอยในโปรเจกต์จริง) ครบทุก flow — เงินเข้า/ออก/split, โอนทั่วไป/เข้าลงทุน/ผ่อนหนี้ (สร้าง+แก้ไข), tag, รายการประจำ auto-post หลายงวดติดกัน (ยืนยันคำนวณ reducing balance ถูกต้องเทียบมือ), ยืนยันยอดผันแปร, end_date บังคับหยุด auto-post จริง — ทุก transaction balance = 0 ตรวจสอบผ่าน DB โดยตรง
- หมายเหตุ scope: recurring ไม่รองรับ split หลายหมวดใน v1, รองรับวิธีคำนวณดอกเบี้ยแค่ Flat/Reducing balance (Rule of 78 เป็น backlog), ยังไม่มี automated test suite (ทดสอบด้วย script ที่เขียนแล้วทิ้งตลอดแชต)

## Auth + COA + Accounts v1.0 — 23 ก.ค. 2569

- Supabase Auth ด้วย **username** (ไม่ใช่อีเมล) ผ่านกลไก email plus-addressing — ดูรายละเอียดใน `SPEC-auth-coa-accounts.md`
  - ตาราง `profiles` + RPC `is_username_available`/`get_login_email` + trigger `create_profile_from_signup`
  - หน้า signup/login/forgot-password/reset-password/check-email/settings ครบ
- Migration เพิ่ม field วางแผนการเงินใน `accounts` (additive, ตาม REQUIREMENTS v1.2/v1.3 §3.5, §7): `cashflow_class`, `asset_liquidity`, `is_invested`, `term`, `is_mortgage` พร้อม constraint บังคับกฎ (เช่น savings ติดได้เฉพาะ asset)
- Trigger `seed_default_accounts` สร้างหมวดรายได้/ค่าใช้จ่าย/ถังออมเริ่มต้นให้ user ใหม่อัตโนมัติตอนสมัคร (22 บัญชี)
- Chart of Accounts (M1): หน้า `/categories` จัดการหมวดหมู่ลำดับชั้น 2 ชั้น + archive + field เฉพาะ income (taxable/income_type) และ expense (cashflow_class)
- Accounts (M2): หน้า `/accounts` จัดการบัญชีสินทรัพย์/หนี้สิน, ยอดคงเหลือจาก `v_account_balances`, วงเงินบัตรเครดิต, เปิด/ปิดบัญชี
- PWA scaffold: `vite-plugin-pwa` + manifest + ไอคอนชุดเต็มจาก `app-icon.svg` (vI ส่งมาให้)
- AppShell mobile-first: bottom navigation (มือถือ) / sidebar (desktop) ตาม REQUIREMENTS §8.1
- **บั๊กที่เจอระหว่าง build/UAT และแก้แล้ว:**
  - ฟอร์มเพิ่มบัญชี (`AccountFormDialog`) crash ตอนเปิดหน้าแรก — state initializer ไม่ guard ตาม asset/liability union type
  - `create_profile_from_signup` ทำให้สร้าง user จาก Supabase Dashboard ล้มเหลวทั้งหมด เพราะคาดว่าต้องมี `username`/`recovery_email` ใน metadata เสมอ — แก้ให้ข้ามการสร้าง profile แทนถ้าไม่มี metadata ครบ
- ทดสอบผ่าน: migration dry-run (transaction + rollback) ยืนยัน seed trigger/constraint ทำงานถูกต้องกับ DB จริงโดยไม่ทิ้งข้อมูลทดสอบ, login จริงผ่าน Supabase Auth API, UAT โดยวีผ่านครบทุก flow
- หมายเหตุปฏิบัติงาน: โปรเจกต์ยังไม่ได้ตั้ง custom SMTP — mailer เริ่มต้นของ Supabase จำกัด 2 อีเมล/ชม. เพียงพอสำหรับพัฒนา แต่ควรตั้งก่อนเปิดใช้จริงกับผู้ใช้หลายคน

## Foundation v1.0 — 22 ก.ค. 2569

- Scaffold Vite + React + TypeScript
- Schema แกน double-entry: `account_types`, `accounts`, `transactions`, `transaction_legs`
- Constraint/trigger บังคับผลรวม leg ต่อ transaction = 0 (deferred constraint trigger)
- FK `ON DELETE RESTRICT` ป้องกันการลบ account ที่มี transaction_leg อ้างอิง (ใช้ archive แทน)
- Views คำนวณสด: `v_account_balances`, `v_balance_sheet`, `v_net_worth`
- RLS ต่อผู้ใช้ทุกตารางข้อมูล user (`accounts`, `transactions`, `transaction_legs`), `account_types` เป็น reference table select-only
- Rename `doc/` → `docs/` ให้ตรงกับ `CLAUDE.md` / `PROJECT_BIBLE.md`
- Migration push ขึ้น Supabase project จริงแล้ว, verify โครงสร้าง + RLS + REST connectivity ผ่านหมด (รายละเอียดใน `docs/SPEC-foundation.md`)
