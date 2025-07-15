-- Create users_additional_data table for storing optional/extended user information
-- This table stores all the columns that were removed from the main users table

CREATE TABLE public.users_additional_data (
  -- Link to main users table
  user_id uuid NOT NULL,
  
  -- Payment/Financial Information
  stripe_customer_id character varying(255),
  
  -- Demographic Information
  income_level character varying(50),
  education_level character varying(50),
  housing_situation character varying(50),
  family_status character varying(50),
  
  -- Behavioral/Preference Data
  tech_adoption character varying(50),
  political_leaning character varying(50),
  media_consumption character varying(50),
  
  -- Verification Status Fields
  income_verified boolean DEFAULT false,
  video_interview_completed boolean DEFAULT false,
  reference_checks_passed boolean DEFAULT false,
  leadership_role_verified boolean DEFAULT false,
  
  -- Professional Information
  education_credentials text,
  work_experience text,
  company_info jsonb,
  professional_certifications text[],
  linkedin_profile character varying(255),
  
  -- Document Storage
  income_verification_documents text[],
  
  -- Timestamps
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  
  -- Primary key and foreign key
  CONSTRAINT users_additional_data_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_additional_data_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.users(user_id) 
    ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_users_additional_income_level 
  ON public.users_additional_data USING btree (income_level) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_users_additional_education_level 
  ON public.users_additional_data USING btree (education_level) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_users_additional_verified_status 
  ON public.users_additional_data USING btree (income_verified, video_interview_completed) 
  TABLESPACE pg_default;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_additional_data_updated_at 
  BEFORE UPDATE ON public.users_additional_data 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Enable Row Level Security (RLS)
ALTER TABLE public.users_additional_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see and modify their own additional data
CREATE POLICY "Users can view own additional data" 
  ON public.users_additional_data 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own additional data" 
  ON public.users_additional_data 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own additional data" 
  ON public.users_additional_data 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Optional: Migrate existing data from users table (if you haven't dropped the columns yet)
-- INSERT INTO public.users_additional_data (
--   user_id, stripe_customer_id, income_level, education_level, 
--   housing_situation, family_status, tech_adoption, political_leaning, 
--   media_consumption, income_verified, education_credentials, work_experience,
--   company_info, professional_certifications, linkedin_profile,
--   video_interview_completed, reference_checks_passed, leadership_role_verified,
--   income_verification_documents
-- )
-- SELECT 
--   user_id, stripe_customer_id, income_level, education_level,
--   housing_situation, family_status, tech_adoption, political_leaning,
--   media_consumption, income_verified, education_credentials, work_experience,
--   company_info, professional_certifications, linkedin_profile,
--   video_interview_completed, reference_checks_passed, leadership_role_verified,
--   income_verification_documents
-- FROM public.users
-- WHERE stripe_customer_id IS NOT NULL 
--    OR income_level IS NOT NULL 
--    OR education_level IS NOT NULL
--    -- Add more conditions as needed
-- ;

-- Grant permissions (adjust based on your needs)
GRANT ALL ON public.users_additional_data TO authenticated;
GRANT ALL ON public.users_additional_data TO service_role;