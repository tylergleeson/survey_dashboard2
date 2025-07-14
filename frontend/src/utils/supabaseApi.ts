import { supabase } from '../config/supabase';
import { User, Survey, DashboardStats, Call } from '../types';

export const supabaseApi = {
  // Authentication
  auth: {
    async demoLogin() {
      // For demo mode, return mock data
      const mockUser: User = {
        user_id: 'demo-user-123',
        phone_number: '+1 (555) 123-4567',
        age: 28,
        occupation: 'Software Engineer',
        location: 'Austin',
        tier: 'pro',
        earnings: 1247.50,
        quality_score: 4.2,
        subscription_status: 'active',
        created_at: '2024-01-15T10:30:00Z',
        last_active: new Date().toISOString(),
        income_level: 'upper-middle',
        education_level: 'bachelors',
        housing_situation: 'owned-condo',
        family_status: 'single-dating',
        tech_adoption: 'early-adopter',
        political_leaning: 'moderate',
        media_consumption: 'digital-first'
      };

      return {
        data: {
          user: mockUser,
          token: 'demo-token-123'
        },
        error: null
      };
    },

    async login(phoneNumber: string, password: string) {
      // TODO: Implement real Supabase auth when ready
      // For now, fall back to the backend API
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password })
      });
      return await response.json();
    },

    async logout() {
      await supabase.auth.signOut();
      return { success: true };
    },

    async getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      return { data: { user }, error: null };
    }
  },


  // Surveys
  survey: {
    async getAvailableSurveys(): Promise<{ data: Survey[] | null, error: any }> {
      try {
        // Check if in demo mode
        if (localStorage.getItem('demoMode') === 'true') {
          const mockSurveys: Survey[] = [
            {
              survey_id: 'demo-1',
              title: 'E-commerce Checkout Experience',
              questions: [],
              base_reward: 3.00,
              tier_requirements: 'basic',
              estimated_duration: 3,
              category: 'consumer',
              status: 'active',
              created_at: '2024-01-20T10:00:00Z',
              potential_earnings: { total_potential: 4.50, demographic_bonus: 1.50 }
            },
            {
              survey_id: 'demo-2', 
              title: 'Professional Software Tools',
              questions: [],
              base_reward: 12.00,
              tier_requirements: 'pro',
              estimated_duration: 8,
              category: 'professional',
              status: 'active',
              created_at: '2024-01-20T11:00:00Z',
              potential_earnings: { total_potential: 15.50, demographic_bonus: 3.50 }
            },
            {
              survey_id: 'demo-3',
              title: 'Mobile App User Experience',
              questions: [],
              base_reward: 5.00,
              tier_requirements: 'basic',
              estimated_duration: 5,
              category: 'technology',
              status: 'active',
              created_at: '2024-01-20T12:00:00Z',
              potential_earnings: { total_potential: 6.25, demographic_bonus: 1.25 }
            }
          ];
          
          return { data: mockSurveys, error: null };
        }

        // Real implementation with Supabase
        const { data, error } = await supabase
          .from('surveys')
          .select(`
            survey_id,
            title,
            questions,
            base_reward,
            tier_requirements,
            estimated_duration,
            category,
            status,
            created_at
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Add potential earnings calculation
        const surveysWithEarnings = data?.map(survey => ({
          ...survey,
          potential_earnings: {
            total_potential: survey.base_reward * 1.25,
            demographic_bonus: survey.base_reward * 0.25
          }
        })) || [];

        return { data: surveysWithEarnings, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    async getSurveyById(id: string): Promise<{ data: Survey | null, error: any }> {
      try {
        const { data, error } = await supabase
          .from('surveys')
          .select('*')
          .eq('survey_id', id)
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Real-time subscription for survey updates
    subscribeToSurveys(callback: (payload: any) => void) {
      return supabase
        .channel('surveys')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'surveys' 
        }, callback)
        .subscribe();
    }
  },

  // User management
  user: {
    async getDashboardStats(): Promise<{ data: DashboardStats | null, error: any }> {
      try {
        // Check if in demo mode
        if (localStorage.getItem('demoMode') === 'true') {
          return {
            data: {
              totalEarnings: 1247.50,
              completedSurveys: 23,
              availableOpportunities: 8,
              qualityRating: 4.2,
              monthlyEarnings: 325.00,
              surveyCompletionRate: 87.5
            },
            error: null
          };
        }

        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('User not authenticated');

        // Real implementation with Supabase
        const { data, error } = await supabase
          .from('calls')
          .select(`
            earnings,
            quality_scores,
            status,
            created_at
          `)
          .eq('user_id', authUser.id)
          .eq('status', 'completed');

        if (error) throw error;

        // Calculate stats from data
        const totalEarnings = data?.reduce((sum, call) => sum + (call.earnings || 0), 0) || 0;
        const completedSurveys = data?.length || 0;
        
        // Get available surveys count
        const { data: availableSurveys, error: surveyError } = await supabase
          .from('surveys')
          .select('survey_id')
          .eq('status', 'active');

        if (surveyError) throw surveyError;

        const stats: DashboardStats = {
          totalEarnings,
          completedSurveys,
          availableOpportunities: availableSurveys?.length || 0,
          qualityRating: 4.2, // TODO: Calculate from quality_scores
          monthlyEarnings: 325.00, // TODO: Calculate current month
          surveyCompletionRate: 87.5 // TODO: Calculate completion rate
        };

        return { data: stats, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    async updateProfile(profileData: Partial<User>): Promise<{ data: User | null, error: any }> {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('users')
          .update(profileData)
          .eq('user_id', authUser.id)
          .select()
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    async getEarningsHistory(): Promise<{ data: Call[] | null, error: any }> {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('calls')
          .select(`
            call_id,
            user_id,
            survey_id,
            status,
            responses,
            earnings,
            quality_scores,
            completed_at,
            created_at,
            surveys(title)
          `)
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return { data: data || [], error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  },

  // Calls API
  call: {
    async getCallStatus(callId: string): Promise<{ data: Call | null, error: any }> {
      try {
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .eq('call_id', callId)
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    async getUserCalls(): Promise<{ data: Call[] | null, error: any }> {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return { data: data || [], error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  },

  // Subscriptions API
  subscription: {
    async getSubscriptionInfo(): Promise<{ data: any | null, error: any }> {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

        return { data: data || null, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    async createCheckoutSession(tier: 'pro' | 'elite'): Promise<{ data: { sessionUrl: string } | null, error: any }> {
      // This would integrate with Stripe - for now return placeholder
      return { 
        data: { sessionUrl: 'https://checkout.stripe.com/placeholder' }, 
        error: null 
      };
    },

    async cancelSubscription(): Promise<{ data: any | null, error: any }> {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', authUser.id)
          .eq('status', 'active');

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  },

  // Real-time helpers
  realtime: {
    // Subscribe to user's call updates
    subscribeToUserCalls(userId: string, callback: (payload: any) => void) {
      return supabase
        .channel(`user-calls-${userId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'calls',
          filter: `user_id=eq.${userId}`
        }, callback)
        .subscribe();
    }
  }
};

export default supabaseApi;