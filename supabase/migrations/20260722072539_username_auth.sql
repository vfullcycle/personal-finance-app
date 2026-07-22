-- เข้าระบบด้วย username แทนอีเมล (ตกลงกับวีใน C2)
-- กลไก: auth.users.email เก็บ "อีเมลกู้คืน + tag username" (plus-addressing เช่น wee+abc123@gmail.com)
-- ผู้ให้บริการอีเมลหลัก (Gmail/Outlook/iCloud) ส่งเมลที่มี +tag เข้ากล่องจดหมายเดิมอัตโนมัติ
-- จึงใช้ mailer/confirm/reset ของ Supabase เดิมได้ทั้งหมด ไม่ต้องมี Edge Function

create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  login_email text not null,
  recovery_email text not null,
  created_at timestamptz not null default now(),

  constraint chk_profiles_username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  constraint chk_profiles_recovery_email_format check (recovery_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- username ไม่แยกตัวพิมพ์เล็ก/ใหญ่ (Wee กับ wee ถือเป็นชื่อเดียวกัน)
create unique index idx_profiles_username_lower on profiles (lower(username));
create unique index idx_profiles_login_email on profiles (login_email);

alter table profiles enable row level security;

create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ตรวจ username ว่างก่อนสมัคร (เรียกได้ก่อน login)
create function is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (select 1 from profiles where lower(username) = lower(p_username));
$$;

grant execute on function is_username_available(text) to anon, authenticated;

-- แปลง username -> login_email (สำหรับหน้า login/forgot-password ก่อน authenticate)
create function get_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select login_email from profiles where lower(username) = lower(p_username) limit 1;
$$;

grant execute on function get_login_email(text) to anon, authenticated;

-- สร้างแถว profile อัตโนมัติตอนสมัครสมาชิก จาก metadata ที่ client ส่งมาตอน signUp()
create function create_profile_from_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, username, login_email, recovery_email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.email,
    new.raw_user_meta_data ->> 'recovery_email'
  );
  return new;
end;
$$;

create trigger trg_create_profile_from_signup
  after insert on auth.users
  for each row
  execute function create_profile_from_signup();
