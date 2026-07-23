-- C3: เพิ่ม note ต่อ leg (อธิบาย split line เดี่ยวๆ ในบิลเดียว) + tags/มิติ ผูกกับหัวรายการ (transaction)
alter table transaction_legs add column note text;

-- tags: มิติที่ผู้ใช้ตั้งเอง (เช่น "ทริปเชียงใหม่") ผูกกับหัวรายการ ไม่ใช่ leg
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),

  constraint uq_tags_user_name unique (user_id, name)
);

create index idx_tags_user_id on tags (user_id);

alter table tags enable row level security;

create policy "tags_select_own"
  on tags for select
  to authenticated
  using (auth.uid() = user_id);

create policy "tags_insert_own"
  on tags for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "tags_update_own"
  on tags for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tags_delete_own"
  on tags for delete
  to authenticated
  using (auth.uid() = user_id);

-- transaction_tags: join table หัวรายการ <-> tag
create table transaction_tags (
  transaction_id uuid not null references transactions (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  primary key (transaction_id, tag_id)
);

create index idx_transaction_tags_transaction_id on transaction_tags (transaction_id);
create index idx_transaction_tags_tag_id on transaction_tags (tag_id);

-- กัน user_id ที่ denormalize ไว้ (เพื่อ RLS ไม่ต้อง join) หลุดไม่ตรงกับ transaction/tag ที่แท้จริง
create function enforce_transaction_tag_user_consistency()
returns trigger
language plpgsql
as $$
declare
  txn_user uuid;
  tag_user uuid;
begin
  select user_id into txn_user from transactions where id = new.transaction_id;
  select user_id into tag_user from tags where id = new.tag_id;

  if txn_user is null then
    raise exception 'transaction % not found', new.transaction_id;
  end if;

  if tag_user is null then
    raise exception 'tag % not found', new.tag_id;
  end if;

  if new.user_id <> txn_user or new.user_id <> tag_user then
    raise exception 'transaction_tag user_id must match both the transaction and the tag';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_transaction_tag_user_consistency
  before insert or update on transaction_tags
  for each row
  execute function enforce_transaction_tag_user_consistency();

alter table transaction_tags enable row level security;

create policy "transaction_tags_select_own"
  on transaction_tags for select
  to authenticated
  using (auth.uid() = user_id);

create policy "transaction_tags_insert_own"
  on transaction_tags for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "transaction_tags_delete_own"
  on transaction_tags for delete
  to authenticated
  using (auth.uid() = user_id);
