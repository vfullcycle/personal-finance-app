-- C3 M4: รายการประจำ — template ที่ยิงสร้าง transactions/transaction_legs จริงตามรอบ
-- ไม่บังคับ sum(amount)=0 ที่ชั้น DB เพราะเป็นแค่ template (ยังไม่ใช่บัญชีจริง) —
-- รายการที่โพสต์จริงต้องผ่าน transactions/transaction_legs ตามปกติ ซึ่งมี trg_check_transaction_balance บังคับอยู่แล้ว
create table recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flow_type text not null,
  frequency text not null,
  amount_mode text not null,
  auto_post boolean not null default false,
  payee text,
  note text,
  start_date date not null,
  end_date date,
  next_due_date date not null,
  last_posted_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_recurring_flow_type check (flow_type in ('income', 'expense', 'transfer')),
  constraint chk_recurring_frequency check (frequency in ('monthly', 'quarterly', 'semiannual', 'annual')),
  constraint chk_recurring_amount_mode check (amount_mode in ('fixed', 'variable')),
  constraint chk_recurring_dates check (end_date is null or end_date >= start_date),
  -- ยอดผันแปรไม่รู้จำนวนล่วงหน้า จึงห้าม auto-post (ต้องรอผู้ใช้กรอกยอด+ยืนยันเสมอ)
  constraint chk_recurring_auto_post_fixed_only check (not auto_post or amount_mode = 'fixed')
);

create index idx_recurring_transactions_user_id on recurring_transactions (user_id);
create index idx_recurring_transactions_next_due_date on recurring_transactions (next_due_date);

create trigger trg_recurring_transactions_set_updated_at
  before update on recurring_transactions
  for each row
  execute function set_updated_at();

alter table recurring_transactions enable row level security;

create policy "recurring_transactions_select_own"
  on recurring_transactions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "recurring_transactions_insert_own"
  on recurring_transactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "recurring_transactions_update_own"
  on recurring_transactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recurring_transactions_delete_own"
  on recurring_transactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- legs ต้นแบบ: แยก "ทิศทาง" (sign) ออกจาก "จำนวนเงิน" (amount) เพราะยอดผันแปรไม่รู้จำนวนล่วงหน้า
-- แต่ทิศทางเดบิต/เครดิตของแต่ละบัญชีในเทมเพลตคงที่เสมอ ไม่งั้นตอนยืนยันยอดจะไม่รู้ว่าขาไหนบวก/ลบ
-- amount เป็น magnitude (ไม่ signed, บวกเสมอ) เป็น null ได้เฉพาะ amount_mode=variable ของ recurring_transaction แม่
-- ตอนโพสต์จริงเป็น transaction_legs.amount = sign * amount(magnitude ตอนนั้น)
create table recurring_transaction_legs (
  id uuid primary key default gen_random_uuid(),
  recurring_transaction_id uuid not null references recurring_transactions (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  sign smallint not null,
  amount bigint,
  note text,
  created_at timestamptz not null default now(),

  constraint chk_recurring_transaction_legs_sign check (sign in (1, -1)),
  constraint chk_recurring_transaction_legs_amount_positive check (amount is null or amount > 0)
);

create index idx_recurring_transaction_legs_recurring_id on recurring_transaction_legs (recurring_transaction_id);
create index idx_recurring_transaction_legs_account_id on recurring_transaction_legs (account_id);

create function enforce_recurring_leg_consistency()
returns trigger
language plpgsql
as $$
declare
  rec_user uuid;
  rec_mode text;
  acct_user uuid;
begin
  select user_id, amount_mode into rec_user, rec_mode
  from recurring_transactions where id = new.recurring_transaction_id;

  select user_id into acct_user from accounts where id = new.account_id;

  if rec_user is null then
    raise exception 'recurring_transaction % not found', new.recurring_transaction_id;
  end if;

  if acct_user is null then
    raise exception 'account % not found', new.account_id;
  end if;

  if new.user_id <> rec_user or new.user_id <> acct_user then
    raise exception 'recurring_transaction_leg user_id must match both the recurring_transaction and the account';
  end if;

  if rec_mode = 'fixed' and new.amount is null then
    raise exception 'recurring_transaction_leg amount is required when amount_mode = fixed';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_recurring_leg_consistency
  before insert or update on recurring_transaction_legs
  for each row
  execute function enforce_recurring_leg_consistency();

alter table recurring_transaction_legs enable row level security;

create policy "recurring_transaction_legs_select_own"
  on recurring_transaction_legs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "recurring_transaction_legs_insert_own"
  on recurring_transaction_legs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "recurring_transaction_legs_update_own"
  on recurring_transaction_legs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recurring_transaction_legs_delete_own"
  on recurring_transaction_legs for delete
  to authenticated
  using (auth.uid() = user_id);
