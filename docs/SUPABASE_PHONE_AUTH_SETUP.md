# Supabase Phone Authentication Setup

This guide will help you configure Supabase phone authentication to replace the SMS onboarding system.

## Prerequisites

1. ✅ Supabase project created and configured
2. ✅ Environment variables set up (REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)
3. ✅ Database schema created

## 1. Enable Phone Authentication in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Settings**
3. Scroll to **Auth Providers**
4. Enable **Phone** provider
5. Configure your SMS provider (Twilio recommended):
   - Account SID: Your Twilio Account SID
   - Auth Token: Your Twilio Auth Token  
   - Phone Number: Your Twilio phone number (e.g., +1234567890)
   - Message Service SID: (Optional) Your Twilio Messaging Service SID

## 2. Configure Phone Auth Settings

In **Authentication → Settings → Auth Providers → Phone**:

- ✅ **Enable phone provider**: ON
- ✅ **Confirm phone number via SMS**: ON
- ✅ **Phone number confirmation**: Required
- ✅ **SMS template**: Customize if needed (default: "Your code is {{ .Token }}")

## 3. Set SMS Template (Optional)

You can customize the verification SMS template:

```
Your Survey Gig verification code is {{ .Token }}. This code expires in 10 minutes.
```

## 4. Configure Rate Limiting

In **Authentication → Settings → Rate Limiting**:

- **Phone signup**: 10 requests per hour (recommended)
- **Phone confirmation**: 10 requests per hour (recommended)  
- **Phone resend**: 5 requests per hour (recommended)

## 5. Test Phone Authentication

### Using the New Signup Flow:

1. Start your frontend: `npm run frontend:start`
2. Navigate to http://localhost:3001/signup
3. Enter a valid phone number
4. Check for SMS verification code
5. Enter code and create password
6. Verify login works at http://localhost:3001/login

### Manual Testing with Supabase Dashboard:

1. Go to **Authentication → Users**
2. Click **Invite user**
3. Select **Via phone number**
4. Enter test phone number
5. Verify SMS is received

## 6. Update Database Schema (if needed)

The signup flow automatically creates user profiles. Ensure your `users` table has:

```sql
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_status VARCHAR(20) DEFAULT 'active',
  tier VARCHAR(10) DEFAULT 'basic',
  earnings DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(3,2) DEFAULT 0,
  -- Add other fields as needed
  age INTEGER,
  occupation VARCHAR(100),
  location VARCHAR(100)
);
```

## 7. Verify Implementation

✅ **New signup flow works**:
- Phone number input
- SMS verification 
- Password creation
- User profile creation

✅ **Login updated**:
- Uses Supabase auth instead of custom backend
- Phone + password authentication
- JWT session management

✅ **Old SMS onboarding disabled**:
- `/webhook/sms` endpoint disabled
- No more "text AGE OCCUPATION CITY" flow

## 8. Production Considerations

### Security:
- Enable phone confirmation in production
- Set appropriate rate limits
- Monitor authentication attempts

### SMS Costs:
- Monitor SMS usage in Twilio dashboard
- Set billing alerts
- Consider SMS templates to reduce character count

### User Experience:
- Test phone verification with different carriers
- Verify international phone number support if needed
- Test resend code functionality

## 9. Troubleshooting

### Common Issues:

**SMS not received:**
- Check Twilio phone number configuration
- Verify phone number format (+1234567890)
- Check Twilio console for delivery status

**Authentication errors:**
- Verify environment variables are set
- Check Supabase project URL and keys
- Review browser console for errors

**Database errors:**
- Ensure `users` table exists
- Check Row Level Security policies
- Verify user_id matches Supabase auth user ID

### Debug Commands:

```bash
# Check Supabase connection
curl http://localhost:3000/api/test-db

# View authentication logs
# Go to Supabase Dashboard → Logs → Auth
```

## 10. Migration Notes

The new system:
- ✅ Replaces SMS-based onboarding with phone verification
- ✅ Uses Supabase Auth for session management  
- ✅ Maintains existing user profile structure
- ✅ Preserves phone + password authentication method
- ❌ No longer supports "text to signup" functionality

Users who previously signed up via SMS can still log in with their existing phone number and password through the regular login form.