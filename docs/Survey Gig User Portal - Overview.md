# Survey Gig User Portal - Technical Specification

## Overview
A voice-based survey response platform where users earn money by answering questions via AI-generated phone calls. The system features a three-tier subscription model (Basic, Pro, Elite) with quality-based dynamic pricing and SMS onboarding.

## System Architecture

### Core Technology Stack
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL with Redis session management
- **Frontend**: React with Progressive Web App capabilities
- **Authentication**: JWT with bcrypt password hashing
- **Voice Integration**: Twilio Voice + ElevenLabs TTS
- **Payment Processing**: Stripe for subscriptions and payouts
- **SMS Integration**: Twilio SMS for onboarding

### Database Schema

```sql
-- Users table
Users: userId (UUID), phoneNumber (string), age (int), occupation (string), 
       location (string), tier (enum: basic/pro/elite), earnings (decimal), 
       qualityScore (decimal), createdAt (timestamp), lastActive (timestamp),
       subscriptionStatus (enum), stripeCustomerId (string)

-- Surveys table  
Surveys: surveyId (UUID), title (string), questions (JSON array), 
         targetDemographics (JSON), baseReward (decimal), clientId (UUID),
         createdAt (timestamp), status (enum: active/completed/paused)

-- Calls table
Calls: callId (UUID), userId (UUID), surveyId (UUID), 
       status (enum: pending/in-progress/completed/failed),
       responses (JSON array), earnings (decimal), qualityScores (JSON),
       completedAt (timestamp), audioFileUrl (string)

-- Subscriptions table
Subscriptions: subscriptionId (UUID), userId (UUID), tier (enum),
               monthlyFee (decimal), startDate (timestamp), 
               nextBillingDate (timestamp), status (enum)
```

## User Onboarding Flow

### SMS Registration System
1. **Inbound SMS Processing**
   - Webhook endpoint: `POST /webhook/sms`
   - Expected format: "AGE OCCUPATION CITY" (e.g., "28 Software Engineer Austin")
   - Data validation and normalization pipeline
   - Automatic feature inference algorithm execution

2. **Feature Inference Engine**
   ```javascript
   const inferUserCharacteristics = (age, occupation, location) => {
     return {
       incomeLevel: calculateIncome(occupation, location, age),
       educationLevel: inferEducation(occupation),
       housingSituation: inferHousing(age, income, location),
       familyStatus: inferFamily(age),
       techAdoption: inferTechLevel(age, occupation),
       politicalLeaning: inferPolitics(location, occupation, age),
       mediaConsumption: inferMedia(age, techAdoption, location)
     };
   };
   ```

3. **Token Generation & Dashboard Link**
   - Generate secure JWT token (24-hour expiration)
   - Send SMS with personalized dashboard URL
   - URL format: `https://surveygig.com/setup?token={jwt_token}`

## Three-Tier Membership System

### Basic Tier (Free)
**Features:**
- 1-2 consumer surveys per week
- $1-3 base payment per survey
- $25 minimum payout threshold
- Standard demographics only
- Basic customer support

**Survey Types:**
- Consumer preference questions (2-3 minutes)
- Examples: "Coke vs Pepsi preference", "Online shopping frequency"

### Pro Tier ($19/month)
**Features:**
- 5-10 professional surveys per week
- $5-15 base payment per survey
- Instant payouts (no minimum)
- Enhanced demographic collection
- Priority customer support
- Demographic bonus multipliers

**Enhanced Demographics Collection:**
- Income verification
- Education credentials
- Work experience details
- Company size and industry
- Professional certifications

**Survey Types:**
- Professional insights (5-15 minutes)
- Examples: "Software tool selection process", "B2B vendor evaluation"

### Elite Tier ($199/month + Application Process)
**Features:**
- 2-3 high-value surveys per week
- $200-1,500 payment per survey
- Custom research projects
- Dedicated account manager
- Networking events access

**Application Requirements:**
- LinkedIn integration & verification
- Video interview (15 minutes)
- Professional reference checks
- Verified leadership role (Director+)
- $200K+ income verification

## Web Dashboard Interface

### Main Dashboard Layout
```javascript
// Dashboard Components Structure
const UserDashboard = () => {
  return (
    <div className="dashboard-container">
      <Header userTier={userTier} earnings={totalEarnings} />
      <StatsOverview 
        totalEarnings={totalEarnings}
        completedSurveys={completedCount}
        availableOpportunities={availableCount}
        qualityRating={qualityScore}
      />
      <SurveyMarketplace surveys={availableSurveys} userTier={userTier} />
      <ProfileSidebar userData={userData} />
    </div>
  );
};
```

### Survey Marketplace Interface
- **Dynamic Pricing Display**: Shows base reward + demographic bonuses
- **Survey Metadata**: Time estimate, target audience, difficulty level
- **Matching Indicators**: Visual indicators showing why user qualifies
- **One-Click Start**: Simple survey initiation with call scheduling

### Real-Time Features
- WebSocket connections for live updates
- Call status tracking with progress indicators
- Earnings updates in real-time
- Survey availability notifications

## Quality Scoring System

### Four Quality Dimensions (1-5 scale each)
1. **Response Richness (25%)**
   - 1 star: One-word answers
   - 5 stars: Detailed storytelling with context

2. **Emotional Depth (25%)**
   - 1 star: Monotone delivery
   - 5 stars: Rich emotional storytelling

3. **Insight Value (25%)**
   - 1 star: No actionable insights
   - 5 stars: Breakthrough insights

4. **Audio Clarity (25%)**
   - 1 star: Poor audio quality
   - 5 stars: Studio-quality audio

### Payment Calculation Algorithm
```javascript
const calculatePayment = (baseRate, qualityScores, userTier) => {
  const overallQuality = (
    qualityScores.richness + 
    qualityScores.emotion + 
    qualityScores.insight + 
    qualityScores.clarity
  ) / 4;
  
  // Quality multiplier
  let qualityMultiplier;
  if (overallQuality >= 4.5) qualityMultiplier = 1.0;
  else if (overallQuality >= 4.0) qualityMultiplier = 0.9;
  else if (overallQuality >= 3.5) qualityMultiplier = 0.8;
  else if (overallQuality >= 3.0) qualityMultiplier = 0.7;
  else qualityMultiplier = 0.6;
  
  // Tier multiplier
  const tierMultiplier = userTier === 'elite' ? 1.25 : 
                        userTier === 'pro' ? 1.15 : 1.0;
  
  // Demographic bonuses (Pro/Elite only)
  const demographicBonus = calculateDemographicBonus(userData, surveyRequirements);
  
  return (baseRate * qualityMultiplier * tierMultiplier) + demographicBonus;
};
```

## Voice Call Integration

### Twilio Voice Setup
- **Call Initiation**: `POST /api/surveys/{surveyId}/start-call`
- **TwiML Response Generation**: Dynamic call flow based on survey questions
- **Call Recording**: Automatic recording with cloud storage
- **Call Status Webhooks**: Real-time status updates

### ElevenLabs Integration
```javascript
const generateVoiceQuestion = async (questionText) => {
  const response = await elevenLabs.textToSpeech({
    text: questionText,
    voice_id: "default_voice",
    model_id: "eleven_monolingual_v1"
  });
  return response.audioBuffer;
};
```

### Call Flow Management
1. **Call Initiation**: User clicks "Start Survey" → Twilio initiates call
2. **Introduction**: AI voice explains survey and consent
3. **Questions**: Sequential question delivery with response recording
4. **Completion**: Thank you message and payment confirmation

## Payment & Subscription Management

### Stripe Integration
- **Subscription Management**: Monthly billing for Pro/Elite tiers
- **Payout Processing**: Weekly payouts to user bank accounts/PayPal
- **Payment Methods**: Support for multiple payout options
- **Invoice Generation**: Automated billing and receipt generation

### Payout Thresholds
- **Basic**: $25 minimum (weekly payouts)
- **Pro**: Instant payouts available
- **Elite**: Instant payouts with priority processing

## User Profile Management

### Profile Components
```javascript
const UserProfile = () => {
  return (
    <div className="profile-container">
      <BasicDemographics 
        age={userData.age}
        occupation={userData.occupation}
        location={userData.location}
      />
      {userTier !== 'basic' && (
        <EnhancedDemographics 
          income={userData.income}
          education={userData.education}
          experience={userData.workExperience}
          company={userData.companyInfo}
        />
      )}
      <EarningsHistory earnings={earningsHistory} />
      <QualityMetrics qualityScores={qualityHistory} />
      <TierUpgradePrompts currentTier={userTier} />
    </div>
  );
};
```

### Data Privacy & Security
- **Encryption**: All voice recordings encrypted at rest
- **GDPR Compliance**: User data deletion and export capabilities
- **Consent Management**: Clear opt-in/opt-out mechanisms
- **Anonymization**: PII removal for aggregated analytics

## Survey Question Pool (MVP)

### Universal Research Questions (No specific product needed)
1. **E-commerce Checkout Experience**
   - "Walk me through the last time you abandoned an online shopping cart"
   - "Describe your ideal checkout process"

2. **Mobile App Frustrations**
   - "Tell me about the last time a mobile app really annoyed you"
   - "What makes you immediately delete an app?"

3. **Food Delivery Experience**
   - "Walk me through your last food delivery experience"
   - "What would make you choose one delivery app over another?"

4. **Remote Work Challenges**
   - "What's the biggest challenge you face working from home?"
   - "Describe your ideal home office setup"

5. **Healthcare Experience**
   - "Describe your last visit to a healthcare provider"
   - "How do you research health information online?"

## Gamification & Engagement Features

### Achievement System
- **Survey Completion Streaks**: Bonus multipliers for consistency
- **Quality Rating Improvements**: Rewards for improving response quality
- **Monthly Leaderboards**: Top earners recognition (opt-in)
- **Milestone Rewards**: Special bonuses at earning milestones

### Psychological Optimization
- **FOMO Notifications**: "3 premium surveys ending today"
- **Social Proof**: "Top 15% of earners completed this survey"
- **Progress Tracking**: Visual progress bars and completion rates
- **VIP Messaging**: Tier-specific exclusive language

## Progressive Web App Features

### Mobile-First Design
- **Responsive Layout**: Optimized for mobile devices (80% of users)
- **Offline Capabilities**: Dashboard viewing without internet
- **Push Notifications**: Survey availability alerts
- **App-Like Experience**: Home screen installation option

### Performance Requirements
- **Loading Speed**: <2 seconds initial load time
- **Call Quality**: HD audio recording and playback
- **Real-Time Updates**: <500ms latency for status changes
- **Uptime**: 99.9% availability SLA

## Analytics & Reporting (User-Facing)

### User Dashboard Analytics
- **Earnings Tracking**: Real-time and historical earnings
- **Quality Trends**: Quality score improvements over time
- **Survey Completion Rate**: Success metrics and patterns
- **Time Investment**: Hours spent vs. earnings analysis

### Personalized Insights
- **Optimal Survey Times**: When user performs best
- **Quality Improvement Tips**: Specific recommendations
- **Earning Potential**: Projected monthly earnings by tier
- **Demographic Value**: How user's profile affects earnings

## Implementation Timeline

### Phase 1 (Weeks 1-4): Foundation
- SMS onboarding system
- User authentication
- Basic database setup
- Feature inference algorithm

### Phase 2 (Weeks 5-8): Dashboard Development
- React dashboard creation
- Three-tier system implementation
- Survey marketplace interface
- Payment integration

### Phase 3 (Weeks 9-12): Voice Integration
- Twilio Voice setup
- ElevenLabs integration
- Call flow management
- Quality scoring system

### Phase 4 (Weeks 13-16): Advanced Features
- Elite tier application process
- Dynamic pricing algorithm
- Gamification features
- Advanced analytics

## Success Metrics

### User Engagement
- **Monthly Active Users**: Target 1,000+ by month 3
- **Survey Completion Rate**: >85% completion rate
- **User Retention**: >60% 30-day retention
- **Quality Score Trends**: Average quality score >3.5

### Revenue Metrics
- **Tier Conversion**: 20%+ upgrade to Pro/Elite
- **Revenue Per User**: $15+ monthly average
- **Payment Disputes**: <5% of transactions
- **User Satisfaction**: >4.0/5.0 rating

This technical specification provides a complete blueprint for building the user-side portal of your voice data collection platform, focusing on the core user experience while supporting the sophisticated three-tier business model and quality-based pricing system.