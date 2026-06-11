-- Run this once in the Supabase SQL editor before running scripts/migrateImagesToR2.js
create table if not exists image_assets (
  id bigserial primary key,
  original_path text unique not null,
  r2_key text not null,
  r2_url text not null,
  content_type text not null,
  original_format text not null,
  original_bytes int not null,
  webp_bytes int not null,
  created_at timestamptz default now()
);
