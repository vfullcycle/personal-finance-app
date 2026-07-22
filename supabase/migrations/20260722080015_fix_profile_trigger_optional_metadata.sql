-- แก้บั๊ก: create_profile_from_signup() พังทั้งการสร้าง user ถ้าไม่มี username/recovery_email
-- ใน raw_user_meta_data (เช่น สร้าง user ตรงจาก Supabase Dashboard ที่ไม่ผ่านฟอร์ม signup ของแอป)
-- ตอนนี้: ถ้าไม่มี metadata ครบ ให้ข้าม (ไม่สร้าง profile) แทนที่จะทำให้ auth.users insert ทั้งก้อนล้มเหลว
create or replace function create_profile_from_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_recovery_email text := new.raw_user_meta_data ->> 'recovery_email';
begin
  if v_username is not null and v_recovery_email is not null then
    insert into profiles (user_id, username, login_email, recovery_email)
    values (new.id, v_username, new.email, v_recovery_email);
  end if;
  return new;
end;
$$;
