-- ข้อมูลภาษีต่อผู้ใช้ต่อปีภาษี (1 login = 1 ผู้เสียภาษี ตาม REQUIREMENTS §6) — RLS แยกคนต่อคนตามปกติ

create table tax_returns (
  user_id uuid not null references auth.users (id) on delete cascade,
  tax_year int not null,
  has_spouse_no_income boolean not null default false,
  child_first_count int not null default 0,
  child_subsequent_count int not null default 0,
  parent_count int not null default 0,
  disabled_dependent_count int not null default 0,
  -- ทางเลือกวิธีหักค่าใช้จ่ายต่อประเภทเงินได้ที่เลือกได้ (40(5)/40(6)/40(7)/40(8))
  -- รูปแบบ: { "40(5)": { "method": "flat", "category_key": "house" } } หรือ { "method": "actual", "amount_satang": 12345 }
  expense_method_choices jsonb not null default '{}',
  config_version_id uuid references tax_config_versions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, tax_year),
  constraint chk_tax_returns_counts check (
    child_first_count >= 0 and child_subsequent_count >= 0
    and parent_count >= 0 and parent_count <= 4
    and disabled_dependent_count >= 0
  )
);

create trigger trg_tax_returns_set_updated_at
  before update on tax_returns
  for each row
  execute function set_updated_at();

-- ยอดลดหย่อนจริงที่ผู้ใช้กรอกต่อรายการ (อ้าง tax_deduction_items.key แบบหลวม ไม่ FK ตรง เพราะ key คงที่ข้าม version)
create table tax_return_deductions (
  user_id uuid not null references auth.users (id) on delete cascade,
  tax_year int not null,
  item_key text not null,
  amount_satang bigint not null default 0 check (amount_satang >= 0),

  primary key (user_id, tax_year, item_key)
);

-- log ภาษีหัก ณ ที่จ่ายแต่ละใบ (กรอกมือ — schema transaction เดิมไม่มี field นี้, ดู SPEC-tax.md)
create table tax_withholding_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tax_year int not null,
  source_label text not null,
  amount_satang bigint not null check (amount_satang > 0),
  note text,
  created_at timestamptz not null default now()
);

create index idx_tax_return_deductions_user_year on tax_return_deductions (user_id, tax_year);
create index idx_tax_withholding_entries_user_year on tax_withholding_entries (user_id, tax_year);

alter table tax_returns enable row level security;
alter table tax_return_deductions enable row level security;
alter table tax_withholding_entries enable row level security;

create policy "tax_returns_select_own" on tax_returns for select to authenticated using (auth.uid() = user_id);
create policy "tax_returns_insert_own" on tax_returns for insert to authenticated with check (auth.uid() = user_id);
create policy "tax_returns_update_own" on tax_returns for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tax_returns_delete_own" on tax_returns for delete to authenticated using (auth.uid() = user_id);

create policy "tax_return_deductions_select_own" on tax_return_deductions for select to authenticated using (auth.uid() = user_id);
create policy "tax_return_deductions_insert_own" on tax_return_deductions for insert to authenticated with check (auth.uid() = user_id);
create policy "tax_return_deductions_update_own" on tax_return_deductions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tax_return_deductions_delete_own" on tax_return_deductions for delete to authenticated using (auth.uid() = user_id);

create policy "tax_withholding_entries_select_own" on tax_withholding_entries for select to authenticated using (auth.uid() = user_id);
create policy "tax_withholding_entries_insert_own" on tax_withholding_entries for insert to authenticated with check (auth.uid() = user_id);
create policy "tax_withholding_entries_update_own" on tax_withholding_entries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tax_withholding_entries_delete_own" on tax_withholding_entries for delete to authenticated using (auth.uid() = user_id);
