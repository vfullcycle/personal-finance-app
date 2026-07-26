# SPEC — Transactions + Split + Recurring (C3)

> Frozen: 23 ก.ค. 2569 — อ้างอิง `REQUIREMENTS.md` v1.3 §3.4, §3.5, §8, §8.1, M3/M4
> พึ่งพา C1 (`SPEC-foundation.md`) และ C2 (`SPEC-auth-coa-accounts.md`)

## ขอบเขต
1. M3 Transactions: ปุ่มเงินเข้า/เงินออก/โอน (ซ่อน debit/credit ทั้งหมด) + split หลายหมวด + tag/มิติ + payee/note
2. M4 Recurring: รายการประจำ ยอดคงที่/ผันแปร, auto-post หรือเตือนยืนยัน
3. ส่วนต่อขยาย: ตั้งค่าเงินกู้ต่อบัญชี + คำนวณแยกเงินต้น/ดอกเบี้ยอัตโนมัติ (ตกลงเพิ่มระหว่างแชต)

## Schema เพิ่ม (migrations, additive ทั้งหมด)

| Migration | เนื้อหา |
|---|---|
| `20260723080000_transaction_tags.sql` | `transaction_legs.note` (คอลัมน์ใหม่) + ตาราง `tags`, `transaction_tags` (ผูก tag กับหัวรายการ ไม่ใช่ leg) |
| `20260723080001_recurring_transactions.sql` | ตาราง `recurring_transactions`, `recurring_transaction_legs` |
| `20260723090000_loan_terms.sql` | เพิ่ม `loan_original_principal`, `loan_annual_rate`, `loan_term_months`, `loan_start_date`, `loan_interest_method` บน `accounts` (ตั้งได้เฉพาะ subtype=loan, optional ทุก field) |

### `recurring_transaction_legs` — แยก sign ออกจาก amount
ต่างจาก `transaction_legs.amount` (signed ตรงๆ) — `recurring_transaction_legs` เก็บ `sign` (1/-1) แยกจาก `amount` (magnitude, nullable) เพราะยอดผันแปรไม่รู้จำนวนล่วงหน้า แต่ทิศทางเดบิต/เครดิตของแต่ละบัญชีในเทมเพลตคงที่เสมอ — ถ้าเก็บแค่ signed amount แล้วปล่อย null ตอน variable จะไม่รู้ว่า leg ไหนบวก/ลบตอนยืนยันยอดทีหลัง

## M3 — Double-entry mapping (ตรงตาม REQUIREMENTS §3.4)

| ปุ่ม/กรณี | Legs | Engine trigger |
|---|---|---|
| เงินเข้า | +บัญชีที่รับ(asset) / −หมวดรายได้ (split ได้) | เลือกปุ่ม "เงินเข้า" |
| เงินออก (เงินสด/แบงก์) | +หมวดค่าใช้จ่าย (split ได้) / −บัญชี asset | เลือกปุ่ม "เงินออก" + บัญชีที่จ่าย = asset |
| เงินออกด้วยบัตร | +หมวดค่าใช้จ่าย / −บัญชีบัตร (liability) | เลือกปุ่ม "เงินออก" + บัญชีที่จ่าย = liability |
| โอนทั่วไป / โอนเข้าลงทุน | +ปลายทาง / −ต้นทาง | เลือกปุ่ม "โอน" ปลายทางไม่ใช่ loan |
| ผ่อนจ่ายหนี้ | +หนี้สิน(เงินต้น) / +ค่าใช้จ่าย(ดอกเบี้ย, ถ้า>0) / −ต้นทาง | เลือกปุ่ม "โอน" + ปลายทาง subtype=loan → ฟอร์มสลับเป็นช่องเงินต้น/ดอกเบี้ยอัตโนมัติ |

**หมวดหมู่ split** จำกัดเฉพาะ type_id ตรงกับปุ่ม (เงินเข้า→income เท่านั้น, เงินออก→expense เท่านั้น) — "เงินออก" **ไม่มี**ทางเลือกปลายทางเป็น liability/asset โดยตรงในหมวด split เพราะ REQUIREMENTS §3.4 กำหนดให้ลดหนี้/โอนเข้าออมเป็นงานของปุ่ม **โอน** เท่านั้น (ดูตารางด้านบน) — ตัดสินใจนี้ตกลงกับวีระหว่างแชต (ผู้ใช้ถามหา liability destination ใน "เงินออก" แล้วยืนยันว่า spec ถูกต้องตามที่สร้างไว้)

**detectFlow** (`src/features/transactions/types.ts`) จำแนก flow จาก legs ที่มีอยู่จริง โดยเช็คทิศทาง (`isDebit`) ของ leg หนี้สินเป็นตัวตัดสินก่อน ไม่ใช่แค่การมี leg ประเภท expense ปนอยู่ — กันเคส "ผ่อนจ่ายหนี้" (มี leg ดอกเบี้ยเป็น expense) ถูกจัดผิดเป็น "เงินออก" ธรรมดา (บั๊กที่เจอและแก้ระหว่างแชต)

## M4 — Recurring

- ความถี่ 4 แบบ: รายเดือน/ราย 3 เดือน/ราย 6 เดือน/รายปี (ตั้งใจไม่มี "ครั้งเดียว" — ใช้บันทึกรายการปกติแทน)
- `amount_mode`: fixed/variable — variable ห้าม auto_post (constraint `chk_recurring_auto_post_fixed_only`)
- **ไม่รองรับ split หลายหมวดใน v1** (1 รายการประจำ = 1 หมวด/ปลายทาง) — ตัดสินใจร่วมกับวีเพื่อลด scope
- Auto-post ตรวจตอนเปิดแอป (client-side, ไม่ใช้ pg_cron) — `useDueRecurring` ไล่ post occurrence ที่ค้างให้ครบ (จำกัด 36 ครั้ง/รอบกันลูปไม่รู้จบ) แล้วเลื่อน `next_due_date`
- `end_date` **ถูกบังคับจริง**: เลย end_date แล้ว auto-post จะหยุดและ**ปิดใช้งานอัตโนมัติ** (is_active=false) ไม่ใช่แค่เก็บไว้เฉยๆ (บั๊กที่เจอและแก้ระหว่างแชต — ก่อนแก้ ระบบไม่เคยเช็ค end_date เลย)

## ตั้งค่าเงินกู้ + คำนวณอัตโนมัติ (ส่วนต่อขยาย)

`src/features/accounts/loanAmortization.ts` — คำนวณแยกเงินต้น/ดอกเบี้ยต่องวดจากยอดกู้ตั้งต้น (ยอดกู้, อัตราดอกเบี้ย%/ปี, ระยะเวลา, วันเริ่มสัญญา) กันไม่ต้องเปิด statement มาคำนวณเองทุกงวด — เป็น**ค่าประมาณ**จากสูตรมาตรฐาน อาจเพี้ยนจากยอดจริงเล็กน้อย (ธนาคารปัดเศษ/มีค่าธรรมเนียมแทรก)

- รองรับ 2 วิธี: **Flat** (คงที่ตลอดสัญญา) และ **Reducing balance** (ลดต้นลดดอก มาตรฐาน) — Rule of 78 และเงินต้นคงที่ยังไม่ทำ (backlog)
- ตั้งค่าเป็น **optional** ต่อบัญชี subtype=loan — ถ้ากรอกไม่ครบทั้ง 5 ช่อง (`hasLoanTerms`) ระบบจะไม่คำนวณให้ ตกกลับไปกรอกมือ
- กรอกไม่ครบบางช่อง (ไม่ใช่ว่างทั้งหมด) → เด้ง `confirm()` ก่อนบันทึกเสมอ กันลืมโดยไม่รู้ตัว
- `resolveRecurringLegs` (`recurringLegBuilder.ts`) คำนวณเงินต้น/ดอกเบี้ย**สดใหม่ทุกครั้งที่ post จริง** (ทั้ง auto-post และกดยืนยันเอง) ไม่ใช้ค่า template ที่บันทึกไว้ตอนสร้าง — จำเป็นเพราะสัดส่วนลดต้นลดดอกเปลี่ยนทุกงวด ตั้งครั้งเดียวจำตลอดแบบยอดคงที่ทั่วไปไม่ได้
- ตอนตั้งรายการประจำผ่อนหนี้บนบัญชีที่ตั้งค่าเงินกู้ครบ ระบบเสนอ "สิ้นสุดวันที่" = วันเริ่มสัญญา + ระยะเวลาให้อัตโนมัติ (แก้ทับได้)

## ส่วนต่อขยาย: ปุ่ม "ทำซ้ำ" (v1.1)

`TransactionFormDialog` รับ prop `mode?: 'edit' | 'duplicate'` (default `'edit'`) แยกออกจาก `isEdit` (`= !!initial && mode === 'edit'`) — path prefill เดิม (primary account, split lines, transfer source/dest, เงินต้น/ดอกเบี้ยผ่อนหนี้, payee/note/tag) อ่านจาก `initial` อยู่แล้วโดยไม่ผูกกับ `isEdit` จึงใช้ prefill โหมด duplicate ได้ทันทีโดยไม่ต้องเขียนโค้ดแยก

- ปุ่ม "ทำซ้ำ" ต่อรายการในหน้า `/transactions` (nested button + `stopPropagation`, pattern เดียวกับปุ่ม เปิด/ปิด ใน `/recurring`)
- วันที่ default เป็นวันนี้เสมอ (ต่างจากโหมดแก้ไขที่ default เป็นวันที่เดิม) เพราะ "วันที่แทบไม่มีทางตรงเป๊ะทุกครั้ง" ต้องแก้เองอยู่แล้ว
- ผ่อนหนี้: effect auto-calc เงินต้น/ดอกเบี้ยของโหมดสร้างใหม่ (ที่ปกติปิดไว้ตอน `isEdit`) จะทำงานทันทีเมื่อ duplicate เพราะ `isEdit=false` — คำนวณทับค่าที่ prefill มาให้ตรงกับวันนี้ถ้าบัญชีปลายทางตั้งค่าเงินกู้ครบ ตรงกับหลักการเดิมว่าสัดส่วนต้น/ดอกเปลี่ยนทุกงวด
- บันทึก = insert รายการใหม่เสมอ ไม่มีปุ่มลบในโหมดนี้ ไม่กระทบรายการต้นฉบับ

## Routes
`/transactions` (default landing แทน `/accounts`) `/recurring` เพิ่มใน `AppShell` (nav + FAB "เพิ่มรายการ" ลอยทุกหน้า)

## การเปลี่ยนแปลงจาก C2 ที่เกี่ยวเนื่อง
- FAB ของหน้า `/accounts` ("+" ลอย) ย้ายเป็นปุ่มในหัวข้อแทน (แบบเดียวกับ `/categories`) เพื่อไม่ชนกับ FAB "เพิ่มรายการ" ที่ลอยทุกหน้าใน AppShell
- แก้บั๊ก timezone: `addPeriod`/`today()`/ช่วงเดือนของหน้ารายการ เดิมใช้ `toISOString()` ซึ่งแปลงเป็น UTC เสมอ — สำหรับ timezone ไทย (+7) ทำให้วันที่เลื่อนถอยหลัง 1 วันทุกครั้งที่คำนวณ แก้เป็นคำนวณด้วยปฏิทินท้องถิ่นล้วนๆ (`src/lib/date.ts`)

## Non-goals ของ C3
- Reports/งบการเงิน (Balance Sheet, Cash Flow) — ข้อมูลถูกต้องแล้วที่ชั้น view แต่ยังไม่มีหน้าจอ → C4
- Rule of 78 / เงินต้นคงที่ สำหรับคำนวณดอกเบี้ยเงินกู้ — backlog
- ~~จัดการ tags (rename/ลบ) — สร้างได้อย่างเดียวตอนนี้~~ ปิดแล้ว ดู `SPEC-tags.md`
- Automated test suite — ทดสอบด้วย live browser script (Playwright) แบบเขียนแล้วทิ้งตลอดทั้งแชต ยังไม่มี regression test ติดโปรเจกต์
