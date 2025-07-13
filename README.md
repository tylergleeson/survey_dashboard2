# Survey Gig User Portal

A voice-based survey response platform where users earn money by answering questions via AI-generated phone calls. Features a three-tier subscription model (Basic, Pro, Elite) with quality-based dynamic pricing and SMS onboarding.

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Authentication**: JWT with bcrypt password hashing
- **Database**: PostgreSQL with Redis session management
- **Voice Integration**: Twilio Voice + ElevenLabs TTS
- **Payment Processing**: Stripe for subscriptions and payouts
- **SMS Integration**: Twilio SMS for onboarding

### Frontend (React/TypeScript)
- **UI Framework**: Material-UI with responsive design
- **State Management**: React Context API
- **Routing**: React Router v6
- **Real-time Features**: WebSocket connections (planned)
- **PWA Capabilities**: Progressive Web App features

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Redis 6+
- Twilio account (for SMS and Voice)
- Stripe account (for payments)
- ElevenLabs account (for TTS)

### Backend Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/survey_gig
   REDIS_URL=redis://localhost:6379
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=24h
   
   # Twilio
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number
   
   # ElevenLabs
   ELEVENLABS_API_KEY=your-elevenlabs-api-key
   
   # Stripe
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   
   # App Config
   FRONTEND_URL=http://localhost:3001
   ```

3. **Database setup**
   ```bash
   # Create database
   createdb survey_gig
   
   # Run initialization script
   psql -d survey_gig -f config/init.sql
   ```

4. **Start backend server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:3000
   REACT_APP_TWILIO_PHONE=+15551234567
   ```

4. **Start frontend server**
   ```bash
   npm start
   ```

## 📱 SMS Onboarding Flow

Users can join by texting their information:

**Format**: `AGE OCCUPATION CITY`
**Example**: `28 Software Engineer Austin`

**Process**:
1. User sends SMS to Twilio number
2. System runs feature inference algorithm
3. Generates secure setup token (24-hour expiration)
4. Sends SMS with personalized dashboard URL
5. User completes account setup with password

## 🎯 Three-Tier System

### Basic Tier (Free)
- 1-2 consumer surveys per week
- $1-3 base payment per survey
- $25 minimum payout threshold
- Standard demographics only
- Basic customer support

### Pro Tier ($19/month)
- 5-10 professional surveys per week
- $5-15 base payment per survey
- Instant payouts (no minimum)
- Enhanced demographic collection
- Priority customer support
- Demographic bonus multipliers

### Elite Tier ($199/month + Application)
- 2-3 high-value surveys per week
- $200-1,500 payment per survey
- Custom research projects
- Dedicated account manager
- Networking events access
- **Requirements**: Director+ role, $200K+ income, application process

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/setup` - Complete account setup
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/dashboard-stats` - Dashboard statistics
- `PUT /api/users/profile` - Update profile
- `GET /api/users/earnings-history` - Earnings history
- `GET /api/users/tier-eligibility` - Tier upgrade eligibility

### Surveys
- `GET /api/surveys/available` - Available surveys for user
- `GET /api/surveys/:id` - Survey details
- `POST /api/surveys/:id/start` - Start survey call
- `GET /api/surveys/categories` - Survey categories

### Calls
- `GET /api/calls/:id/status` - Call status
- `GET /api/calls/user` - User's call history
- `PUT /api/calls/:id/responses` - Update call responses
- `GET /api/calls/analytics` - Call analytics

### Subscriptions
- `GET /api/subscriptions/info` - Subscription info
- `POST /api/subscriptions/checkout` - Create Stripe checkout
- `POST /api/subscriptions/cancel` - Cancel subscription

### Webhooks
- `POST /webhook/sms` - SMS onboarding webhook
- `POST /webhook/call-status` - Twilio call status
- `POST /webhook/stripe` - Stripe subscription events

## 🎨 Frontend Components

### Pages
- **Setup**: Account creation from SMS token
- **Login**: Phone number and password authentication
- **Dashboard**: Overview with stats and quick actions
- **Surveys**: Browse and start available surveys
- **Profile**: User information and earnings history
- **Subscription**: Tier management and billing

### Key Features
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: Live dashboard statistics
- **Tier-based Access**: Feature gating by subscription level
- **Quality Tracking**: Visual quality score indicators
- **Earnings Analytics**: Detailed earnings breakdown

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with 12 salt rounds
- **Session Management**: Redis-based session storage
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API endpoint protection (planned)
- **HTTPS Only**: Production security requirements

## 📊 Quality Scoring System

Four dimensions (1-5 scale each):
1. **Response Richness (25%)**: Detail and depth of answers
2. **Emotional Depth (25%)**: Emotional engagement and storytelling
3. **Insight Value (25%)**: Actionable insights provided
4. **Audio Clarity (25%)**: Technical audio quality

Payment multipliers based on overall quality:
- ≥4.5: 1.0x (full payment)
- ≥4.0: 0.9x
- ≥3.5: 0.8x
- ≥3.0: 0.7x
- <3.0: 0.6x

## 💰 Payment Calculation

```javascript
const calculatePayment = (baseRate, qualityScores, userTier, userData, surveyRequirements) => {
  const qualityMultiplier = calculateQualityMultiplier(qualityScores);
  const tierMultiplier = calculateTierMultiplier(userTier); // Basic: 1.0x, Pro: 1.15x, Elite: 1.25x
  const demographicBonus = calculateDemographicBonus(userData, surveyRequirements);
  
  return (baseRate * qualityMultiplier * tierMultiplier) + demographicBonus;
};
```

## 🗄️ Database Schema

Key tables:
- **users**: User profiles and demographics
- **surveys**: Available survey content
- **calls**: Call records and responses
- **subscriptions**: Stripe subscription data
- **user_sessions**: JWT session management
- **user_achievements**: Gamification system

## 📋 Development Commands

### Backend
```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm test            # Run tests (when implemented)
```

### Frontend
```bash
npm start           # Start development server (port 3001)
npm run build       # Build for production
npm test            # Run React tests
```

## 🔄 Deployment

### Environment Variables
Ensure all environment variables are set in production:
- Database connections (PostgreSQL, Redis)
- Third-party APIs (Twilio, Stripe, ElevenLabs)
- Security keys (JWT secret)
- App URLs (frontend URL for CORS)

### Production Considerations
- Enable HTTPS
- Configure CORS properly
- Set up error monitoring
- Enable request logging
- Configure database connection pooling
- Set up automated backups

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For technical support or questions:
- Check the troubleshooting section
- Review API documentation
- Contact development team

---

Built with ❤️ for voice-based market research.