-- แก้ 2 จุดที่พบจากการไล่ตรวจ ภ.ง.ด.90 ครบทุกข้อ (ตกลงกับวี):
-- 1) รายการลดหย่อน "มาตรการรัฐ" ที่ค้นข้อมูลไว้ตอน scope แต่ลืมใส่ seed จริง + ประณีตศิลปกรรม (40(6) เหมา 60% เหมือนโรคศิลปะ)
-- 2) ภ.ง.ด.94 (ภาษีครึ่งปีที่ชำระไปแล้ว) — เครดิตหักออกจากภาษีที่ต้องชำระเต็มปี เหมือน WHT แต่คนละที่มา เก็บเป็นยอดเดียวต่อปีภาษี (ตรงตามที่แบบฟอร์มจริงมีแค่บรรทัดเดียว ไม่ใช่ log หลายใบแบบ WHT)

alter table tax_returns add column pnd94_paid_satang bigint not null default 0;

do $$
declare
  v_2568 uuid;
  v_2569 uuid;
begin
  select id into v_2568 from tax_config_versions where tax_year = 2568 order by version_no desc limit 1;
  select id into v_2569 from tax_config_versions where tax_year = 2569 order by version_no desc limit 1;

  -- ประณีตศิลปกรรม — ทางเลือกที่ 2 ของ 40(6) ที่หักเหมา 60% ได้เหมือนกัน (แยกจากประกอบโรคศิลปะ แต่ใช้ alt_rate เดียวกัน)
  update tax_expense_rules
  set alt_label = alt_label || ' / ประณีตศิลปกรรม'
  where income_type = '40(6)' and config_version_id in (v_2568, v_2569);

  -- เงินลงทุนวิสาหกิจเพื่อสังคม — ใช้ได้ทุกปี ไม่ใช่มาตรการรายปี
  insert into tax_deduction_items (config_version_id, key, label_th, category, calc_type, cap_satang, sort_order)
  values
    (v_2568, 'social_enterprise_investment', 'เงินลงทุนในหุ้น/วิสาหกิจเพื่อสังคม', 'insurance_retirement', 'user_amount', 10000000, 19),
    (v_2569, 'social_enterprise_investment', 'เงินลงทุนในหุ้น/วิสาหกิจเพื่อสังคม', 'insurance_retirement', 'user_amount', 10000000, 19);

  -- มาตรการรัฐเฉพาะปีภาษี 2568 ที่ค้นไว้แล้วแต่ยังไม่ได้ seed
  insert into tax_deduction_items (config_version_id, key, label_th, category, calc_type, cap_satang, sort_order, note)
  values
    (v_2568, 'home_construction', 'ค่าก่อสร้างบ้านใหม่ (เริ่มก่อสร้าง 9 เม.ย. 2567 - 31 ธ.ค. 2568)', 'stimulus', 'user_amount', 10000000, 31, '10,000 บาทต่อทุก 1 ล้านบาทค่าก่อสร้าง สูงสุด 100,000'),
    (v_2568, 'art_purchase', 'ค่าซื้องานศิลปะ', 'stimulus', 'user_amount', 10000000, 32, null),
    (v_2568, 'domestic_travel', 'ค่าท่องเที่ยวในประเทศ (29 ต.ค. - 15 ธ.ค. 2568)', 'stimulus', 'user_amount', 3000000, 33, 'เที่ยวเมืองรองคูณ 1.5 เท่าก่อนหักเพดาน'),
    (v_2568, 'thai_esgx', 'ค่าซื้อหน่วยลงทุน Thai ESG แบบพิเศษ (Thai ESGX)', 'stimulus', 'user_amount', 30000000, 34, 'แยกเพดานจาก Thai ESG ปกติ แต่ยังนับรวมในเพดานกลุ่มเกษียณ 500,000 — ช่วงสับเปลี่ยนจาก LTF 1 พ.ค.-30 มิ.ย. 2568 เท่านั้น');

  update tax_deduction_items set retirement_group = true where key = 'thai_esgx' and config_version_id = v_2568;
end $$;
