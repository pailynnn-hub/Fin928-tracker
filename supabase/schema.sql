-- ============================================================
-- FIN Infinity 928 Activity Tracker - Database Schema v2
-- ใช้ไฟล์นี้สำหรับ "โปรเจกต์ใหม่ที่ยังไม่เคยรัน schema"
-- ถ้าเคยรัน schema.sql เวอร์ชันแรกไปแล้ว ให้ใช้ migration_v2.sql แทน (ไม่ต้องรันไฟล์นี้ซ้ำ)
-- วิธีใช้: คัดลอกไฟล์นี้ทั้งหมด ไปวางใน Supabase > SQL Editor > Run
-- ============================================================

-- 1) ตาราง profiles (ข้อมูลตัวแทน/หัวหน้าทีม)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null default 'agent' check (role in ('agent', 'leader')),
  team text default 'FIN Infinity 928',
  created_at timestamp with time zone default now()
);

-- 2) ตาราง daily_activities (กิจกรรมขายรายวัน)
create table daily_activities (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references profiles(id) on delete cascade not null,
  activity_date date not null default current_date,
  calls_prospecting int default 0,
  visits int default 0,
  fact_finding int default 0,
  fhc int default 0,
  storytelling int default 0,
  plans_presented int default 0,
  closing_attempts int default 0,
  policies_closed int default 0,
  fyp_amount numeric(12,2) default 0,
  fyc_amount numeric(12,2) default 0,       -- ยอด FYC
  life_count int default 0,                 -- จำนวนราย (Life)
  note text,
  created_at timestamp with time zone default now(),
  unique (agent_id, activity_date)
);

-- 3) ตาราง goals (เป้าหมายกิจกรรมขาย ตามช่วงเวลาปกติ)
create table goals (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references profiles(id) on delete cascade, -- NULL = เป้าหมายรวมทีม
  period_type text not null check (period_type in ('day','week','month','quarter','half_year','year')),
  period_start date not null,
  period_end date not null,
  target_calls_prospecting int default 0,
  target_visits int default 0,
  target_fact_finding int default 0,
  target_fhc int default 0,
  target_storytelling int default 0,
  target_plans_presented int default 0,
  target_closing_attempts int default 0,
  target_policies_closed int default 0,
  target_fyp_amount numeric(12,2) default 0,
  target_fyc_amount numeric(12,2) default 0,
  target_life_count int default 0,
  created_at timestamp with time zone default now()
);

-- 4) ตาราง campaigns (เป้าหมาย/การแข่งขันพิเศษ มีวันหมดเขตของตัวเอง)
create table campaigns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  agent_id uuid references profiles(id) on delete cascade, -- NULL = ทั้งทีม
  start_date date not null,
  end_date date not null,          -- วันหมดเขต ใช้คำนวณนับถอยหลัง
  target_fyp_amount numeric(12,2) default 0,
  target_fyc_amount numeric(12,2) default 0,
  target_life_count int default 0,
  created_at timestamp with time zone default now()
);

-- 5) ตาราง recruiting_activities (กิจกรรมชวนคน/recruit รายวัน)
create table recruiting_activities (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references profiles(id) on delete cascade not null,
  activity_date date not null default current_date,
  screening_questions int default 0,
  career_pitch int default 0,
  interviews_sent int default 0,
  exam_passed int default 0,
  codes_issued int default 0,
  real_agents int default 0,
  fas_count int default 0,
  fap_count int default 0,
  created_at timestamp with time zone default now(),
  unique (agent_id, activity_date)
);

-- 6) ตาราง recruiting_goals (เป้าหมาย recruit ตามช่วงเวลา — หัวหน้าและตัวแทนแข่งได้)
create table recruiting_goals (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references profiles(id) on delete cascade, -- NULL = เป้ารวมทีม
  period_type text not null check (period_type in ('day','week','month','quarter','half_year','year')),
  period_start date not null,
  period_end date not null,
  target_screening_questions int default 0,
  target_career_pitch int default 0,
  target_interviews_sent int default 0,
  target_exam_passed int default 0,
  target_codes_issued int default 0,
  target_real_agents int default 0,
  target_fas_count int default 0,
  target_fap_count int default 0,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table daily_activities enable row level security;
alter table goals enable row level security;
alter table campaigns enable row level security;
alter table recruiting_activities enable row level security;
alter table recruiting_goals enable row level security;

create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "activities_select_own_or_leader" on daily_activities for select using (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "activities_insert_own_or_leader" on daily_activities for insert with check (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "activities_update_own_or_leader" on daily_activities for update using (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);

create policy "goals_select_all_auth" on goals for select using (auth.role() = 'authenticated');
create policy "goals_insert_leader_only" on goals for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "goals_update_leader_only" on goals for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "goals_delete_leader_only" on goals for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);

create policy "campaigns_select_all_auth" on campaigns for select using (auth.role() = 'authenticated');
create policy "campaigns_insert_leader_only" on campaigns for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "campaigns_update_leader_only" on campaigns for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "campaigns_delete_leader_only" on campaigns for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);

create policy "recruit_select_own_or_leader" on recruiting_activities for select using (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "recruit_insert_own_or_leader" on recruiting_activities for insert with check (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "recruit_update_own_or_leader" on recruiting_activities for update using (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);

create policy "recruit_goals_select_all_auth" on recruiting_goals for select using (auth.role() = 'authenticated');
create policy "recruit_goals_insert_leader_only" on recruiting_goals for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "recruit_goals_update_leader_only" on recruiting_goals for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "recruit_goals_delete_leader_only" on recruiting_goals for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);

-- ============================================================
-- Trigger: สร้าง profile อัตโนมัติเมื่อมีคน sign up ใหม่
-- ============================================================
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'agent');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
