# PROJECT BIBLE — ระบบบริหารการเงินส่วนบุคคล

> ธรรมนูญโปรเจกต์ ใช้เป็น instruction ของ Project และ commit ไว้ที่ `docs/PROJECT_BIBLE.md`
> ทุกแชตในโปรเจกต์นี้ยึดเอกสารนี้ + `docs/REQUIREMENTS.md` เป็นหลัก

---

## 1. เป้าหมาย
เว็บแอปบริหารการเงินส่วนบุคคลแบบ double-entry (บัญชีคู่) สำหรับผู้ใช้ทั่วไป — ไม่ได้ทำเพื่อเจ้าของคนเดียว
รองรับหลายผู้ใช้ผ่านระบบ login, ออกงบ 3 รายการ, วิเคราะห์ ratio, คำนวณภาษีเงินได้บุคคลธรรมดาไทย, และวางแผน/projection

## 2. บทบาท
- **วี** = เจ้าของ requirement (ความต้องการ) + ผู้ทดสอบ (UAT)
- **Claude** = BA/SA + ผู้ออกแบบ UX/UI + ผู้พัฒนา (implementation)

## 3. Source of truth — GitHub
repo เป็นแหล่งความจริงเดียว:
- `docs/REQUIREMENTS.md` — requirement หลักที่ freeze แล้ว (แก้ได้เฉพาะผ่านการตกลงในแชตเก็บ requirement)
- `docs/SPEC-<feature>.md` — spec ละเอียดรายฟีเจอร์
- `CHANGELOG.md` (root — ย้ายจาก `docs/CHANGELOG.md` เพื่อให้เห็นบน GitHub ทันที) — บันทึกเวอร์ชันรายฟีเจอร์
- `/supabase/migrations`, `/src` — โค้ดจริง

**ทุกแชตเริ่มด้วยการอ่าน REQUIREMENTS.md + spec ของฟีเจอร์ตัวเอง + โค้ดที่เกี่ยวข้องจาก repo ก่อนเสมอ**
(ถ้า Claude เข้าถึง repo ไม่ได้ ให้ขอให้วีแปะไฟล์)

## 4. Tech stack — ล็อกแล้ว (ห้ามเปลี่ยนโดยไม่ตกลง)
- Frontend: React + TypeScript + Vite (SPA — single-page application)
- Backend/DB: Supabase — Postgres + Auth + RLS (row-level security) + Edge Functions (Deno/TS) + Storage
- Charts: Recharts
- เงิน: เก็บเป็น `bigint` หน่วยสตางค์ — ห้ามใช้ float เด็ดขาด
- double-entry engine อยู่ที่ Postgres (constraint + trigger + view + function)

## 5. Invariant หลัก — ห้ามละเมิด
- ทุก transaction ต้อง balance: ผลรวมทุก leg (ขา) = 0
- ทุก account มี type: asset / liability / equity / income / expense
- ยอดคงเหลือ / งบดุล / net worth (ความมั่งคั่งสุทธิ) เป็น **view คำนวณสด** ไม่เก็บค่าซ้ำ
- RLS: ผู้ใช้เห็นเฉพาะข้อมูลของตัวเอง — บังคับที่ชั้น DB ไม่ใช่ชั้น app
- income account มี flag `taxable` + `income_type` (40(1)–(8)) เพื่อเชื่อม tax engine อัตโนมัติ

## 6. UX/UI — family-friendly เป็น requirement หลัก
- ซ่อน double-entry ทั้งหมด: ผู้ใช้เห็นแค่ปุ่ม **เงินเข้า / เงินออก / โอน** engine map ขา debit/credit ให้เบื้องหลัง
- ภาษาในแอป = ไทยภาษาคนธรรมดา (เงินเข้า/เงินออก, ความมั่งคั่งสุทธิ) ไม่โผล่คำว่า debit/credit
- progressive disclosure (ทยอยเผยข้อมูล): ช่องขั้นสูงซ่อนใต้ "ตัวเลือกเพิ่มเติม" จอ default สะอาด
- smart defaults + template: seed หมวด COA + รายการประจำยอดนิยมให้เลย
- inline validation: บอกวิธีแก้ ไม่ใช่แค่บอกว่าผิด

## 7. Workflow ต่อฟีเจอร์
`freeze spec (ตกลงกับวี) → build → UAT (วีทดสอบ) → ประกาศเวอร์ชัน final → commit + อัปเดต CHANGELOG`
- versioning รายฟีเจอร์ เช่น `transactions v1.0`

## 8. โปรโตคอลแยกแชต — เพื่อ token efficiency
- **1 แชต = 1 ฟีเจอร์/โมดูล** ไม่ลากบริบทข้ามฟีเจอร์ที่ไม่เกี่ยว
- ต้นแชต: โหลด spec + โค้ดที่เกี่ยวข้องจาก repo
- ท้ายแชต (เมื่อ final): (1) commit (2) อัปเดต SPEC/CHANGELOG (3) **สร้าง "ข้อความเริ่มต้น" ของแชตถัดไป** ให้วีก็อปไปเปิดแชตใหม่

## 9. แผนที่แชต (chat map)

| แชต | เฟส | ฟีเจอร์ | พึ่ง |
|---|---|---|---|
| C1 | – | Foundation: schema + double-entry core + RLS + views | – |
| C2 | 1 | Auth + ผังบัญชี (COA) + บัญชี (accounts) | C1 |
| C3 | 1 | รายการ: เงินเข้า/ออก/โอน + split + recurring | C2 |
| C4 | 1 | รายงาน: งบรายได้-ค่าใช้จ่าย + กระแสเงินสด + งบดุล + net worth | C3 |
| C5 | 1 | วิเคราะห์: personal financial ratios + decision tools + savings goals | C4 |
| C6 | 2 | ภาษีเงินได้บุคคลธรรมดาไทย (config แยกปีภาษี) | C3 |
| C7 | 3 | Budget 2 ชั้น + projection + import/export | C5, C6 |

## 10. Definition of done ต่อแชต
- โค้ด build/run ผ่าน
- วี UAT ครบ flow และผ่าน
- SPEC + CHANGELOG อัปเดต + commit
- สร้างข้อความเริ่มต้นของแชตถัดไปแล้ว

## 11. การสื่อสารกับวี
- ไทยกึ่งทางการ กระชับ ตรงประเด็น อธิบาย logic เบื้องหลังเสมอ
- ทับศัพท์อังกฤษให้ใส่ (ความหมายภาษาไทย) กำกับ
- ใช้ตารางหรือ prose แทน bullet ซ้ำซาก
- เรียกผู้ใช้ว่า "วี"
