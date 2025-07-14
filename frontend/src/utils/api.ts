import axios, { AxiosResponse } from 'axios';
import { User, Survey, Call, ApiResponse, DashboardStats } from '../types';
import { supabaseApi } from './supabaseApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Check if we should use Supabase API (outside of React component context)
const shouldUseSupabase = () => {
  return process.env.REACT_APP_SUPABASE_URL && 
         process.env.REACT_APP_SUPABASE_URL !== 'your-supabase-project-url';
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  setup: async (token: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ token: string; user: User }>> = await api.post('/api/auth/setup', {
      token,
      password,
    });
    return response.data;
  },

  login: async (phoneNumber: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ token: string; user: User }>> = await api.post('/api/auth/login', {
      phoneNumber,
      password,
    });
    return response.data;
  },

  logout: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/api/auth/logout');
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.get('/api/auth/me');
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response: AxiosResponse<ApiResponse<{ token: string }>> = await api.post('/api/auth/refresh');
    return response.data;
  },
};

// User API
export const userApi = {
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    if (shouldUseSupabase()) {
      const result = await supabaseApi.user.getDashboardStats();
      return {
        data: result.data || undefined,
        error: result.error
      };
    }
    const response: AxiosResponse<ApiResponse<DashboardStats>> = await api.get('/api/users/dashboard-stats');
    return response.data;
  },

  updateProfile: async (profileData: Partial<User>): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.put('/api/users/profile', profileData);
    return response.data;
  },

  getEarningsHistory: async (): Promise<ApiResponse<Call[]>> => {
    const response: AxiosResponse<ApiResponse<Call[]>> = await api.get('/api/users/earnings-history');
    return response.data;
  },
};

// Survey API
export const surveyApi = {
  getAvailableSurveys: async (): Promise<ApiResponse<Survey[]>> => {
    if (shouldUseSupabase()) {
      const result = await supabaseApi.survey.getAvailableSurveys();
      return {
        data: result.data || undefined,
        error: result.error
      };
    }
    const response: AxiosResponse<ApiResponse<Survey[]>> = await api.get('/api/surveys/available');
    return response.data;
  },

  getSurveyDetails: async (surveyId: string): Promise<ApiResponse<Survey>> => {
    const response: AxiosResponse<ApiResponse<Survey>> = await api.get(`/api/surveys/${surveyId}`);
    return response.data;
  },

  startSurvey: async (surveyId: string): Promise<ApiResponse<{ callId: string }>> => {
    const response: AxiosResponse<ApiResponse<{ callId: string }>> = await api.post(`/api/surveys/${surveyId}/start`);
    return response.data;
  },
};

// Call API
export const callApi = {
  getCallStatus: async (callId: string): Promise<ApiResponse<Call>> => {
    const response: AxiosResponse<ApiResponse<Call>> = await api.get(`/api/calls/${callId}/status`);
    return response.data;
  },

  getUserCalls: async (): Promise<ApiResponse<Call[]>> => {
    const response: AxiosResponse<ApiResponse<Call[]>> = await api.get('/api/calls/user');
    return response.data;
  },
};

// Subscription API
export const subscriptionApi = {
  getSubscriptionInfo: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/subscriptions/info');
    return response.data;
  },

  createCheckoutSession: async (tier: 'pro' | 'elite'): Promise<ApiResponse<{ sessionUrl: string }>> => {
    const response: AxiosResponse<ApiResponse<{ sessionUrl: string }>> = await api.post('/api/subscriptions/checkout', {
      tier,
    });
    return response.data;
  },

  cancelSubscription: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/api/subscriptions/cancel');
    return response.data;
  },
};

export default api;