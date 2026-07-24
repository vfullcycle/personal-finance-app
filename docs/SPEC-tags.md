# SPEC — Tags: management + usage

> Frozen: 24 ก.ค. 2569 — ต่อยอดจาก `tags`/`transaction_tags` (schema เดิมจาก C3, `SPEC-transactions-recurring.md`)
> พึ่งพา C2 (`/settings`, `/categories`), C3 (`TagPicker.tsx`, `useTags.ts`), C4 (`reportCalculations.ts`, `useReportLegs.ts`)

## ขอบเขต
C3 สร้างได้แต่แท็กใหม่เท่านั้น (บันทึกไว้เป็น non-goal "จัดการ tags (rename/ลบ) — สร้างได้อย่างเดียวตอนนี้") งานนี้ปิด gap นั้น + เพิ่มการใช้ประโยชน์จากแท็ก (กรอง/สรุปยอด) ไม่มี migration ใหม่ (schema `tags`/`transaction_tags` เผื่อ RLS `update`/`delete` ไว้ตั้งแต่ C3 อยู่แล้ว)

## Nav/route restructure

ย้าย "หมวดหมู่" ออกจาก bottom nav/sidebar หลัก เข้าไปเป็น tab ใน `/settings` แทน (ลด nav item จาก 7 เหลือ 6 ตาม §8.1 mobile-first) `/settings` ปรับเป็นหน้า tab แบบเดียวกับ `/accounts`:

| Tab | เนื้อหา |
|---|---|
| โปรไฟล์ | เนื้อหาเดิมของ `/settings` ทั้งหมด (username, เปลี่ยนรหัสผ่าน, ออกจากระบบ) |
| หมวดหมู่ | `CategoriesTab.tsx` (rename จาก `CategoriesPage.tsx` — ตัด wrapper `.page`/`h1` ออกเพราะอยู่ใต้ tab แล้ว) |
| แท็ก/มิติ | `TagsSettingsTab.tsx` (ใหม่) |

`/categories` เดิม → `<Navigate to="/settings?tab=categories" replace />` กัน bookmark/deep link เดิมพัง `SettingsPage` อ่าน query param `tab` ตอน mount เพื่อเลือก tab เริ่มต้น

## A. จัดการแท็ก (`TagsSettingsTab.tsx`)

List ทุกแท็กของ user + จำนวนธุรกรรมที่ผูกอยู่ (นับจาก `transaction_tags` client-side) — สร้างใหม่ได้ (input + ปุ่ม เหมือน `TagPicker`), แก้ชื่อ (inline edit บนแถว), ลบ (`confirm()` บอกจำนวนรายการที่จะถูก **เลิกผูก** ก่อนเสมอถ้า count > 0 — cascade delete ที่ `transaction_tags` ทำให้ตัวธุรกรรมไม่หาย แค่ tag_id หลุด) กันชื่อซ้ำ (case-insensitive) ทั้งตอนสร้างและ rename ที่ชั้น client (ไม่มี DB constraint บังคับ unique เพิ่มจาก C3)

## B. กรองรายการตามแท็ก (`TransactionsPage.tsx`)

แถบ chip แท็ก (reuse `.radio-group`/`.radio-chip`) เหนือ list — เลือกได้ทีละแท็ก (v1 single-select, ไม่มี AND/OR) filter `transactions` client-side ด้วย `t.tagIds.includes(tagFilter)` เมื่อกรองอยู่ โชว์แถบสรุป (จำนวนรายการ, รายรับรวม, รายจ่ายรวม — คำนวณจาก `summarize()` เดิมของหน้านี้ ไม่ปนกับ transfer)

## C. สรุปยอดตามแท็กใน Reports (`TagBreakdownReport.tsx`)

แท็บที่ 5 ของ `/reports` — "ตามแท็ก" เลือกแท็ก (dropdown) + ช่วงเวลา (reuse `getRange`/`shiftAnchor` จาก `period.ts`, ไม่มีโหมดเทียบช่วงเพราะไม่จำเป็นสำหรับมุมมองนี้) ดึง legs ผ่าน `useReportLegs(range, tagId)` (ดูหัวข้อถัดไป) แล้ว reuse `buildIncomeStatement` โชว์ breakdown รายรับ/รายจ่ายข้ามหมวดหมู่แบบเดียวกับแท็บ "รายได้-ค่าใช้จ่าย"

### ขยาย `useReportLegs` รับ `tagId` (optional)
`useReportLegs(range, tagId?)` — ถ้ามี `tagId` เปลี่ยน select เป็น embed `transaction_tags!inner(tag_id)` แล้ว `.eq('transaction_tags.tag_id', tagId)` (PostgREST embedded filter, inner join บังคับให้เหลือเฉพาะธุรกรรมที่มีแท็กนั้นจริง) — backward compatible กับผู้เรียกเดิมทั้งหมด (`tagId` undefined = query แบบเดิมเป๊ะ)

## Non-goals ของงานนี้
- กรองหลายแท็กพร้อมกัน (AND/OR) ใน `/transactions`
- โหมดเทียบช่วงเวลาในแท็บ "ตามแท็ก"
- ย้าย `/accounts` เข้า Settings ด้วย (พิจารณาแล้วว่ายังใช้บ่อยกว่าหมวดหมู่/แท็กมาก ไม่ย้าย)
