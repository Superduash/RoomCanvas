-- Add missing active provider columns to users table
-- Run this directly against the production Postgres database

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_text_provider VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_image_provider VARCHAR;
