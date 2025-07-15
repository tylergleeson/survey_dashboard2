-- The trigger already exists! Let's verify it's working correctly

-- 1. First, check the trigger details
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled
FROM pg_trigger
WHERE tgname = 'create_user_additional_data_trigger';

-- 2. Test the trigger by creating a test user
-- Generate a random phone number to avoid conflicts
DO $$
DECLARE
  new_user_id uuid;
  random_phone text;
BEGIN
  -- Generate random phone number
  random_phone := '+1555' || lpad((random() * 9999999)::int::text, 7, '0');
  
  -- Insert test user
  INSERT INTO public.users (
    phone_number, 
    password_hash, 
    first_name,
    last_name,
    age, 
    occupation, 
    city,
    state,
    location
  ) VALUES (
    random_phone, 
    'test_hash',
    'Test',
    'User', 
    25, 
    'Test Engineer',
    'Austin',
    'TX', 
    'Austin, TX'
  ) RETURNING user_id INTO new_user_id;
  
  -- Show results
  RAISE NOTICE 'Created user with ID: %', new_user_id;
  RAISE NOTICE 'Phone number: %', random_phone;
END $$;

-- 3. Verify the trigger created a row in users_additional_data
-- This query shows the 5 most recent users and whether they have additional data
SELECT 
  u.user_id,
  u.first_name,
  u.last_name,
  u.created_at as user_created,
  CASE 
    WHEN uad.user_id IS NOT NULL THEN 'Yes - Trigger worked!'
    ELSE 'No - Trigger may have failed'
  END as has_additional_data,
  uad.created_at as additional_data_created
FROM public.users u
LEFT JOIN public.users_additional_data uad ON u.user_id = uad.user_id
ORDER BY u.created_at DESC
LIMIT 5;

-- 4. If you want to remove the test user
-- DELETE FROM public.users WHERE first_name = 'Test' AND last_name = 'User';

-- 5. To check how many users have additional data records
SELECT 
  COUNT(DISTINCT u.user_id) as total_users,
  COUNT(DISTINCT uad.user_id) as users_with_additional_data,
  COUNT(DISTINCT u.user_id) - COUNT(DISTINCT uad.user_id) as users_missing_additional_data
FROM public.users u
LEFT JOIN public.users_additional_data uad ON u.user_id = uad.user_id;