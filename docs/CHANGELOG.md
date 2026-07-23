# CHANGELOG

รูปแบบ: `## <ฟีเจอร์> vX.Y — <วันที่>` ตามโปรโตคอลใน `PROJECT_BIBLE.md` §7

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
