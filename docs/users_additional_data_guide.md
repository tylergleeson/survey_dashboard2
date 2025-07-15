# Users Additional Data Table Guide

## Overview
The `users_additional_data` table stores optional and extended user information that was removed from the main `users` table. This follows the principle of keeping the main table lean while allowing for future extensibility.

## Table Structure

### Categories of Data

1. **Payment/Financial Information**
   - `stripe_customer_id` - Stripe customer identifier for payment processing

2. **Demographic Information**
   - `income_level` - User's income bracket
   - `education_level` - Highest education achieved
   - `housing_situation` - Renting, owning, etc.
   - `family_status` - Single, married, etc.

3. **Behavioral/Preference Data**
   - `tech_adoption` - Early adopter, conservative, etc.
   - `political_leaning` - Political preferences
   - `media_consumption` - Media consumption habits

4. **Verification Status**
   - `income_verified` - Whether income has been verified
   - `video_interview_completed` - Video interview completion status
   - `reference_checks_passed` - Reference verification status
   - `leadership_role_verified` - Leadership position verification

5. **Professional Information**
   - `education_credentials` - Detailed education credentials
   - `work_experience` - Work history
   - `company_info` - Current company information (JSON)
   - `professional_certifications` - Array of certifications
   - `linkedin_profile` - LinkedIn profile URL

6. **Documents**
   - `income_verification_documents` - Array of document references

## Key Features

### Foreign Key Relationship
- Links to main `users` table via `user_id`
- `ON DELETE CASCADE` ensures data is removed when user is deleted

### Row Level Security (RLS)
- Users can only view and modify their own additional data
- Prevents unauthorized access to sensitive information

### Automatic Timestamps
- `created_at` - Set when record is created
- `updated_at` - Automatically updated on any change

### Indexes
- Optimized for queries on income level, education level, and verification status

## Usage Examples

### Insert additional data for a user
```sql
INSERT INTO public.users_additional_data (
  user_id, 
  income_level, 
  education_level,
  linkedin_profile
) VALUES (
  'user-uuid-here',
  '50k-75k',
  'bachelors',
  'https://linkedin.com/in/username'
);
```

### Update existing additional data
```sql
UPDATE public.users_additional_data 
SET 
  income_verified = true,
  income_verification_documents = ARRAY['doc1.pdf', 'doc2.pdf']
WHERE user_id = 'user-uuid-here';
```

### Query users with specific criteria
```sql
-- Find all users with verified income above certain level
SELECT u.first_name, u.last_name, uad.income_level
FROM public.users u
JOIN public.users_additional_data uad ON u.user_id = uad.user_id
WHERE uad.income_verified = true 
  AND uad.income_level IN ('75k-100k', '100k-150k', '150k+');
```

## Benefits of This Approach

1. **Performance**: Main users table stays lean and fast
2. **Flexibility**: Easy to add new optional fields without affecting core functionality
3. **Privacy**: Sensitive data can have different access controls
4. **Scalability**: Only create records when additional data exists
5. **Backward Compatibility**: Existing code continues to work with main users table

## Migration Note
If you have existing data in the old columns, uncomment and run the migration query at the bottom of the SQL file to preserve that data.