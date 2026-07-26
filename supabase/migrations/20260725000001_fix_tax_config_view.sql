-- v_tax_config_current ถูกสร้างด้วย `select *` ก่อนที่ 20260725000000 จะเพิ่ม life_health_combined_cap_satang
-- Postgres ขยาย `select *` เป็นรายชื่อคอลัมน์ตอน CREATE VIEW เท่านั้น ไม่ตามคอลัมน์ใหม่ที่ ALTER TABLE เพิ่มทีหลังอัตโนมัติ
-- ต้อง CREATE OR REPLACE ใหม่ให้ดึงคอลัมน์ล่าสุดจริง (เจอบั๊กนี้ตอน reconcile กับ ภ.ง.ด.90 ตัวจริง — ค่าออกมาเป็น NaN เพราะ field หาย)
create or replace view v_tax_config_current as
select distinct on (tax_year) *
from tax_config_versions
order by tax_year, version_no desc;
