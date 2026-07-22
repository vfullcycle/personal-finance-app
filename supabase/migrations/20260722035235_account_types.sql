-- account_types: reference table, seed คงที่ 5 ประเภทตาม REQUIREMENTS §3.1
create table account_types (
  id text primary key,
  name_th text not null,
  normal_balance text not null check (normal_balance in ('debit', 'credit'))
);

insert into account_types (id, name_th, normal_balance) values
  ('asset', 'สินทรัพย์', 'debit'),
  ('liability', 'หนี้สิน', 'credit'),
  ('equity', 'ทุน', 'credit'),
  ('income', 'รายได้', 'credit'),
  ('expense', 'ค่าใช้จ่าย', 'debit');

alter table account_types enable row level security;

create policy "account_types_select_all"
  on account_types for select
  to authenticated
  using (true);
