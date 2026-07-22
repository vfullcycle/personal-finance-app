-- views คำนวณสด ตาม REQUIREMENTS §3.3 (ไม่เก็บซ้ำ)
-- ไม่ใช้ security definer เพื่อให้ RLS ของตารางต้นทางมีผลผ่าน view โดยอัตโนมัติ

create view v_account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.type_id,
  at.normal_balance,
  a.opening_balance
    + case
        when at.normal_balance = 'debit' then coalesce(sum(tl.amount), 0)
        else -coalesce(sum(tl.amount), 0)
      end as balance
from accounts a
join account_types at on at.id = a.type_id
left join transaction_legs tl on tl.account_id = a.id
group by a.id, a.user_id, a.name, a.type_id, at.normal_balance, a.opening_balance;

create view v_balance_sheet as
select
  user_id,
  type_id,
  sum(balance) as total
from v_account_balances
where type_id in ('asset', 'liability', 'equity')
group by user_id, type_id;

create view v_net_worth as
select
  user_id,
  sum(case when type_id = 'asset' then total else 0 end)
    - sum(case when type_id = 'liability' then total else 0 end) as net_worth
from v_balance_sheet
group by user_id;
