-- C4 Reports: balance ณ วันที่ในอดีต (v_account_balances/v_balance_sheet เดิมคำนวณปัจจุบันเท่านั้น)
-- ไม่ใช้ security definer เพื่อให้ RLS ของตารางต้นทางมีผลผ่านฟังก์ชันโดยอัตโนมัติ (แบบเดียวกับ views ใน C1)

create function fn_account_balances_as_of(as_of date)
returns table (
  account_id uuid,
  user_id uuid,
  name text,
  type_id text,
  subtype text,
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
    a.opening_balance
      + case
          when at.normal_balance = 'debit' then coalesce(sum(tl.amount) filter (where t.occurred_on <= as_of), 0)
          else -coalesce(sum(tl.amount) filter (where t.occurred_on <= as_of), 0)
        end as balance
  from accounts a
  join account_types at on at.id = a.type_id
  left join transaction_legs tl on tl.account_id = a.id
  left join transactions t on t.id = tl.transaction_id
  group by a.id, a.user_id, a.name, a.type_id, a.subtype, at.normal_balance, a.opening_balance;
$$;

grant execute on function fn_account_balances_as_of(date) to authenticated;

-- แนวโน้ม net worth สิ้นแต่ละเดือนย้อนหลัง month_count เดือน (รวมเดือนปัจจุบัน)
create function fn_net_worth_history(month_count int default 12)
returns table (
  as_of date,
  total_assets bigint,
  total_liabilities bigint,
  net_worth bigint
)
language sql
stable
as $$
  with months as (
    select (date_trunc('month', current_date) - (n || ' months')::interval + interval '1 month' - interval '1 day')::date as month_end
    from generate_series(month_count - 1, 0, -1) as n
  ),
  balances as (
    select
      m.month_end,
      a.type_id,
      a.opening_balance
        + case
            when at.normal_balance = 'debit' then coalesce(sum(tl.amount) filter (where t.occurred_on <= m.month_end), 0)
            else -coalesce(sum(tl.amount) filter (where t.occurred_on <= m.month_end), 0)
          end as balance
    from months m
    cross join accounts a
    join account_types at on at.id = a.type_id
    left join transaction_legs tl on tl.account_id = a.id
    left join transactions t on t.id = tl.transaction_id
    group by m.month_end, a.id, a.type_id, at.normal_balance, a.opening_balance
  )
  select
    month_end,
    sum(case when type_id = 'asset' then balance else 0 end) as total_assets,
    sum(case when type_id = 'liability' then balance else 0 end) as total_liabilities,
    sum(case when type_id = 'asset' then balance else 0 end) - sum(case when type_id = 'liability' then balance else 0 end) as net_worth
  from balances
  group by month_end
  order by month_end;
$$;

grant execute on function fn_net_worth_history(int) to authenticated;
