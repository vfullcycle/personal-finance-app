-- Thai PIT (M11, C6) — config ภาษีแบบ versioned ตามปีภาษี ห้าม hardcode ตาม REQUIREMENTS §6
-- เป็น shared reference data (เหมือน account_types) ทุกคนอ่านได้ แก้ได้เฉพาะ admin (ดู is_admin())
-- versioning: แก้ตัวเลข = สร้าง version ใหม่ (ไม่ overwrite) — tax_returns.config_version_id (migration ถัดไป) pin ว่าตอนคำนวณใช้ version ไหน

create table tax_config_versions (
  id uuid primary key default gen_random_uuid(),
  tax_year int not null,
  version_no int not null,
  effective_from date not null,
  note text,
  -- เพดานรวมกลุ่มเกษียณ (กบข./PVD/RMF/ประกันบำนาญ/ThaiESG/กอช.) ตาม REQUIREMENTS §6
  retirement_combined_cap_satang bigint not null,
  -- มาตรา 48(2): เงินได้ 40(2)-(8) รวมกัน >= threshold ต้องเทียบวิธี 0.5% ของเงินได้พึงประเมิน, ยกเว้นถ้าภาษีวิธีนี้ <= exempt
  section48_2_threshold_satang bigint not null,
  section48_2_rate_percent numeric not null,
  section48_2_exempt_tax_satang bigint not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),

  constraint uq_tax_config_versions_year_version unique (tax_year, version_no)
);

create index idx_tax_config_versions_tax_year on tax_config_versions (tax_year);

-- bracket ขั้นบันได ต่อ version — min/max เป็นสตางค์, max = null หมายถึงไม่มีเพดานบน (ขั้นสูงสุด)
create table tax_brackets (
  id uuid primary key default gen_random_uuid(),
  config_version_id uuid not null references tax_config_versions (id) on delete cascade,
  seq int not null,
  min_income_satang bigint not null,
  max_income_satang bigint,
  rate_percent numeric not null,

  constraint uq_tax_brackets_version_seq unique (config_version_id, seq)
);

-- หักค่าใช้จ่ายต่อประเภทเงินได้ 40(1)-(8)
-- shared_group: 40(1)+40(2) แชร์เพดานเดียวกัน (รวมกันไม่เกิน cap_satang)
-- uses_category_table: true เฉพาะ 40(5) (ดู tax_rental_expense_rates), alt_rate_percent: ทางเลือกที่ 2 เช่น 40(6) ประกอบโรคศิลปะ 60%
create table tax_expense_rules (
  id uuid primary key default gen_random_uuid(),
  config_version_id uuid not null references tax_config_versions (id) on delete cascade,
  income_type text not null check (income_type in ('40(1)', '40(2)', '40(3)', '40(4)', '40(5)', '40(6)', '40(7)', '40(8)')),
  default_rate_percent numeric not null default 0,
  cap_satang bigint,
  shared_group text,
  allow_actual boolean not null default false,
  alt_rate_percent numeric,
  alt_label text,
  uses_category_table boolean not null default false,

  constraint uq_tax_expense_rules_version_type unique (config_version_id, income_type)
);

-- อัตราเหมาสำหรับเงินได้ค่าเช่า 40(5) แยกตามประเภททรัพย์สิน
create table tax_rental_expense_rates (
  id uuid primary key default gen_random_uuid(),
  config_version_id uuid not null references tax_config_versions (id) on delete cascade,
  category_key text not null,
  label_th text not null,
  rate_percent numeric not null,

  constraint uq_tax_rental_rates_version_key unique (config_version_id, category_key)
);

-- รายการลดหย่อนทั่วไป — generic ทุกประเภท (ส่วนตัว/ครอบครัว/ประกัน-เกษียณ/บริจาค/มาตรการรัฐรายปี)
-- calc_type: fixed (คงที่ทุกคน/ตามเงื่อนไข header) · per_dependent (จำนวนคน x unit_amount) · user_amount (ผู้ใช้กรอกยอดจริง, cap ตาม cap_satang และ/หรือ percent_rate ของเงินได้)
-- retirement_group: true = นับรวมในเพดานรวม 500,000 (retirement_combined_cap_satang)
-- double_amount: true = ยอดที่กรอกคูณ 2 ก่อนเทียบเพดาน (เช่น บริจาคการศึกษา/รพ.รัฐ)
create table tax_deduction_items (
  id uuid primary key default gen_random_uuid(),
  config_version_id uuid not null references tax_config_versions (id) on delete cascade,
  key text not null,
  label_th text not null,
  category text not null check (category in ('personal_family', 'insurance_retirement', 'donation', 'stimulus')),
  calc_type text not null check (calc_type in ('fixed', 'per_dependent', 'user_amount')),
  unit_amount_satang bigint,
  cap_satang bigint,
  percent_rate numeric,
  retirement_group boolean not null default false,
  double_amount boolean not null default false,
  sort_order int not null default 0,
  note text,

  constraint uq_tax_deduction_items_version_key unique (config_version_id, key)
);

-- "config ปัจจุบัน" ต่อปีภาษี = version ล่าสุด (version_no สูงสุด) ของปีนั้น
create view v_tax_config_current as
select distinct on (tax_year) *
from tax_config_versions
order by tax_year, version_no desc;

-- ผู้ใช้คนเดียวที่แก้ config กลางได้ — เช็คจาก username ตรง ๆ (ไม่ทำ role/permission เพิ่มตามที่ตกลงกับวี)
create function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where user_id = auth.uid() and lower(username) = 'admin'
  );
$$;

grant execute on function is_admin() to authenticated;

alter table tax_config_versions enable row level security;
alter table tax_brackets enable row level security;
alter table tax_expense_rules enable row level security;
alter table tax_rental_expense_rates enable row level security;
alter table tax_deduction_items enable row level security;

-- ทุกคน authenticated อ่านได้หมด (เป็น reference data ที่ engine ของทุกคนต้องใช้) แก้ได้เฉพาะ admin
create policy "tax_config_versions_select_all" on tax_config_versions for select to authenticated using (true);
create policy "tax_config_versions_admin_write" on tax_config_versions for insert to authenticated with check (is_admin());
create policy "tax_config_versions_admin_update" on tax_config_versions for update to authenticated using (is_admin()) with check (is_admin());
create policy "tax_config_versions_admin_delete" on tax_config_versions for delete to authenticated using (is_admin());

create policy "tax_brackets_select_all" on tax_brackets for select to authenticated using (true);
create policy "tax_brackets_admin_write" on tax_brackets for insert to authenticated with check (is_admin());
create policy "tax_brackets_admin_update" on tax_brackets for update to authenticated using (is_admin()) with check (is_admin());
create policy "tax_brackets_admin_delete" on tax_brackets for delete to authenticated using (is_admin());

create policy "tax_expense_rules_select_all" on tax_expense_rules for select to authenticated using (true);
create policy "tax_expense_rules_admin_write" on tax_expense_rules for insert to authenticated with check (is_admin());
create policy "tax_expense_rules_admin_update" on tax_expense_rules for update to authenticated using (is_admin()) with check (is_admin());
create policy "tax_expense_rules_admin_delete" on tax_expense_rules for delete to authenticated using (is_admin());

create policy "tax_rental_expense_rates_select_all" on tax_rental_expense_rates for select to authenticated using (true);
create policy "tax_rental_expense_rates_admin_write" on tax_rental_expense_rates for insert to authenticated with check (is_admin());
create policy "tax_rental_expense_rates_admin_update" on tax_rental_expense_rates for update to authenticated using (is_admin()) with check (is_admin());
create policy "tax_rental_expense_rates_admin_delete" on tax_rental_expense_rates for delete to authenticated using (is_admin());

create policy "tax_deduction_items_select_all" on tax_deduction_items for select to authenticated using (true);
create policy "tax_deduction_items_admin_write" on tax_deduction_items for insert to authenticated with check (is_admin());
create policy "tax_deduction_items_admin_update" on tax_deduction_items for update to authenticated using (is_admin()) with check (is_admin());
create policy "tax_deduction_items_admin_delete" on tax_deduction_items for delete to authenticated using (is_admin());
