-- shared helper: keep updated_at current
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- accounts: ผังบัญชีต่อผู้ใช้ (หมวด/หมวดย่อย ลึกสุด 2 ชั้น)
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type_id text not null references account_types (id),
  parent_id uuid references accounts (id) on delete restrict,
  name text not null,
  subtype text,
  opening_balance bigint not null default 0,
  credit_limit bigint,
  is_active boolean not null default true,
  archived_at timestamptz,
  taxable boolean not null default false,
  income_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- subtype เป็น enum ปิดตายตัว ผูกกับ type_id: asset -> cash/bank/investment/other_asset, liability -> credit_card/loan
  constraint chk_accounts_subtype check (
    subtype is null
    or (type_id = 'asset' and subtype in ('cash', 'bank', 'investment', 'other_asset'))
    or (type_id = 'liability' and subtype in ('credit_card', 'loan'))
  ),

  -- วงเงินบัตรตั้งได้เฉพาะ subtype = credit_card
  constraint chk_accounts_credit_limit check (
    credit_limit is null or subtype = 'credit_card'
  ),
  constraint chk_accounts_credit_limit_positive check (
    credit_limit is null or credit_limit >= 0
  ),

  -- taxable/income_type ตั้งได้เฉพาะ type_id = income (เชื่อม Thai PIT engine ใน C6)
  constraint chk_accounts_income_fields check (
    type_id = 'income' or (taxable is false and income_type is null)
  ),
  constraint chk_accounts_income_type check (
    income_type is null or income_type in (
      '40(1)', '40(2)', '40(3)', '40(4)', '40(5)', '40(6)', '40(7)', '40(8)'
    )
  )
);

create index idx_accounts_user_id on accounts (user_id);
create index idx_accounts_parent_id on accounts (parent_id);

create trigger trg_accounts_set_updated_at
  before update on accounts
  for each row
  execute function set_updated_at();

-- บังคับลำดับชั้นบัญชีลึกสุด 2 ชั้น (หมวด/หมวดย่อย) + parent ต้องเป็น user/type เดียวกัน
create function enforce_account_hierarchy_depth()
returns trigger
language plpgsql
as $$
declare
  parent_row accounts%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'account cannot be its own parent';
  end if;

  select * into parent_row from accounts where id = new.parent_id;

  if not found then
    raise exception 'parent account % not found', new.parent_id;
  end if;

  if parent_row.parent_id is not null then
    raise exception 'account hierarchy is limited to 2 levels (category/subcategory)';
  end if;

  if parent_row.user_id <> new.user_id then
    raise exception 'parent account must belong to the same user';
  end if;

  if parent_row.type_id <> new.type_id then
    raise exception 'parent account must have the same type_id';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_account_hierarchy_depth
  before insert or update on accounts
  for each row
  execute function enforce_account_hierarchy_depth();

alter table accounts enable row level security;

create policy "accounts_select_own"
  on accounts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "accounts_insert_own"
  on accounts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "accounts_update_own"
  on accounts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "accounts_delete_own"
  on accounts for delete
  to authenticated
  using (auth.uid() = user_id);
