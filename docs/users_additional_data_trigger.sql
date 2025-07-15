-- Option 1: Trigger to automatically create a blank row in users_additional_data
-- when a new user is created (NOT RECOMMENDED - wastes storage)

-- CREATE OR REPLACE FUNCTION create_user_additional_data()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.users_additional_data (user_id)
--   VALUES (NEW.user_id)
--   ON CONFLICT (user_id) DO NOTHING;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER create_user_additional_data_trigger
-- AFTER INSERT ON public.users
-- FOR EACH ROW
-- EXECUTE FUNCTION create_user_additional_data();

-- Option 2: Function to safely get or create additional data (RECOMMENDED)
-- This creates the row only when it's actually needed

CREATE OR REPLACE FUNCTION get_or_create_user_additional_data(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  stripe_customer_id varchar,
  income_level varchar,
  education_level varchar,
  housing_situation varchar,
  family_status varchar,
  tech_adoption varchar,
  political_leaning varchar,
  media_consumption varchar,
  income_verified boolean,
  video_interview_completed boolean,
  reference_checks_passed boolean,
  leadership_role_verified boolean,
  education_credentials text,
  work_experience text,
  company_info jsonb,
  professional_certifications text[],
  linkedin_profile varchar,
  income_verification_documents text[],
  created_at timestamp,
  updated_at timestamp
) AS $$
BEGIN
  -- Try to insert a new row, but do nothing if it already exists
  INSERT INTO public.users_additional_data (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Return the row (either existing or newly created)
  RETURN QUERY
  SELECT * FROM public.users_additional_data
  WHERE users_additional_data.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT * FROM get_or_create_user_additional_data('user-uuid-here');

-- Option 3: View that shows all users with their additional data (if it exists)
-- This is useful for queries and doesn't require creating empty rows

CREATE OR REPLACE VIEW users_with_additional_data AS
SELECT 
  u.*,
  uad.stripe_customer_id,
  uad.income_level,
  uad.education_level,
  uad.housing_situation,
  uad.family_status,
  uad.tech_adoption,
  uad.political_leaning,
  uad.media_consumption,
  uad.income_verified,
  uad.video_interview_completed,
  uad.reference_checks_passed,
  uad.leadership_role_verified,
  uad.education_credentials,
  uad.work_experience,
  uad.company_info,
  uad.professional_certifications,
  uad.linkedin_profile,
  uad.income_verification_documents,
  uad.created_at as additional_data_created_at,
  uad.updated_at as additional_data_updated_at
FROM public.users u
LEFT JOIN public.users_additional_data uad ON u.user_id = uad.user_id;

-- Grant permissions on the view
GRANT SELECT ON users_with_additional_data TO authenticated;

-- Usage example:
-- SELECT * FROM users_with_additional_data WHERE user_id = 'user-uuid-here';