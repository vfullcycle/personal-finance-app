# CHANGELOG

รูปแบบ: `## <ฟีเจอร์> vX.Y — <วันที่>` ตามโปรโตคอลใน `PROJECT_BIBLE.md` §7

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
