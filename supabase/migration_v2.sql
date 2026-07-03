-- ============================================================
-- Migration v1 -> v2: ใช้เฉพาะกรณีเคยรัน schema.sql เวอร์ชันแรกไปแล้วเท่านั้น
-- ถ้าเพิ่งเริ่มโปรเจกต์ใหม่ ให้ใช้ schema.sql อย่างเดียว ไม่ต้องรันไฟล์นี้
-- วิธีใช้: วางใน Supabase SQL Editor แล้ว Run
-- ============================================================

-- 1) เพิ่มคอลัมน์ใหม่ใน daily_activities
alter table daily_activities add column if not exists fyc_amount numeric(12,2) default 0;
alter table daily_activities add column if not exists life_count int default 0;

-- 2) เพิ่มคอลัมน์เป้าหมายใหม่ใน goals + เปิดให้ตั้งเป้ารายวันได้
alter table goals drop constraint if exists goals_period_type_check;
alter table goals add constraint goals_period_type_check check (period_type in ('day','week','month','quarter','half_year','year'));
alter table goals add column if not exists target_fyc_amount numeric(12,2) default 0;
alter table goals add column if not exists target_life_count int default 0;

-- 3) ตาราง campaigns (ใหม่)
create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  agent_id uuid references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  target_fyp_amount numeric(12,2) default 0,
  target_fyc_amount numeric(12,2) default 0,
  target_life_count int default 0,
  created_at timestamp with time zone default now()
);
alter table campaigns enable row level security;
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

-- 4) ตาราง recruiting_activities (ใหม่)
create table if not exists recruiting_activities (
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
alter table recruiting_activities enable row level security;
create policy "recruit_select_own_or_leader" on recruiting_activities for select using (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "recruit_insert_own_or_leader" on recruiting_activities for insert with check (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "recruit_update_own_or_leader" on recruiting_activities for update using (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);

-- 5) ตาราง recruiting_goals (ใหม่)
create table if not exists recruiting_goals (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references profiles(id) on delete cascade,
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
alter table recruiting_goals enable row level security;
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

-- 6) อัปเดต policy เดิมของ daily_activities ให้ leader แก้แทนตัวแทนได้ (ฟีเจอร์ใหม่)
drop policy if exists "activities_insert_own" on daily_activities;
drop policy if exists "activities_update_own" on daily_activities;
drop policy if exists "activities_insert_own_or_leader" on daily_activities;
drop policy if exists "activities_update_own_or_leader" on daily_activities;
create policy "activities_insert_own_or_leader" on daily_activities for insert with check (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);
create policy "activities_update_own_or_leader" on daily_activities for update using (
  auth.uid() = agent_id or exists (select 1 from profiles where id = auth.uid() and role = 'leader')
);

-- เสร็จแล้ว! ระบบพร้อมใช้ฟีเจอร์ใหม่ทั้งหมด
