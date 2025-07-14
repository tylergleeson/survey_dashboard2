# Supabase Setup Guide for Survey Gig

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose organization and enter project details:
   - **Name**: `survey-gig` 
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
4. Wait for project creation (~2 minutes)

## 2. Get Project Configuration

After project creation, go to Settings → API:

1. **Project URL**: Copy this value (looks like `https://xxxxx.supabase.co`)
2. **anon public key**: Copy this value (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
3. **service_role secret key**: Copy this value (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

## 3. Update Environment Variables

### Backend (backend/.env):
```env
# Replace with your actual Supabase values
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Frontend (frontend/.env):
```env
# Replace with your actual Supabase values
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Create a new query
4. Copy and paste the contents of `backend/config/init.sql`
5. Click "Run" to execute the schema
6. Verify tables were created in the "Table Editor"

## 5. Configure Row Level Security

1. In SQL Editor, create another new query
2. Copy and paste the contents of `backend/config/supabase-rls.sql`
3. Click "Run" to execute the RLS policies
4. Verify policies were created in Settings → Database → Policies

## 6. Enable Real-time (Optional)

1. Go to Settings → API
2. Scroll down to "Realtime"
3. Enable real-time for these tables:
   - `surveys` (for live survey updates)
   - `calls` (for call status updates)
   - `user_achievements` (for live achievement notifications)

## 7. Test Connection

### Start Supabase-enabled Backend:
```bash
# From project root
npm run backend:supabase

# OR manually:
cd backend && node server-supabase.js
```

### Test endpoints:
```bash
# Health check
curl http://localhost:3000/health

# Test database connection
curl http://localhost:3000/api/test-db

# Should return surveys from your database
```

### Test Frontend:
1. Start frontend: `npm run frontend:start`
2. Open http://localhost:3001
3. Click "🎯 Try Demo Mode" 
4. Verify dashboard loads with mock data

### Start Both Servers:
```bash
# From project root - starts both frontend and backend
npm run dev
```

## 8. Production Considerations

### Security Settings:
1. Go to Authentication → Settings
2. Set up proper **Site URL** for production
3. Configure **Redirect URLs** for auth flows
4. Enable **Email confirmations** if using email auth

### Database Settings:
1. Go to Settings → Database
2. Enable **Connection pooling** for production
3. Set up **Database backups**
4. Monitor **Database usage** in the dashboard

### API Settings:
1. Set up **Custom Domain** if needed
2. Configure **CORS origins** for production
3. Monitor **API usage** and **rate limits**

## 9. Optional: Set Up Authentication

For production, you can replace the custom JWT system with Supabase Auth:

### Enable Phone Authentication:
1. Go to Authentication → Settings
2. Enable "Phone" provider
3. Configure Twilio credentials
4. Update frontend to use `supabase.auth.signInWithOtp()`

### User Registration Flow:
```typescript
// Replace SMS registration with Supabase Auth
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890'
})
```

## 10. Monitoring and Optimization

### Database Performance:
- Monitor query performance in SQL Editor
- Add indexes for frequently queried columns
- Use EXPLAIN ANALYZE for slow queries

### Real-time Usage:
- Monitor real-time connections in Dashboard
- Optimize subscriptions to reduce bandwidth
- Use filters to limit real-time updates

### API Usage:
- Track API calls in project dashboard
- Monitor error rates and response times
- Set up alerts for usage thresholds

## 11. Backup and Recovery

### Automated Backups:
- Daily backups enabled by default on Pro plan
- Point-in-time recovery available
- Download backups for local storage

### Manual Backup:
```sql
-- Export specific tables
COPY surveys TO '/tmp/surveys_backup.csv' DELIMITER ',' CSV HEADER;
```

## 12. Scaling Considerations

### Free Tier Limits:
- 50,000 monthly active users
- 500MB database storage
- 1GB file storage
- 2GB bandwidth

### Pro Tier Benefits ($25/month):
- 100,000 monthly active users  
- 8GB database storage
- 100GB file storage
- No pausing, custom domains

### When to Scale:
- Upgrade when approaching free tier limits
- Consider read replicas for high read workloads
- Use connection pooling for high concurrency

## Troubleshooting

### Common Issues:

1. **Connection Failed**: Check URL and keys are correct
2. **RLS Blocking Queries**: Verify policies allow your operations
3. **Real-time Not Working**: Check table publications are enabled
4. **Slow Queries**: Add appropriate indexes

### Debug Mode:
```javascript
// Enable Supabase debug logging
const supabase = createClient(url, key, {
  auth: { debug: true },
  db: { debug: true }
})
```

This setup provides a robust, scalable foundation for the Survey Gig platform with real-time capabilities, secure data access, and room for growth.