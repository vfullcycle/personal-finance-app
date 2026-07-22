-- seed หมวดหมู่เริ่มต้น (M1) ให้ user ใหม่ทันทีตอนสมัครสมาชิก
-- ผู้ใช้แก้ไข/archive ได้ทุก field ภายหลัง — นี่คือค่าเริ่มต้นเท่านั้น (REQUIREMENTS §3.5, §8)
create function seed_default_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- รายได้ (income) — 40(1)-(8) เชื่อม Thai PIT engine ใน C6
  insert into accounts (user_id, type_id, name, taxable, income_type) values
    (new.id, 'income', 'เงินเดือน', true, '40(1)'),
    (new.id, 'income', 'รายได้อิสระ/ฟรีแลนซ์', true, '40(2)'),
    (new.id, 'income', 'ดอกเบี้ย/เงินปันผล', true, '40(4)'),
    (new.id, 'income', 'รายได้อื่นๆ', true, '40(8)');

  -- ค่าใช้จ่าย (expense) — ถัง fixed/variable ตาม §3.5 (โครงหมวดหมู่ ไม่ใช่ตัวเลข)
  insert into accounts (user_id, type_id, name, cashflow_class) values
    (new.id, 'expense', 'ที่อยู่อาศัย', 'fixed'),
    (new.id, 'expense', 'ค่าส่วนกลาง', 'fixed'),
    (new.id, 'expense', 'เบี้ยประกัน (รถ/ชีวิต/สุขภาพ/ทรัพย์สิน)', 'fixed'),
    (new.id, 'expense', 'ภาษีทรัพย์สิน (รถ/อสังหา)', 'fixed'),
    (new.id, 'expense', 'ประกันสังคม', 'fixed'),
    (new.id, 'expense', 'ดอกเบี้ยเงินกู้', 'fixed'),
    (new.id, 'expense', 'อาหาร/เครื่องดื่ม', 'variable'),
    (new.id, 'expense', 'สาธารณูปโภค', 'variable'),
    (new.id, 'expense', 'โทรศัพท์/เน็ต', 'variable'),
    (new.id, 'expense', 'เดินทาง (น้ำมัน/ทางด่วน/จอดรถ/ขนส่ง)', 'variable'),
    (new.id, 'expense', 'ดูแลตัวเอง', 'variable'),
    (new.id, 'expense', 'ครอบครัว/บุตร', 'variable'),
    (new.id, 'expense', 'สันทนาการ', 'variable'),
    (new.id, 'expense', 'อื่นๆ', 'variable');

  -- ถังออม (savings) — transfer เข้าสินทรัพย์ ไม่ใช่ expense (§3.5)
  insert into accounts (user_id, type_id, name, subtype, cashflow_class, asset_liquidity, is_invested) values
    (new.id, 'asset', 'เงินสำรองฉุกเฉิน', 'bank', 'savings', 'liquid', false),
    (new.id, 'asset', 'เงินออมเกษียณ', 'investment', 'savings', 'illiquid', true),
    (new.id, 'asset', 'PVD', 'investment', 'savings', 'illiquid', true),
    (new.id, 'asset', 'เงินลงทุน (RMF/SSF/ThaiESG)', 'investment', 'savings', 'marketable', true);

  return new;
end;
$$;

create trigger trg_seed_default_accounts
  after insert on auth.users
  for each row
  execute function seed_default_accounts();
