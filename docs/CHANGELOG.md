# CHANGELOG

รูปแบบ: `## <ฟีเจอร์> vX.Y — <วันที่>` ตามโปรโตคอลใน `PROJECT_BIBLE.md` §7

## Foundation v1.0 — 22 ก.ค. 2569

- Scaffold Vite + React + TypeScript
- Schema แกน double-entry: `account_types`, `accounts`, `transactions`, `transaction_legs`
- Constraint/trigger บังคับผลรวม leg ต่อ transaction = 0 (deferred constraint trigger)
- FK `ON DELETE RESTRICT` ป้องกันการลบ account ที่มี transaction_leg อ้างอิง (ใช้ archive แทน)
- Views คำนวณสด: `v_account_balances`, `v_balance_sheet`, `v_net_worth`
- RLS ต่อผู้ใช้ทุกตารางข้อมูล user (`accounts`, `transactions`, `transaction_legs`), `account_types` เป็น reference table select-only
- Rename `doc/` → `docs/` ให้ตรงกับ `CLAUDE.md` / `PROJECT_BIBLE.md`
- Migration push ขึ้น Supabase project จริงแล้ว, verify โครงสร้าง + RLS + REST connectivity ผ่านหมด (รายละเอียดใน `docs/SPEC-foundation.md`)
