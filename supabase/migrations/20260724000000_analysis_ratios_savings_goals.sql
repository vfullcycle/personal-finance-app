-- C5 Analysis: ratios + decision tools + savings goals
-- REQUIREMENTS v1.4 §7 (M8)

-- ขยาย fn_account_balances_as_of ให้คืน field ที่ ratio กลุ่มสภาพคล่อง/หนี้สิน/ออมต้องใช้
-- (asset_liquidity/is_invested ของ asset, term/is_mortgage ของ liability) — เดิม (C4) คืนแค่ account_id/name/type_id/subtype/balance
-- ต้อง drop ก่อนเพราะเปลี่ยน return signature, CREATE OR REPLACE ทำไม่ได้เมื่อคอลัมน์เปลี่ยน
drop function fn_account_balances_as_of(date);

create function fn_account_balances_as_of(as_of date)
returns table (
  account_id uuid,
  user_id uuid,
  name text,
  type_id text,
  subtype text,
  asset_liquidity text,
  is_invested boolean,
  term text,
  is_mortgage boolean,
  balance bigint
)
language sql
stable
as $$
  select
    a.id as account_id,
    a.user_id,
    a.name,
    a.type_id,
    a.subtype,
    a.asset_liquidity,
    a.is_invested,
    a.term,
    a.is_mortgage,
    a.opening_balance
      + case
          when at.normal_balance = 'debit' then coalesce(sum(tl.amount) filter (where t.occurred_on <= as_of), 0)
          else -coalesce(sum(tl.amount) filter (where t.occurred_on <= as_of), 0)
        end as balance
  from accounts a
  join account_types at on at.id = a.type_id
  left join transaction_legs tl on tl.account_id = a.id
  left join transactions t on t.id = tl.transaction_id
  group by a.id, a.user_id, a.name, a.type_id, a.subtype, a.asset_liquidity, a.is_invested, a.term, a.is_mortgage, at.normal_balance, a.opening_balance;
$$;

grant execute on function fn_account_balances_as_of(date) to authenticated;

-- เป้าหมายการออม (M8) — ผูกกับบัญชีสินทรัพย์ที่มีอยู่จริงแทนการเก็บ "ออมแล้วเท่าไหร่" แยกต่างหาก
-- (ยอดคงเหลือบัญชีคือของจริงอยู่แล้ว กันข้อมูลสองชุดไม่ตรงกัน) ลบได้ตรงๆ ไม่ archive เพราะไม่ใช่ ledger record
create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete restrict,
  name text not null,
  target_amount bigint not null,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_savings_goals_target_amount_positive check (target_amount > 0)
);

create index idx_savings_goals_user_id on savings_goals (user_id);
create index idx_savings_goals_account_id on savings_goals (account_id);

create trigger trg_savings_goals_set_updated_at
  before update on savings_goals
  for each row
  execute function set_updated_at();

-- บังคับว่าบัญชีที่ผูกต้องเป็นของ user เดียวกัน + ต้องเป็น asset (เป้าหมายออมนับจากยอดสินทรัพย์)
create function enforce_savings_goal_account_consistency()
returns trigger
language plpgsql
as $$
declare
  acct_user uuid;
  acct_type text;
begin
  select user_id, type_id into acct_user, acct_type from accounts where id = new.account_id;

  if acct_user is null then
    raise exception 'account % not found', new.account_id;
  end if;

  if acct_user <> new.user_id then
    raise exception 'savings_goal user_id must match account owner';
  end if;

  if acct_type <> 'asset' then
    raise exception 'savings_goal account_id must reference an asset account';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_savings_goal_account_consistency
  before insert or update on savings_goals
  for each row
  execute function enforce_savings_goal_account_consistency();

alter table savings_goals enable row level security;

create policy "savings_goals_select_own"
  on savings_goals for select
  to authenticated
  using (auth.uid() = user_id);

create policy "savings_goals_insert_own"
  on savings_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "savings_goals_update_own"
  on savings_goals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "savings_goals_delete_own"
  on savings_goals for delete
  to authenticated
  using (auth.uid() = user_id);
