# SPEC — Auth + COA + Accounts (C2)

> Frozen: 23 ก.ค. 2569 — อ้างอิง `REQUIREMENTS.md` v1.3 §3.2, §3.5, §7, §8.1, M1/M2/M12
> พึ่งพา C1 (`SPEC-foundation.md`) — schema `accounts`/`account_types`/`transactions`/`transaction_legs`

## ขอบเขต
1. Supabase Auth: สมัคร/เข้าสู่ระบบ/ลืมรหัสผ่าน **ด้วย username** (ไม่ใช่อีเมล)
2. Chart of Accounts (M1): หน้า `/categories` จัดการหมวดรายได้/ค่าใช้จ่าย/ทุน + seed ค่าเริ่มต้น
3. Accounts (M2): หน้า `/accounts` จัดการบัญชีสินทรัพย์/หนี้สิน + ยอดคงเหลือจาก `v_account_balances`
4. PWA scaffold (vite-plugin-pwa, ไอคอนจาก `public/app-icon.svg`)

## Auth: username แทนอีเมล (ตกลงกับวีระหว่าง build)

Supabase Auth ผูกกับอีเมลโดยธรรมชาติ ไม่มี username ในตัว จึงใช้กลไก **email plus-addressing**:

- ตอนสมัคร: กรอก `username` + `recovery_email` (อีเมลจริงสำหรับกู้คืนเท่านั้น ไม่ใช้ login)
- ระบบสร้าง `login_email` = `<local ก่อน +>+<username>@<domain ของ recovery_email>` เช่น `wee@gmail.com` + username `wee123` → `wee+wee123@gmail.com`
- `auth.users.email` เก็บ `login_email` นี้ — Gmail/Outlook/iCloud ส่งอีเมลที่มี `+tag` เข้ากล่องจดหมายเดิมอัตโนมัติ จึงใช้ mailer/confirm/reset ของ Supabase เดิมได้ทั้งหมด **ไม่ต้องมี Edge Function หรือบริการส่งอีเมลภายนอก**
- ตาราง `profiles` (`user_id` PK→auth.users, `username` unique ไม่แยกตัวพิมพ์เล็ก/ใหญ่, `login_email`, `recovery_email`) เก็บ mapping
- RPC สาธารณะ (security definer, callable โดย anon): `is_username_available(username)`, `get_login_email(username)` — ใช้ resolve username → email ก่อน `signInWithPassword`/`resetPasswordForEmail`

**Trade-off ที่ตกลงกับวี:** คนที่เดา username ถูกจะเห็นโครงสร้างอีเมลจริงบางส่วนได้ผ่าน `get_login_email` (เช่น รู้ domain) แลกกับความง่าย ไม่ต้องมี Edge Function/external email API — ยอมรับได้เพราะแอปนี้ไม่ได้เปิดให้สมัครสาธารณะวงกว้าง

**Trigger `create_profile_from_signup()`** (บน `auth.users` AFTER INSERT) อ่าน `username`/`recovery_email` จาก `raw_user_meta_data` ที่ client ส่งผ่าน `signUp({ options: { data: {...} } })` — **ถ้าไม่มี metadata ครบ (เช่น สร้าง user ตรงจาก Supabase Dashboard) จะข้ามการสร้าง profile แทนที่จะทำให้ทั้ง insert ล้มเหลว** (แก้บั๊กที่เจอตอน UAT — ดู CHANGELOG)

**Rate limit อีเมล:** โปรเจกต์ยังใช้ mailer เริ่มต้นของ Supabase (2 อีเมล/ชม., ปรับไม่ได้จนกว่าจะตั้ง custom SMTP) — พอเพียงสำหรับพัฒนา/ทดสอบเบา ๆ แต่ก่อนเปิดใช้จริงกับผู้ใช้หลายคนควรตั้ง custom SMTP (เช่น Resend) ก่อน

## Chart of Accounts (M1) + Accounts (M2)

ใช้ตาราง `accounts` เดียวกันกับ C1 ทั้งสองฟีเจอร์ (ตามที่ schema ออกแบบไว้) แยกด้วย `type_id`:
- `/categories`: กรอง `type_id in (income, expense, equity)`, จัดการลำดับชั้น 2 ชั้นจริง (หมวด/หมวดย่อย)
- `/accounts`: กรอง `type_id in (asset, liability)`, ไม่ใช้ parent hierarchy (flat ตาม subtype)

### Field เพิ่มจาก C1 (migration `account_planning_fields`, additive, ตาม REQUIREMENTS §3.2/§3.5/§7)
| field | type | ใช้กับ | ความหมาย |
|---|---|---|---|
| `cashflow_class` | text: fixed/variable/savings | expense, asset | ถัง 3 ประเภทตาม §3.5 — `savings` ตั้งได้เฉพาะ asset (constraint บังคับ) |
| `asset_liquidity` | text: liquid/marketable/illiquid | asset | ป้อน ratio สภาพคล่อง §7 |
| `is_invested` | boolean | asset | ป้อน ratio เงินลงทุน §7 |
| `term` | text: current/long_term | liability | ป้อน DSR/หนี้ระยะสั้น §7 |
| `is_mortgage` | boolean | liability | ป้อน Non-Mortgage DSR §7 |

ทุก field แก้ไขได้ภายหลังผ่านฟอร์ม (progressive disclosure ใต้ "ตัวเลือกเพิ่มเติม") — ค่าที่ seed ให้เป็นค่าเริ่มต้นเท่านั้น

### Seed อัตโนมัติตอนสมัคร (trigger `seed_default_accounts`)
- รายได้ 4: เงินเดือน(40(1)), รายได้อิสระ/ฟรีแลนซ์(40(2)), ดอกเบี้ย/เงินปันผล(40(4)), รายได้อื่นๆ(40(8))
- ค่าใช้จ่าย 14: ตาม taxonomy REQUIREMENTS §3.5 (fixed 6 + variable 7 + "อื่นๆ" เพิ่มเติมนอก spec 1 หมวด เป็น fallback)
- ถังออม (asset, `cashflow_class=savings`) 4: เงินสำรองฉุกเฉิน(bank/liquid), เงินออมเกษียณ(investment/illiquid/invested), PVD(investment/illiquid/invested), เงินลงทุน RMF/SSF/ThaiESG(investment/marketable/invested)
- ไม่ seed บัญชีสินทรัพย์/หนี้สินอื่น (เงินสด/ธนาคาร/บัตร/เงินกู้จริง) เพราะเฉพาะบุคคล — ผู้ใช้เพิ่มเองใน `/accounts`
- Default field ตอนผู้ใช้เพิ่มบัญชีเอง (pre-fill ในฟอร์ม ตาม subtype ที่เลือก แก้ได้): เงินสด/ธนาคาร→liquid+ไม่ลงทุน, เงินลงทุน→marketable+ลงทุน, สินทรัพย์อื่น→illiquid+ไม่ลงทุน, บัตรเครดิต→ระยะสั้น, เงินกู้→ระยะยาว

## Routes
`/signup` `/login` `/forgot-password` `/reset-password` `/check-email` (public) ·
`/accounts` `/settings` (protected, ใน `AppShell`: bottom nav มือถือ / sidebar desktop ตาม REQUIREMENTS §8.1)

**อัปเดตหลัง freeze (24 ก.ค. 2569, ดู `SPEC-tags.md`):** `/categories` ย้ายเข้าไปเป็น tab ใน `/settings` แทน (route เดิม redirect อัตโนมัติ) — `/settings` จึงไม่ใช่หน้าเดียวอีกต่อไป แต่เป็น tab: โปรไฟล์ / หมวดหมู่ / แท็ก-มิติ

## Non-goals ของ C2
- Transactions/recurring (C3)
- Edit username/recovery_email ในหน้า settings (ทำได้แค่ดู + เปลี่ยนรหัสผ่าน — เลื่อนถ้าจำเป็นไปแชตถัดไปที่เกี่ยวข้อง)
- Custom SMTP (แนะนำให้วีตั้งเองก่อน production แต่ไม่บล็อก C2)
