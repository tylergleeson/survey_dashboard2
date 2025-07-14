-- Row Level Security Policies for Survey Gig
-- Run these in your Supabase SQL editor after creating the tables

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demographic_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only see and update their own record
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Allow service role to manage users (for backend operations)
CREATE POLICY "Service role can manage users" ON users
    FOR ALL USING (current_setting('role') = 'service_role');

-- Surveys table policies
-- All authenticated users can view active surveys
CREATE POLICY "Authenticated users can view active surveys" ON surveys
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        status = 'active'
    );

-- Only Elite tier users can create surveys
CREATE POLICY "Elite users can create surveys" ON surveys
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND tier = 'elite'
        )
    );

-- Service role can manage all surveys
CREATE POLICY "Service role can manage surveys" ON surveys
    FOR ALL USING (current_setting('role') = 'service_role');

-- Calls table policies
-- Users can only see their own calls
CREATE POLICY "Users can view own calls" ON calls
    FOR SELECT USING (auth.uid()::text = user_id);

-- Users can update their own calls
CREATE POLICY "Users can update own calls" ON calls
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can create calls for themselves
CREATE POLICY "Users can create own calls" ON calls
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Service role can manage all calls
CREATE POLICY "Service role can manage calls" ON calls
    FOR ALL USING (current_setting('role') = 'service_role');

-- Subscriptions table policies
-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid()::text = user_id);

-- Users can create their own subscription
CREATE POLICY "Users can create own subscription" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription" ON subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
    FOR ALL USING (current_setting('role') = 'service_role');

-- User sessions table policies
-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

-- Service role can manage all sessions
CREATE POLICY "Service role can manage sessions" ON user_sessions
    FOR ALL USING (current_setting('role') = 'service_role');

-- Demographic bonuses table policies
-- All authenticated users can view demographic bonuses (for earning calculations)
CREATE POLICY "Authenticated users can view demographic bonuses" ON demographic_bonuses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can manage demographic bonuses
CREATE POLICY "Service role can manage demographic bonuses" ON demographic_bonuses
    FOR ALL USING (current_setting('role') = 'service_role');

-- User achievements table policies
-- Users can only see their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT USING (auth.uid()::text = user_id);

-- Service role can manage all achievements
CREATE POLICY "Service role can manage achievements" ON user_achievements
    FOR ALL USING (current_setting('role') = 'service_role');

-- Create a function to get current user tier (for policy checks)
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid text)
RETURNS text AS $$
DECLARE
    user_tier text;
BEGIN
    SELECT tier INTO user_tier
    FROM users
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_tier, 'basic');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_tier(text) TO authenticated, anon;

-- Create a function to check if user can access survey based on tier
CREATE OR REPLACE FUNCTION can_access_survey(survey_uuid uuid, user_uuid text)
RETURNS boolean AS $$
DECLARE
    survey_tier text;
    user_tier text;
BEGIN
    SELECT tier_requirements INTO survey_tier
    FROM surveys
    WHERE survey_id = survey_uuid;
    
    SELECT get_user_tier(user_uuid) INTO user_tier;
    
    -- Basic users can access basic surveys
    -- Pro users can access basic and pro surveys  
    -- Elite users can access all surveys
    RETURN CASE
        WHEN survey_tier = 'basic' THEN true
        WHEN survey_tier = 'pro' AND user_tier IN ('pro', 'elite') THEN true
        WHEN survey_tier = 'elite' AND user_tier = 'elite' THEN true
        ELSE false
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION can_access_survey(uuid, text) TO authenticated, anon;

-- Update surveys policy to include tier-based access
DROP POLICY IF EXISTS "Authenticated users can view active surveys" ON surveys;
CREATE POLICY "Users can view surveys based on tier" ON surveys
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        status = 'active' AND
        can_access_survey(survey_id, auth.uid()::text)
    );

-- Real-time publication for surveys (for live updates)
-- This allows clients to subscribe to survey changes
CREATE PUBLICATION survey_changes FOR TABLE surveys;

-- Real-time publication for user-specific data
CREATE PUBLICATION user_data_changes FOR TABLE calls, user_achievements WHERE (user_id = auth.uid()::text);