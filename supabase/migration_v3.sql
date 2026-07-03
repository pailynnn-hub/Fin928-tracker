-- ============================================================
-- Migration v2 -> v3: เพิ่มกิจกรรมบริการ (เยี่ยมลูกค้าหลังขาย, CRM, ขอต่อรายชื่อ)
-- ใช้เฉพาะกรณีเคยรัน schema.sql หรือ migration_v2.sql ไปแล้วเท่านั้น
-- ถ้าเพิ่งเริ่มโปรเจกต์ใหม่ ให้ใช้ schema.sql อย่างเดียว (มีครบแล้ว) ไม่ต้องรันไฟล์นี้
-- วิธีใช้: วางใน Supabase SQL Editor แล้ว Run
-- ============================================================

alter table daily_activities add column if not exists after_sales_visits int default 0;
alter table daily_activities add column if not exists crm_activities int default 0;
alter table daily_activities add column if not exists referral_requests int default 0;

alter table goals add column if not exists target_after_sales_visits int default 0;
alter table goals add column if not exists target_crm_activities int default 0;
alter table goals add column if not exists target_referral_requests int default 0;

-- เสร็จแล้ว! ฟอร์มกิจกรรมขายจะมีช่องกิจกรรมบริการ 3 หัวข้อใหม่โดยอัตโนมัติ
