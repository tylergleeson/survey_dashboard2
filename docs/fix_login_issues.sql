-- Fix potential login issues after schema changes

-- 1. Check if RLS policies reference old columns
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 2. Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if there are any users in auth but not in users table
SELECT 
  au.id as auth_user_id,
  au.phone as auth_phone,
  u.user_id as profile_user_id,
  u.phone_number as profile_phone
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.user_id
WHERE u.user_id IS NULL;

-- 4. Recreate basic RLS policies for the simplified table
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

-- Create simple RLS policies that only use columns that exist
CREATE POLICY "Users can view own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 5. Create missing user profiles for anyone who exists in auth but not users table
-- (This will be populated by the previous query results)
INSERT INTO public.users (
  user_id, 
  phone_number, 
  password_hash, 
  age, 
  occupation, 
  location, 
  tier, 
  earnings, 
  quality_score, 
  subscription_status
)
SELECT 
  au.id,
  au.phone,
  'supabase_managed',
  25,
  'Not specified',
  'Not specified',
  'basic',
  0.00,
  0.00,
  'inactive'
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.user_id
WHERE u.user_id IS NULL
  AND au.phone IS NOT NULL;

-- 6. Verify everything looks correct
SELECT COUNT(*) as auth_users FROM auth.users;
SELECT COUNT(*) as profile_users FROM public.users;
SELECT COUNT(*) as additional_data_users FROM public.users_additional_data;