-- แก้ 3 จุดที่พบจากการ reconcile กับ ภ.ง.ด.90 ตัวจริงปีภาษี 2568 (ก่อน freeze final ของ C6 ยังแก้ seed ตรงๆ ได้ ไม่ต้องผ่าน version ใหม่)
-- 1) เบี้ยประกันชีวิต+สุขภาพตนเอง เดิมรวมเป็นช่องเดียวเพดาน 100,000 — ของจริงมีเพดานย่อยสุขภาพ 25,000 ซ้อนอยู่ใน เพดานรวม 100,000
-- 2) เงินบริจาคทั่วไป vs บริจาคการศึกษา/รพ.รัฐ (2 เท่า) เดิมคำนวณเพดาน 10% จากฐานเดียวกัน — ของจริง cascade: 2เท่าคำนวณก่อนจากฐานเต็ม แล้วบริจาคทั่วไปคำนวณ 10% จากฐานที่ลดแล้ว
-- 3) บริจาคพรรคการเมือง ไม่ใช่ค่าลดหย่อนที่ลดเงินได้สุทธิ — เป็นการเจียดภาษีที่คำนวณได้แล้วไปให้พรรค (revenue-neutral) ไม่ควรอยู่ในรายการลดหย่อน

alter table tax_config_versions add column life_health_combined_cap_satang bigint not null default 10000000;
alter table tax_deduction_items add column life_health_group boolean not null default false;

do $$
declare
  v record;
begin
  for v in select id from tax_config_versions loop
    -- ลบช่องรวมเดิม + บริจาคพรรคการเมือง
    delete from tax_deduction_items where config_version_id = v.id and key in ('life_health_insurance_self', 'donation_political_party');

    -- แยกเป็น 2 ช่อง อยู่ในกลุ่มเพดานรวม 100,000 เดียวกัน (life_health_group)
    insert into tax_deduction_items (config_version_id, key, label_th, category, calc_type, cap_satang, life_health_group, sort_order)
    values
      (v.id, 'life_insurance', 'เบี้ยประกันชีวิต', 'insurance_retirement', 'user_amount', null, true, 10),
      (v.id, 'health_insurance_self', 'เบี้ยประกันสุขภาพตนเอง', 'insurance_retirement', 'user_amount', 2500000, true, 10);
  end loop;
end $$;
