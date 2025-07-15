-- Trigger to automatically create a row in users_additional_data
-- whenever a new user is created in the users table

-- Create the trigger function
CREATE OR REPLACE FUNCTION create_user_additional_data()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_additional_data (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER create_user_additional_data_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION create_user_additional_data();

-- Optional: Create rows for all existing users who don't have additional data yet
-- This ensures consistency for users created before the trigger
INSERT INTO public.users_additional_data (user_id)
SELECT u.user_id 
FROM public.users u
LEFT JOIN public.users_additional_data uad ON u.user_id = uad.user_id
WHERE uad.user_id IS NULL;

-- Verify the trigger is working
-- After running this, every new user will automatically have a row in users_additional_data
-- You can test by creating a new user and checking both tables