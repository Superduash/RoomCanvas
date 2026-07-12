-- Migration: Fix timestamp columns to be timezone-aware
-- This migration converts all created_at columns (and last_login_at on users)
-- from TIMESTAMP WITHOUT TIME ZONE to TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)

-- For PostgreSQL only (SQLite doesn't have timezone-aware timestamps)

-- Update users table timestamp columns
ALTER TABLE users 
ALTER COLUMN last_login_at TYPE TIMESTAMPTZ 
USING last_login_at AT TIME ZONE 'UTC';

ALTER TABLE users 
ALTER COLUMN created_at TYPE TIMESTAMPTZ 
USING created_at AT TIME ZONE 'UTC';

-- Update generations table timestamp column
ALTER TABLE generations 
ALTER COLUMN created_at TYPE TIMESTAMPTZ 
USING created_at AT TIME ZONE 'UTC';

-- Update variations table timestamp column
ALTER TABLE variations 
ALTER COLUMN created_at TYPE TIMESTAMPTZ 
USING created_at AT TIME ZONE 'UTC';

-- Note: SQLite users can safely skip this migration as SQLite stores datetimes as strings
-- and doesn't enforce timezone types. The Python code changes will handle the conversion.
