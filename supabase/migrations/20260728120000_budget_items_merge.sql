-- C7 ช่วง 2 (ทบทวนกลางแชต): รวมชั้น A (budget_baseline_items) + ชั้น B (budget_schedule_items) เป็นตารางเดียว
-- เหตุผล: ชั้น B ครอบคลุมทุกอย่างที่ชั้น A ทำได้อยู่แล้ว (ชั้น A = ชั้น B ที่ end_date ไม่มีกำหนด + ทิศทาง derive อัตโนมัติ)
-- การแยกสร้างความกำกวม ("ต่อปี" ของชั้น A หมายถึงเฉลี่ยเรียบ ต่างจากชั้น B ที่ลงก้อนเดียว) และคำถามว่ารายการควรอยู่ชั้นไหน
-- โดยไม่ได้ลดความซับซ้อนของฟอร์มลงจริงตามที่ตั้งใจไว้ตอน freeze ครั้งแรก — ตกลงรวมระหว่างแชตหลัง UAT ช่วง 2
--
-- เปลี่ยนจาก year_start/year_end (พ.ศ. หยาบระดับปี) เป็น start_date/end_date (วันที่ละเอียดระดับเดือน) รวมถึงยกเลิก
-- concept "period: month|year แบบเฉลี่ยเรียบ" ของชั้น A เดิมทั้งหมด — amount_per_occurrence_satang หมายถึงยอดต่อครั้งเสมอ
-- (ถ้าอยากได้ยอดสม่ำเสมอทุกเดือนใช้ frequency=monthly ตรงๆ ไม่ต้องหาร 12 อีกต่อไป) เดือนเริ่มงวดของความถี่ตาม/6/12 เดือน
-- อ่านจาก "เดือน" ของ start_date ตรงๆ ไม่ต้องมีฟิลด์ start_month แยกอีกต่อไป
create table budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  account_id uuid not null references accounts (id) on delete restrict,
  direction text not null,
  frequency text not null,
  start_date date not null,
  end_date date,
  amount_per_occurrence_satang bigint not null,
  growth_percent_per_year numeric(6, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_budget_items_amount_positive check (amount_per_occurrence_satang > 0),
  constraint chk_budget_items_direction check (direction in ('outflow', 'inflow', 'transfer_to_asset')),
  constraint chk_budget_items_frequency check (frequency in ('monthly', 'quarterly', 'semiannual', 'annual', 'onetime')),
  constraint chk_budget_items_end_after_start check (end_date is null or end_date >= start_date)
);

create index idx_budget_items_user_id on budget_items (user_id);
create index idx_budget_items_account_id on budget_items (account_id);

create trigger trg_budget_items_set_updated_at
  before update on budget_items
  for each row
  execute function set_updated_at();

-- บังคับว่าบัญชีที่ผูกต้องเป็นของ user เดียวกัน + type ต้องตรงกับ direction เสมอ (outflow→expense, inflow→income, transfer_to_asset→asset)
-- ไม่บังคับ cashflow_class=savings สำหรับ transfer_to_asset อีกต่อไป (เดิมชั้น A บังคับ, ชั้น B ไม่บังคับ — รวมแล้วเลือกใช้กฎที่กว้างกว่า
-- ของชั้น B เพราะยืดหยุ่นกว่าและไม่เสียอะไร ผู้ใช้เลือกบัญชีสินทรัพย์ปลายทางเองได้ตรงตามจริง)
create function enforce_budget_items_account_consistency()
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
    raise exception 'budget_item user_id must match account owner';
  end if;

  expected_type := case new.direction
    when 'outflow' then 'expense'
    when 'inflow' then 'income'
    when 'transfer_to_asset' then 'asset'
  end;

  if acct_type <> expected_type then
    raise exception 'budget_item direction % requires account_id to reference a % account (got %)', new.direction, expected_type, acct_type;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_budget_items_account_consistency
  before insert or update on budget_items
  for each row
  execute function enforce_budget_items_account_consistency();

alter table budget_items enable row level security;

create policy "budget_items_select_own" on budget_items for select to authenticated using (auth.uid() = user_id);
create policy "budget_items_insert_own" on budget_items for insert to authenticated with check (auth.uid() = user_id);
create policy "budget_items_update_own" on budget_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budget_items_delete_own" on budget_items for delete to authenticated using (auth.uid() = user_id);

-- ย้ายข้อมูลจากชั้น A เดิม — ทิศทาง derive จาก account type ครั้งเดียวตอน migrate, period='year' แปลงเป็นยอด/12
-- แล้วตั้ง frequency=monthly เสมอ (รักษาพฤติกรรม "เฉลี่ยเรียบ" เดิมไว้เป็นค่าคงที่ต่อเดือน กันข้อมูลจริงของผู้ใช้กระโดดเป็นก้อนก้อนเดียวโดยไม่ตั้งใจ)
-- start_date เดิมไม่มี (null) → ใช้วันที่ไกลในอดีตแทน "ไม่มีกำหนดเริ่ม" (ทำงานเหมือน "active เสมอ" กับ projection ในอนาคตทุกกรณี)
insert into budget_items (user_id, name, account_id, direction, frequency, start_date, end_date, amount_per_occurrence_satang, growth_percent_per_year, is_active, created_at, updated_at)
select
  b.user_id,
  null,
  b.account_id,
  case a.type_id when 'income' then 'inflow' when 'expense' then 'outflow' else 'transfer_to_asset' end,
  'monthly',
  coalesce(b.start_date, date '2000-01-01'),
  null,
  case when b.period = 'year' then round(b.amount_per_period_satang / 12.0) else b.amount_per_period_satang end,
  b.growth_percent_per_year,
  b.is_active,
  b.created_at,
  b.updated_at
from budget_baseline_items b
join accounts a on a.id = b.account_id;

-- ย้ายข้อมูลจากชั้น B เดิม — year_start/start_month ประกอบเป็น start_date (แปลง พ.ศ.→ค.ศ.), year_end ประกอบเป็น end_date
-- (วันสุดท้ายของปีนั้น) ยกเว้น onetime ที่ไม่ต้องมี end_date (occurrence เช็คแค่เดือน/ปีเริ่มตรงกันพอ)
insert into budget_items (user_id, name, account_id, direction, frequency, start_date, end_date, amount_per_occurrence_satang, growth_percent_per_year, is_active, created_at, updated_at)
select
  s.user_id,
  s.name,
  s.account_id,
  s.direction,
  s.frequency,
  make_date(s.year_start - 543, coalesce(s.start_month, 1), 1),
  case when s.frequency = 'onetime' then null else make_date(s.year_end - 543, 12, 31) end,
  s.amount_per_occurrence_satang,
  s.growth_percent_per_year,
  true,
  s.created_at,
  s.updated_at
from budget_schedule_items s;

drop table budget_baseline_items;
drop table budget_schedule_items;
drop function enforce_budget_baseline_account_consistency();
drop function enforce_budget_schedule_account_consistency();
