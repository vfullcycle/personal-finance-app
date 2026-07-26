-- Seed config เริ่มต้น ปีภาษี 2568 (สำหรับดูย้อนหลัง/อ้างอิง) และ 2569 (ปีที่ ledger กำลังสะสมอยู่)
-- ตัวเลขอ้างอิงจาก search ระหว่าง scope C6 (กรมสรรพากร + แหล่งรอง) — ดู docs/SPEC-tax.md §ที่มาตัวเลข
-- แก้ไข/เพิ่มปีถัดไปทำผ่านหน้า "ตั้งค่าภาษี" ในแอป (admin เท่านั้น) ไม่ต้องเพิ่ม migration ใหม่

do $$
declare
  v_2568 uuid;
  v_2569 uuid;
begin
  insert into tax_config_versions (
    tax_year, version_no, effective_from, note,
    retirement_combined_cap_satang, section48_2_threshold_satang, section48_2_rate_percent, section48_2_exempt_tax_satang
  ) values (
    2568, 1, '2025-01-01',
    'Seed เริ่มต้นจาก C6 — bracket คงที่ตั้งแต่ปี 2560, ค่าลดหย่อนตามประกาศปี 2568 (รวม Easy E-Receipt รอบ ม.ค.-ก.พ. 2568)',
    50000000, 6000000, 0.5, 500000
  ) returning id into v_2568;

  insert into tax_config_versions (
    tax_year, version_no, effective_from, note,
    retirement_combined_cap_satang, section48_2_threshold_satang, section48_2_rate_percent, section48_2_exempt_tax_satang
  ) values (
    2569, 1, '2026-01-01',
    'Seed เริ่มต้นจาก C6 — เพดานประกันสังคมปรับใหม่เป็น 10,500/ปี ตามฐานค่าจ้าง 17,500/เดือน มีผล 1 ม.ค. 2569 (เฟส 1/3) ยังไม่มีข้อมูลยืนยันมาตรการกระตุ้นเศรษฐกิจปีนี้ — เพิ่มเองภายหลังผ่านหน้าตั้งค่าภาษี',
    50000000, 6000000, 0.5, 500000
  ) returning id into v_2569;

  -- ===== Bracket ขั้นบันได (คงที่ทั้ง 2 ปี ตั้งแต่ปีภาษี 2560) =====
  insert into tax_brackets (config_version_id, seq, min_income_satang, max_income_satang, rate_percent)
  select v.id, b.seq, b.min_satang, b.max_satang, b.rate
  from (values (v_2568), (v_2569)) as v(id)
  cross join (values
    (1, 0::bigint, 15000000::bigint, 0::numeric),
    (2, 15000000::bigint, 30000000::bigint, 5::numeric),
    (3, 30000000::bigint, 50000000::bigint, 10::numeric),
    (4, 50000000::bigint, 75000000::bigint, 15::numeric),
    (5, 75000000::bigint, 100000000::bigint, 20::numeric),
    (6, 100000000::bigint, 200000000::bigint, 25::numeric),
    (7, 200000000::bigint, 500000000::bigint, 30::numeric),
    (8, 500000000::bigint, null::bigint, 35::numeric)
  ) as b(seq, min_satang, max_satang, rate);

  -- ===== หักค่าใช้จ่ายตามประเภทเงินได้ (คงที่ทั้ง 2 ปี) =====
  insert into tax_expense_rules (config_version_id, income_type, default_rate_percent, cap_satang, shared_group, allow_actual, alt_rate_percent, alt_label, uses_category_table)
  select v.id, r.income_type, r.default_rate, r.cap_satang, r.shared_group, r.allow_actual, r.alt_rate, r.alt_label, r.uses_cat
  from (values (v_2568), (v_2569)) as v(id)
  cross join (values
    ('40(1)', 50::numeric, 10000000::bigint, 'salary_freelance', false, null::numeric, null::text, false),
    ('40(2)', 50::numeric, 10000000::bigint, 'salary_freelance', false, null::numeric, null::text, false),
    ('40(3)', 50::numeric, 10000000::bigint, null::text, false, null::numeric, null::text, false),
    ('40(4)', 0::numeric, 0::bigint, null::text, false, null::numeric, null::text, false),
    ('40(5)', 0::numeric, null::bigint, null::text, true, null::numeric, null::text, true),
    ('40(6)', 30::numeric, null::bigint, null::text, true, 60::numeric, 'ประกอบโรคศิลปะ', false),
    ('40(7)', 60::numeric, null::bigint, null::text, true, null::numeric, null::text, false),
    ('40(8)', 60::numeric, null::bigint, null::text, true, null::numeric, null::text, false)
  ) as r(income_type, default_rate, cap_satang, shared_group, allow_actual, alt_rate, alt_label, uses_cat);

  -- ===== อัตราเหมาค่าเช่า 40(5) แยกตามประเภททรัพย์สิน (คงที่ทั้ง 2 ปี) =====
  insert into tax_rental_expense_rates (config_version_id, category_key, label_th, rate_percent)
  select v.id, c.category_key, c.label_th, c.rate
  from (values (v_2568), (v_2569)) as v(id)
  cross join (values
    ('house', 'บ้าน/สิ่งปลูกสร้าง', 30::numeric),
    ('ag_land', 'ที่ดินเพื่อการเกษตร', 20::numeric),
    ('other_land', 'ที่ดิน (ไม่ใช่การเกษตร)', 15::numeric),
    ('vehicle', 'ยานพาหนะ', 30::numeric),
    ('other_property', 'ทรัพย์สินอื่นๆ', 10::numeric)
  ) as c(category_key, label_th, rate);

  -- ===== รายการลดหย่อน — ส่วนที่เหมือนกันทั้ง 2 ปี =====
  insert into tax_deduction_items (config_version_id, key, label_th, category, calc_type, unit_amount_satang, cap_satang, percent_rate, retirement_group, double_amount, sort_order, note)
  select v.id, d.key, d.label_th, d.category, d.calc_type, d.unit_amount_satang, d.cap_satang, d.percent_rate, d.retirement_group, d.double_amount, d.sort_order, d.note
  from (values (v_2568), (v_2569)) as v(id)
  cross join (values
    ('personal', 'ลดหย่อนส่วนตัว', 'personal_family', 'fixed', 6000000::bigint, null::bigint, null::numeric, false, false, 1, null::text),
    ('spouse', 'คู่สมรส (ไม่มีเงินได้)', 'personal_family', 'fixed', 6000000::bigint, null::bigint, null::numeric, false, false, 2, 'ใช้เมื่อกรอกว่ามีคู่สมรสไม่มีเงินได้เท่านั้น'),
    ('child_first', 'บุตรคนแรก (เกิดก่อนปี 2561)', 'personal_family', 'per_dependent', 3000000::bigint, null::bigint, null::numeric, false, false, 3, null::text),
    ('child_subsequent', 'บุตรคนที่ 2 เป็นต้นไป (เกิดตั้งแต่ปี 2561)', 'personal_family', 'per_dependent', 6000000::bigint, null::bigint, null::numeric, false, false, 4, 'ไม่จำกัดจำนวนคน'),
    ('parent', 'บิดามารดา (อายุ≥60 ปี, รายได้ไม่เกิน 30,000/ปี)', 'personal_family', 'per_dependent', 3000000::bigint, null::bigint, null::numeric, false, false, 5, 'สูงสุด 4 คน (ของตนเอง+คู่สมรส รวมกัน)'),
    ('disabled_dependent', 'อุปการะผู้พิการ/ทุพพลภาพ', 'personal_family', 'per_dependent', 6000000::bigint, null::bigint, null::numeric, false, false, 6, null::text),
    ('childbirth', 'ค่าฝากครรภ์/คลอดบุตร', 'personal_family', 'user_amount', null::bigint, 6000000::bigint, null::numeric, false, false, 7, 'ต่อการตั้งครรภ์ จ่ายให้ รพ./สถานพยาบาลโดยตรง'),

    ('life_health_insurance_self', 'เบี้ยประกันชีวิต + สุขภาพตนเอง (รวมกัน)', 'insurance_retirement', 'user_amount', null::bigint, 10000000::bigint, null::numeric, false, false, 10, null::text),
    ('parent_health_insurance', 'เบี้ยประกันสุขภาพบิดามารดา', 'insurance_retirement', 'user_amount', null::bigint, 1500000::bigint, null::numeric, false, false, 11, null::text),
    ('pvd_gpf', 'กองทุนสำรองเลี้ยงชีพ (PVD) / กบข.', 'insurance_retirement', 'user_amount', null::bigint, 50000000::bigint, 15::numeric, true, false, 13, 'อยู่ในเพดานรวมกลุ่มเกษียณ 500,000'),
    ('rmf', 'กองทุน RMF', 'insurance_retirement', 'user_amount', null::bigint, 50000000::bigint, 30::numeric, true, false, 14, 'อยู่ในเพดานรวมกลุ่มเกษียณ 500,000'),
    ('annuity_insurance', 'ประกันชีวิตแบบบำนาญ', 'insurance_retirement', 'user_amount', null::bigint, 20000000::bigint, 15::numeric, true, false, 15, 'อยู่ในเพดานรวมกลุ่มเกษียณ 500,000'),
    ('thai_esg', 'กองทุน Thai ESG', 'insurance_retirement', 'user_amount', null::bigint, 30000000::bigint, 30::numeric, true, false, 16, 'อยู่ในเพดานรวมกลุ่มเกษียณ 500,000'),
    ('nsf_gov_savings', 'กองทุนการออมแห่งชาติ (กอช.)', 'insurance_retirement', 'user_amount', null::bigint, 3000000::bigint, null::numeric, true, false, 17, 'อยู่ในเพดานรวมกลุ่มเกษียณ 500,000'),
    ('home_loan_interest', 'ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย', 'insurance_retirement', 'user_amount', null::bigint, 10000000::bigint, null::numeric, false, false, 18, null::text),

    ('donation_general', 'เงินบริจาคทั่วไป', 'donation', 'user_amount', null::bigint, null::bigint, 10::numeric, false, false, 20, 'เพดาน 10% ของเงินได้หลังหักค่าใช้จ่าย+ลดหย่อนอื่น (ก่อนหักบริจาค)'),
    ('donation_education_hospital', 'บริจาคการศึกษา/กีฬา/รพ.รัฐ/สาธารณประโยชน์ (นับ 2 เท่า)', 'donation', 'user_amount', null::bigint, null::bigint, 10::numeric, false, true, 21, 'ยอดที่กรอกคูณ 2 ก่อนเทียบเพดานรวม 10% เดียวกับบริจาคทั่วไป'),
    ('donation_political_party', 'บริจาคพรรคการเมือง', 'donation', 'user_amount', null::bigint, 1000000::bigint, null::numeric, false, false, 22, null::text)
  ) as d(key, label_th, category, calc_type, unit_amount_satang, cap_satang, percent_rate, retirement_group, double_amount, sort_order, note);

  -- ===== รายการที่ต่างกันตามปี: เพดานประกันสังคม =====
  insert into tax_deduction_items (config_version_id, key, label_th, category, calc_type, cap_satang, sort_order)
  values (v_2568, 'social_security', 'เงินสมทบประกันสังคม', 'insurance_retirement', 'user_amount', 900000, 12);

  insert into tax_deduction_items (config_version_id, key, label_th, category, calc_type, cap_satang, sort_order, note)
  values (v_2569, 'social_security', 'เงินสมทบประกันสังคม', 'insurance_retirement', 'user_amount', 1050000, 12, 'เพดานใหม่ตามฐานค่าจ้าง 17,500/เดือน มีผล 1 ม.ค. 2569');

  -- ===== มาตรการรัฐรายปี — เฉพาะ 2568 (ยืนยันแล้ว), 2569 ยังไม่ยืนยัน ให้ admin เพิ่มเองภายหลัง =====
  insert into tax_deduction_items (config_version_id, key, label_th, category, calc_type, cap_satang, sort_order, note)
  values (v_2568, 'easy_ereceipt', 'Easy E-Receipt (ซื้อสินค้า/บริการมี e-Tax Invoice)', 'stimulus', 'user_amount', 5000000, 30, 'ใช้ได้เฉพาะยอดซื้อช่วง 16 ม.ค.–28 ก.พ. 2568');
end $$;
