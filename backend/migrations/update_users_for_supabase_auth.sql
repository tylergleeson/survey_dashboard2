-- Migration: Update users table for Supabase phone auth
-- This makes fields optional that aren't available during phone signup

-- Make password_hash optional (since Supabase handles auth)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Make demographic fields optional (can be collected later)
ALTER TABLE users ALTER COLUMN age DROP NOT NULL;
ALTER TABLE users ALTER COLUMN occupation DROP NOT NULL;
ALTER TABLE users ALTER COLUMN location DROP NOT NULL;

-- Add default subscription status as active for new phone signups
ALTER TABLE users ALTER COLUMN subscription_status SET DEFAULT 'active';

-- Add a column to track auth method
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'supabase';

-- Update any existing users to mark their auth method
UPDATE users SET auth_method = 'legacy' WHERE auth_method IS NULL;