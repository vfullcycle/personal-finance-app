-- C7 ช่วง 2 (ส่วนขยาย): ชั้น A (baseline) เพิ่มวันที่เริ่มได้ (optional) — ไม่ใส่ = เริ่มตั้งแต่ปีแรกของ projection เหมือนเดิม
-- ใส่ = นับรวมเข้า projection ตั้งแต่เดือนนั้นเป็นต้นไป (เดือนก่อนหน้าถือว่ายังไม่เกิดขึ้น) ถ้าต้องการกำหนด "วันจบ" ด้วยให้ใช้ชั้น B แทน
alter table budget_baseline_items
  add column start_date date;
