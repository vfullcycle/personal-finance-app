# ระบบบริหารการเงินส่วนบุคคล (Personal Finance App)

เว็บแอปบริหารการเงินส่วนบุคคลแบบ **double-entry (บัญชีคู่)** ออกแบบเพื่อผู้ใช้ทั่วไป (ไม่ใช่แค่เจ้าของโปรเจกต์คนเดียว) รองรับหลายผู้ใช้ผ่านระบบ login แยกสมุดบัญชีต่อคน ซ่อนความซับซ้อนของบัญชีคู่ทั้งหมดไว้เบื้องหลัง — ผู้ใช้เห็นแค่ปุ่ม **เงินเข้า / เงินออก / โอน**

ครอบคลุม 4 เสาหลัก:

1. บันทึกบัญชีละเอียด แยกประเภทรายรับ/รายจ่าย จัดหมวดหมู่
2. ออกงบการเงิน 3 รายการ (งบรายได้-ค่าใช้จ่าย, งบกระแสเงินสด, งบดุล) + ความมั่งคั่งสุทธิ (net worth)
3. วิเคราะห์ด้วย personal financial ratios มาตรฐาน + เครื่องมือช่วยตัดสินใจทางการเงิน
4. วางแผน: งบประมาณ + คาดการณ์ล่วงหน้า (projection) + คำนวณภาษีเงินได้บุคคลธรรมดาไทย

สกุลเงิน: **THB เท่านั้น**

## เอกสารหลัก

โปรเจกต์นี้ยึดเอกสารต่อไปนี้เป็น source of truth (อ่านตามลำดับ) — ดู workflow เต็มใน [`docs/PROJECT_BIBLE.md`](docs/PROJECT_BIBLE.md) §3:

| เอกสาร | เนื้อหา |
|---|---|
| [`docs/PROJECT_BIBLE.md`](docs/PROJECT_BIBLE.md) | ธรรมนูญโปรเจกต์ — workflow, tech stack ที่ล็อกไว้, โปรโตคอลแยกแชตต่อฟีเจอร์ |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Requirement หลักที่ freeze แล้ว (v1.4) — โดเมนโมเดล, invariant, กฎ UX |
| [`CHANGELOG.md`](CHANGELOG.md) | บันทึกเวอร์ชันรายฟีเจอร์ ละเอียดทุกจุด รวมบั๊กที่เจอ+วิธีแก้ |
| `docs/SPEC-*.md` | Spec ละเอียดรายฟีเจอร์ (auth-coa-accounts, transactions-recurring, reports, analysis, tax, budget, tags) |

## ฟีเจอร์ / สถานะปัจจุบัน

พัฒนาเป็นเฟส แต่ละฟีเจอร์แยก 1 แชต (ดู chat map เต็มใน [`docs/PROJECT_BIBLE.md`](docs/PROJECT_BIBLE.md) §9):

| โมดูล | ฟีเจอร์ | สถานะ |
|---|---|---|
| C1 | Foundation — schema double-entry แกน + RLS + views | ✅ เสร็จ |
| C2 | Auth (username) + ผังบัญชี (Chart of Accounts) + บัญชี | ✅ เสร็จ |
| C3 | รายการ: เงินเข้า/ออก/โอน + split + รายการประจำ (recurring) | ✅ เสร็จ |
| C4 | รายงาน: งบรายได้-ค่าใช้จ่าย, กระแสเงินสด, งบดุล, net worth | ✅ เสร็จ (v1.3) |
| C5 | วิเคราะห์: personal financial ratios + decision tools + เป้าหมายการออม | ✅ เสร็จ (v1.1) |
| Tags | จัดการแท็ก/มิติ + กรอง + สรุปยอดข้ามหมวดหมู่ | ✅ เสร็จ |
| C6 | ภาษีเงินได้บุคคลธรรมดาไทย (Thai PIT) — config versioned ต่อปีภาษี | ✅ เสร็จ |
| C7 | งบประมาณ + คาดการณ์ (projection) + import/export | 🟡 ช่วง 2/4 — โครงสร้าง+projection เสร็จ, **variance (ช่วง 3)** และ **import/export (ช่วง 4)** ยังไม่เริ่ม |

รายละเอียดของแต่ละเวอร์ชัน (รวมบั๊กที่เจอระหว่าง UAT และวิธีแก้) ดูที่ [`CHANGELOG.md`](CHANGELOG.md)

## Tech stack (ล็อกแล้ว — ดู [`docs/PROJECT_BIBLE.md`](docs/PROJECT_BIBLE.md) §4)

- **Frontend**: React + TypeScript + Vite (SPA, mobile-first + PWA ผ่าน `vite-plugin-pwa`)
- **Backend/DB**: [Supabase](https://supabase.com) — Postgres + Auth + Row-Level Security (RLS) + Edge Functions (Deno/TS)
- **Charts**: Recharts
- **เงิน**: เก็บเป็น `bigint` หน่วยสตางค์เสมอ — ห้ามใช้ float
- Double-entry engine (constraint + trigger + view + function) อยู่ที่ชั้น Postgres ทั้งหมด — ยอดคงเหลือ/งบการเงิน/net worth เป็น view คำนวณสด ไม่เก็บค่าซ้ำ

## Invariant หลัก — ห้ามละเมิด

- ทุก transaction ต้อง balance: ผลรวมทุก leg (ขาเดบิต/เครดิต) = 0
- ทุก account มี type ตายตัว: `asset` / `liability` / `equity` / `income` / `expense`
- RLS บังคับที่ชั้น DB — ผู้ใช้เห็นเฉพาะข้อมูลของตัวเอง
- ไม่มีการลบ account ที่มี transaction leg อ้างอิง (ใช้ archive แทน)

## โครงสร้างโปรเจกต์

```
src/
├── features/
│   ├── auth/          # signup/login/settings, แท็ก/มิติ
│   ├── accounts/      # ผังบัญชี, บัญชี, เงินกู้ (loan amortization)
│   ├── transactions/  # เงินเข้า/ออก/โอน, split, รายการประจำ
│   ├── reports/       # งบ 3 รายการ + net worth + สรุปตามแท็ก
│   ├── analysis/      # personal financial ratios + decision tools + savings goals
│   ├── tax/           # ภาษีเงินได้บุคคลธรรมดาไทย
│   └── budget/        # งบประมาณ + projection
├── components/        # AppShell (bottom nav มือถือ / sidebar desktop) ฯลฯ
├── context/           # React context (auth session ฯลฯ)
├── lib/               # utils ร่วม (date, supabase client)
└── types/             # shared TypeScript types

supabase/
└── migrations/        # migration รายไฟล์ (26+ ไฟล์ ณ ปัจจุบัน) — schema แกน + RLS + trigger + view

docs/
├── PROJECT_BIBLE.md           # ธรรมนูญโปรเจกต์
├── REQUIREMENTS.md            # requirement frozen v1.4
└── SPEC-<feature>.md          # spec ละเอียดรายฟีเจอร์
```

## เริ่มต้นใช้งาน (Development)

### สิ่งที่ต้องมี
- Node.js (แนะนำเวอร์ชัน LTS ล่าสุด)
- โปรเจกต์ [Supabase](https://supabase.com) (สำหรับ Postgres + Auth + RLS)

### ติดตั้ง

```bash
npm install
```

### ตั้งค่า environment

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่าจากโปรเจกต์ Supabase ของตัวเอง:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### รัน migration

รัน migration ทั้งหมดใน `supabase/migrations/` เข้ากับโปรเจกต์ Supabase ผ่าน [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push
```

### รัน dev server

```bash
npm run dev
```

### คำสั่งอื่นๆ

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run build` | type-check (`tsc -b`) แล้ว build production |
| `npm run lint` | รัน Oxlint |
| `npm run preview` | preview production build ในเครื่อง |

## Workflow การพัฒนา

โปรเจกต์นี้พัฒนาแบบ 1 แชต = 1 ฟีเจอร์/โมดูล ตามโปรโตคอลใน [`docs/PROJECT_BIBLE.md`](docs/PROJECT_BIBLE.md) §7-§8:

`freeze spec (ตกลงกัน) → build → UAT (ทดสอบจริง) → ประกาศเวอร์ชัน final → commit + อัปเดต CHANGELOG`

ยังไม่มี automated test suite — ทดสอบด้วย live browser testing (Playwright ชั่วคราว + test user สร้าง/ลบผ่าน Supabase Admin API ทุกรอบ) ตรวจสอบเทียบตัวเลขด้วยมือ/query DB ตรงๆ ก่อนปิดแต่ละฟีเจอร์
