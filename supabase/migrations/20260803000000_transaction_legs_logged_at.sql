-- เพิ่มเวลาที่ split line แต่ละอันถูกบันทึกจริง (ต่างจาก created_at ที่ reset ทุกครั้งที่แก้ไขรายการ
-- เพราะ flow แก้ไขปัจจุบันลบ leg เดิมทั้งหมดแล้ว insert ใหม่ทุกครั้ง — ใช้ป้อนฟีเจอร์ "+ เพิ่มยอด (หมวดเดิม)")
alter table transaction_legs add column logged_at timestamptz;
update transaction_legs set logged_at = created_at where logged_at is null;

-- UPDATE ข้างบนคิว deferred balance-check trigger (20260722035238) ค้างไว้ในทรานแซกชันนี้
-- ต้องบังคับให้ตรวจทันทีก่อน ไม่งั้น ALTER COLUMN ถัดไปจะชนกับ pending trigger events (SQLSTATE 55006)
set constraints all immediate;

alter table transaction_legs alter column logged_at set not null;
alter table transaction_legs alter column logged_at set default now();
