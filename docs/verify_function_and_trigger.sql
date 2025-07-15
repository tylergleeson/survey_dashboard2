-- 1. Check if the function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'create_user_additional_data';

-- 2. Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgtype,
  tgenabled
FROM pg_trigger
WHERE tgname = 'create_user_additional_data_trigger';

-- 3. Alternative: List all functions in public schema
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 4. Alternative: List all triggers on users table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'public';

-- 5. If function doesn't exist, make sure to run the CREATE statements
-- Sometimes you need to run them separately:

-- First, create the function
CREATE OR REPLACE FUNCTION create_user_additional_data()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_additional_data (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then create the trigger (run as separate statement)
CREATE TRIGGER create_user_additional_data_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION create_user_additional_data();