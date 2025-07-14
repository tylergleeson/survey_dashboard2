import { User, Survey, Call, ApiResponse, DashboardStats } from '../types';
import { supabaseApi } from './supabaseApi';

// Legacy axios configuration removed - using Supabase directly

// Auth API - Now handled by Supabase Auth in SupabaseAuthContext
// Legacy auth functions removed - use useSupabaseAuth hook instead

// User API
export const userApi = {
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const result = await supabaseApi.user.getDashboardStats();
    return {
      data: result.data || undefined,
      error: result.error
    };
  },

  updateProfile: async (profileData: Partial<User>): Promise<ApiResponse<User>> => {
    const result = await supabaseApi.user.updateProfile(profileData);
    return {
      data: result.data || undefined,
      error: result.error
    };
  },

  getEarningsHistory: async (): Promise<ApiResponse<Call[]>> => {
    const result = await supabaseApi.user.getEarningsHistory();
    return {
      data: result.data || undefined,
      error: result.error
    };
  },
};

// Survey API
export const surveyApi = {
  getAvailableSurveys: async (): Promise<ApiResponse<Survey[]>> => {
    const result = await supabaseApi.survey.getAvailableSurveys();
    return {
      data: result.data || undefined,
      error: result.error
    };
  },

  getSurveyDetails: async (surveyId: string): Promise<ApiResponse<Survey>> => {
    const result = await supabaseApi.survey.getSurveyById(surveyId);
    return {
      data: result.data || undefined,
      error: result.error
    };
  },

  startSurvey: async (surveyId: string): Promise<ApiResponse<{ callId: string }>> => {
    // This would create a new call record in Supabase
    // For now, return a placeholder implementation
    return {
      data: { callId: 'placeholder-call-id' },
      error: undefined
    };
  },
};

// Call API
export const callApi = {
  getCallStatus: async (callId: string): Promise<ApiResponse<Call>> => {
    const result = await supabaseApi.call.getCallStatus(callId);
    return {
      data: result.data || undefined,
      error: result.error
    };
  },

  getUserCalls: async (): Promise<ApiResponse<Call[]>> => {
    const result = await supabaseApi.call.getUserCalls();
    return {
      data: result.data || undefined,
      error: result.error
    };
  },
};

// Subscription API
export const subscriptionApi = {
  getSubscriptionInfo: async (): Promise<ApiResponse<any>> => {
    const result = await supabaseApi.subscription.getSubscriptionInfo();
    return {
      data: result.data || undefined,
      error: result.error
    };
  },

  createCheckoutSession: async (tier: 'pro' | 'elite'): Promise<ApiResponse<{ sessionUrl: string }>> => {
    const result = await supabaseApi.subscription.createCheckoutSession(tier);
    return {
      data: result.data || undefined,
      error: result.error
    };
  },

  cancelSubscription: async (): Promise<ApiResponse<any>> => {
    const result = await supabaseApi.subscription.cancelSubscription();
    return {
      data: result.data || undefined,
      error: result.error
    };
  },
};

// Legacy default export removed - use individual API exports above