-- จัดเรียงหมวดหมู่ (accounts) เอง + เปิด/ปิด+จัดเรียงแท็ก (tags) เอง — ทั้งสองตารางไม่มีคอลัมน์ลำดับมาก่อน
alter table accounts add column sort_order integer;
update accounts a set sort_order = sub.rn - 1
from (select id, row_number() over (partition by user_id order by created_at) as rn from accounts) sub
where a.id = sub.id;
alter table accounts alter column sort_order set not null;
alter table accounts alter column sort_order set default 0;

alter table tags add column sort_order integer;
update tags t set sort_order = sub.rn - 1
from (select id, row_number() over (partition by user_id order by created_at) as rn from tags) sub
where t.id = sub.id;
alter table tags alter column sort_order set not null;
alter table tags alter column sort_order set default 0;

alter table tags add column is_active boolean not null default true;
