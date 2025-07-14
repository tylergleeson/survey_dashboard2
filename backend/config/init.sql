-- Survey Gig Database Schema
-- Run this script to initialize the database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    occupation VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'elite')),
    earnings DECIMAL(10,2) DEFAULT 0.00,
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
    stripe_customer_id VARCHAR(255),
    -- Enhanced demographics for Pro/Elite
    income_level VARCHAR(50),
    education_level VARCHAR(50),
    housing_situation VARCHAR(50),
    family_status VARCHAR(50),
    tech_adoption VARCHAR(50),
    political_leaning VARCHAR(50),
    media_consumption VARCHAR(50),
    -- Pro tier additional fields
    income_verified BOOLEAN DEFAULT FALSE,
    education_credentials TEXT,
    work_experience TEXT,
    company_info JSONB,
    professional_certifications TEXT[],
    -- Elite tier additional fields
    linkedin_profile VARCHAR(255),
    video_interview_completed BOOLEAN DEFAULT FALSE,
    reference_checks_passed BOOLEAN DEFAULT FALSE,
    leadership_role_verified BOOLEAN DEFAULT FALSE,
    income_verification_documents TEXT[]
);

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
    survey_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL,
    target_demographics JSONB,
    base_reward DECIMAL(8,2) NOT NULL,
    client_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    tier_requirements VARCHAR(20) DEFAULT 'basic' CHECK (tier_requirements IN ('basic', 'pro', 'elite')),
    estimated_duration INTEGER, -- in minutes
    category VARCHAR(50),
    max_responses INTEGER DEFAULT 1000
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
    call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    survey_id UUID REFERENCES surveys(survey_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')),
    responses JSONB,
    earnings DECIMAL(8,2),
    quality_scores JSONB,
    completed_at TIMESTAMP,
    audio_file_url VARCHAR(500),
    twilio_call_sid VARCHAR(255),
    call_duration INTEGER, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'pro', 'elite')),
    monthly_fee DECIMAL(8,2) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_billing_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table (for JWT token management)
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Survey demographics mapping (for bonus calculations)
CREATE TABLE IF NOT EXISTS demographic_bonuses (
    bonus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES surveys(survey_id) ON DELETE CASCADE,
    demographic_key VARCHAR(100) NOT NULL,
    demographic_value VARCHAR(100) NOT NULL,
    bonus_amount DECIMAL(6,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements and gamification
CREATE TABLE IF NOT EXISTS user_achievements (
    achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_data JSONB,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bonus_earnings DECIMAL(6,2) DEFAULT 0.00
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_survey_id ON calls(survey_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_tier ON surveys(tier_requirements);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Sample data for development
INSERT INTO surveys (title, questions, base_reward, tier_requirements, estimated_duration, category) VALUES 
('E-commerce Checkout Experience', 
 '[{"question": "Walk me through the last time you abandoned an online shopping cart", "type": "open_ended"}, {"question": "Describe your ideal checkout process", "type": "open_ended"}]',
 3.00, 'basic', 3, 'consumer'),
('Professional Software Tools', 
 '[{"question": "Describe your software tool selection process at work", "type": "open_ended"}, {"question": "What factors influence your B2B vendor decisions?", "type": "open_ended"}]',
 12.00, 'pro', 8, 'professional'),
('Executive Decision Making', 
 '[{"question": "How do you evaluate enterprise technology investments?", "type": "open_ended"}, {"question": "Describe your strategic planning process", "type": "open_ended"}]',
 500.00, 'elite', 15, 'executive');

-- Create functions for common operations
CREATE OR REPLACE FUNCTION calculate_user_quality_score(p_user_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    avg_score DECIMAL(3,2);
BEGIN
    SELECT AVG(
        (quality_scores->>'richness')::DECIMAL + 
        (quality_scores->>'emotion')::DECIMAL + 
        (quality_scores->>'insight')::DECIMAL + 
        (quality_scores->>'clarity')::DECIMAL
    ) / 4
    INTO avg_score
    FROM calls 
    WHERE user_id = p_user_id 
    AND status = 'completed' 
    AND quality_scores IS NOT NULL;
    
    RETURN COALESCE(avg_score, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user quality score after call completion
CREATE OR REPLACE FUNCTION update_user_quality_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.quality_scores IS NOT NULL THEN
        UPDATE users 
        SET quality_score = calculate_user_quality_score(NEW.user_id),
            last_active = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quality_score
    AFTER UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_user_quality_score();