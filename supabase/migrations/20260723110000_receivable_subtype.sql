-- เพิ่ม subtype 'receivable' (ลูกหนี้ — เงินที่ผู้อื่นติดเราอยู่ เช่น ให้ยืม/สำรองจ่ายรอเบิกคืน)
-- แยกจาก 'other_asset' เพื่อให้จัดกลุ่มใน /accounts และงบดุล (C4) ชัดเจนขึ้น
-- ตกลงเพิ่มระหว่างแชต C4 — ดู REQUIREMENTS v1.4 §3.2
alter table accounts drop constraint chk_accounts_subtype;

alter table accounts
  add constraint chk_accounts_subtype check (
    subtype is null
    or (type_id = 'asset' and subtype in ('cash', 'bank', 'investment', 'receivable', 'other_asset'))
    or (type_id = 'liability' and subtype in ('credit_card', 'loan'))
  );
