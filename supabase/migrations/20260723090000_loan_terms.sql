-- C3 (ต่อเนื่อง): ตั้งค่าเงินกู้ต่อบัญชี (optional) เพื่อคำนวณแยกเงินต้น/ดอกเบี้ยอัตโนมัติ
-- แทนที่ผู้ใช้ต้องเปิด statement มาคำนวณเองทุกงวด — ดู src/features/accounts/loanAmortization.ts
alter table accounts
  add column loan_original_principal bigint,
  add column loan_annual_rate numeric(6, 3),
  add column loan_term_months integer,
  add column loan_start_date date,
  add column loan_interest_method text;

-- ตั้งได้เฉพาะ subtype = loan (ไม่บังคับกรอก — optional ตามที่ตกลงกับวี)
alter table accounts
  add constraint chk_accounts_loan_fields check (
    subtype = 'loan' or (
      loan_original_principal is null
      and loan_annual_rate is null
      and loan_term_months is null
      and loan_start_date is null
      and loan_interest_method is null
    )
  ),
  add constraint chk_accounts_loan_interest_method check (
    loan_interest_method is null or loan_interest_method in ('flat', 'reducing_balance')
  ),
  add constraint chk_accounts_loan_term_months_positive check (
    loan_term_months is null or loan_term_months > 0
  ),
  add constraint chk_accounts_loan_rate_nonnegative check (
    loan_annual_rate is null or loan_annual_rate >= 0
  ),
  add constraint chk_accounts_loan_principal_positive check (
    loan_original_principal is null or loan_original_principal > 0
  );
