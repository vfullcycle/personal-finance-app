-- C7 ช่วง 1: Budget 2 ชั้น (M7) — ชั้น A งบประจำ (baseline) + ชั้น B แผนกำหนดการ (schedule/CF matrix)
-- REQUIREMENTS v1.4 §5.1

-- ชั้น A — งบประจำ: รายการสม่ำเสมอ ไม่มีปีเริ่ม-จบ (ใช้ตลอดช่วง projection) ขับด้วยจำนวน/เดือนหรือ/ปี + growth%/ปี
-- ทิศทาง (รับเข้า/จ่ายออก/โยกเข้าสินทรัพย์) ไม่เก็บเป็น field แยก — derive จาก account.type_id ตอนคำนวณ
-- (income→รับเข้า, expense→จ่ายออก, asset cashflow_class=savings→โยกเข้าสินทรัพย์) เพราะเลือกหมวดแล้วไม่กำกวม
create table budget_baseline_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete restrict,
  amount_per_period_satang bigint not null,
  period text not null,
  growth_percent_per_year numeric(6, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_budget_baseline_amount_positive check (amount_per_period_satang > 0),
  constraint chk_budget_baseline_period check (period in ('month', 'year'))
);

create index idx_budget_baseline_items_user_id on budget_baseline_items (user_id);
create index idx_budget_baseline_items_account_id on budget_baseline_items (account_id);

create trigger trg_budget_baseline_items_set_updated_at
  before update on budget_baseline_items
  for each row
  execute function set_updated_at();

-- บังคับว่าบัญชีที่ผูกต้องเป็นของ user เดียวกัน + ต้องเป็น income/expense หรือ asset ที่ cashflow_class=savings เท่านั้น
-- (หนี้สินที่มีกำหนดระยะเวลาไปอยู่ชั้น B แทน — ชั้น A มีไว้สำหรับรายการที่ไม่มีวันสิ้นสุดชัดเจน)
create function enforce_budget_baseline_account_consistency()
returns trigger
language plpgsql
as $$
declare
  acct_user uuid;
  acct_type text;
  acct_cashflow_class text;
begin
  select user_id, type_id, cashflow_class into acct_user, acct_type, acct_cashflow_class from accounts where id = new.account_id;

  if acct_user is null then
    raise exception 'account % not found', new.account_id;
  end if;

  if acct_user <> new.user_id then
    raise exception 'budget_baseline_item user_id must match account owner';
  end if;

  if acct_type not in ('income', 'expense') and not (acct_type = 'asset' and acct_cashflow_class = 'savings') then
    raise exception 'budget_baseline_item account_id must reference income, expense, or a savings-class asset account';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_budget_baseline_account_consistency
  before insert or update on budget_baseline_items
  for each row
  execute function enforce_budget_baseline_account_consistency();

alter table budget_baseline_items enable row level security;

create policy "budget_baseline_items_select_own"
  on budget_baseline_items for select
  to authenticated
  using (auth.uid() = user_id);

create policy "budget_baseline_items_insert_own"
  on budget_baseline_items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "budget_baseline_items_update_own"
  on budget_baseline_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "budget_baseline_items_delete_own"
  on budget_baseline_items for delete
  to authenticated
  using (auth.uid() = user_id);

-- ชั้น B — แผนกำหนดการ: รายการผูกช่วงปีเฉพาะ (พ.ศ.) ต่างจากชั้น A ตรงที่มี "ทิศทาง" เป็น field จริง
-- (ช่วย UX: เลือกทิศทางก่อน → กรองหมวดให้ตรง type) และมีปีเริ่ม-จบ + ความถี่ 5 แบบ (รวม "ครั้งเดียว")
-- หนี้ที่ตั้งค่าเงินกู้ครบแล้ว (loan_terms, C3) ไม่ต้องกรอกซ้ำที่นี่ — projection (ช่วง 2) จะดึง amortization
-- schedule มาใช้อัตโนมัติ จึงไม่มีตัวเลือก liability ในฟอร์มเลย (บังคับด้วย constraint ด้านล่างผ่าน direction/account_type)
create table budget_schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  account_id uuid not null references accounts (id) on delete restrict,
  direction text not null,
  frequency text not null,
  year_start integer not null,
  year_end integer not null,
  amount_per_occurrence_satang bigint not null,
  growth_percent_per_year numeric(6, 2) not null default 0,
  start_month integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_budget_schedule_amount_positive check (amount_per_occurrence_satang > 0),
  constraint chk_budget_schedule_direction check (direction in ('outflow', 'inflow', 'transfer_to_asset')),
  constraint chk_budget_schedule_frequency check (frequency in ('monthly', 'quarterly', 'semiannual', 'annual', 'onetime')),
  constraint chk_budget_schedule_year_range check (year_end >= year_start),
  constraint chk_budget_schedule_onetime_single_year check (frequency <> 'onetime' or year_end = year_start),
  constraint chk_budget_schedule_start_month check (start_month is null or (start_month between 1 and 12))
);

create index idx_budget_schedule_items_user_id on budget_schedule_items (user_id);
create index idx_budget_schedule_items_account_id on budget_schedule_items (account_id);

create trigger trg_budget_schedule_items_set_updated_at
  before update on budget_schedule_items
  for each row
  execute function set_updated_at();

-- บังคับว่าบัญชีที่ผูกต้องเป็นของ user เดียวกัน + type ต้องตรงกับ direction เสมอ
-- (outflow→expense, inflow→income, transfer_to_asset→asset) กัน UI/ผู้ใช้ผูกผิดชนิดจาก client ตรงๆ
create function enforce_budget_schedule_account_consistency()
returns trigger
language plpgsql
as $$
declare
  acct_user uuid;
  acct_type text;
  expected_type text;
begin
  select user_id, type_id into acct_user, acct_type from accounts where id = new.account_id;

  if acct_user is null then
    raise exception 'account % not found', new.account_id;
  end if;

  if acct_user <> new.user_id then
    raise exception 'budget_schedule_item user_id must match account owner';
  end if;

  expected_type := case new.direction
    when 'outflow' then 'expense'
    when 'inflow' then 'income'
    when 'transfer_to_asset' then 'asset'
  end;

  if acct_type <> expected_type then
    raise exception 'budget_schedule_item direction % requires account_id to reference a % account (got %)', new.direction, expected_type, acct_type;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_budget_schedule_account_consistency
  before insert or update on budget_schedule_items
  for each row
  execute function enforce_budget_schedule_account_consistency();

alter table budget_schedule_items enable row level security;

create policy "budget_schedule_items_select_own"
  on budget_schedule_items for select
  to authenticated
  using (auth.uid() = user_id);

create policy "budget_schedule_items_insert_own"
  on budget_schedule_items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "budget_schedule_items_update_own"
  on budget_schedule_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "budget_schedule_items_delete_own"
  on budget_schedule_items for delete
  to authenticated
  using (auth.uid() = user_id);
