-- เพิ่ม field วางแผนการเงินลง accounts (additive, ไม่กระทบข้อมูลเดิม)
-- ตาม REQUIREMENTS v1.3 §3.2, §3.5, §7
alter table accounts
  add column cashflow_class text,
  add column asset_liquidity text,
  add column is_invested boolean not null default false,
  add column term text,
  add column is_mortgage boolean not null default false;

-- cashflow_class: fixed/variable ติดกับ expense, savings ติดกับ asset เท่านั้น (กัน net worth เพี้ยนตาม §3.5)
alter table accounts
  add constraint chk_accounts_cashflow_class check (
    cashflow_class is null or cashflow_class in ('fixed', 'variable', 'savings')
  ),
  add constraint chk_accounts_cashflow_class_type check (
    cashflow_class is null or type_id in ('expense', 'asset')
  ),
  add constraint chk_accounts_cashflow_class_savings_asset check (
    cashflow_class <> 'savings' or type_id = 'asset'
  );

-- asset_liquidity / is_invested ตั้งได้เฉพาะ type_id = asset (ป้อน ratio §7)
alter table accounts
  add constraint chk_accounts_asset_liquidity check (
    asset_liquidity is null or asset_liquidity in ('liquid', 'marketable', 'illiquid')
  ),
  add constraint chk_accounts_asset_fields check (
    type_id = 'asset' or (asset_liquidity is null and is_invested is false)
  );

-- term / is_mortgage ตั้งได้เฉพาะ type_id = liability (ป้อน ratio §7)
alter table accounts
  add constraint chk_accounts_term check (
    term is null or term in ('current', 'long_term')
  ),
  add constraint chk_accounts_liability_fields check (
    type_id = 'liability' or (term is null and is_mortgage is false)
  );
