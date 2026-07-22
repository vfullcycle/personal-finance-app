-- transactions: หัวรายการ
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  payee text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_user_id on transactions (user_id);
create index idx_transactions_occurred_on on transactions (occurred_on);

create trigger trg_transactions_set_updated_at
  before update on transactions
  for each row
  execute function set_updated_at();

alter table transactions enable row level security;

create policy "transactions_select_own"
  on transactions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on transactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on transactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions_delete_own"
  on transactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- transaction_legs: ขาเดบิต/เครดิต, amount เป็นสตางค์ signed (บวก=เดบิต, ลบ=เครดิต)
create table transaction_legs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount bigint not null check (amount <> 0),
  created_at timestamptz not null default now()
);

create index idx_transaction_legs_transaction_id on transaction_legs (transaction_id);
create index idx_transaction_legs_account_id on transaction_legs (account_id);
create index idx_transaction_legs_user_id on transaction_legs (user_id);

-- กัน user_id ที่ denormalize ไว้ (เพื่อ RLS ไม่ต้อง join) หลุดไม่ตรงกับ transaction/account ที่แท้จริง
create function enforce_leg_user_consistency()
returns trigger
language plpgsql
as $$
declare
  txn_user uuid;
  acct_user uuid;
begin
  select user_id into txn_user from transactions where id = new.transaction_id;
  select user_id into acct_user from accounts where id = new.account_id;

  if txn_user is null then
    raise exception 'transaction % not found', new.transaction_id;
  end if;

  if acct_user is null then
    raise exception 'account % not found', new.account_id;
  end if;

  if new.user_id <> txn_user or new.user_id <> acct_user then
    raise exception 'transaction_leg user_id must match both the parent transaction and the account';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_leg_user_consistency
  before insert or update on transaction_legs
  for each row
  execute function enforce_leg_user_consistency();

alter table transaction_legs enable row level security;

create policy "transaction_legs_select_own"
  on transaction_legs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "transaction_legs_insert_own"
  on transaction_legs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "transaction_legs_update_own"
  on transaction_legs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transaction_legs_delete_own"
  on transaction_legs for delete
  to authenticated
  using (auth.uid() = user_id);
