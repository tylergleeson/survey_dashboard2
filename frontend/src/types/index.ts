export interface User {
  user_id: string;
  phone_number: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  age: number;
  occupation: string;
  city?: string;
  state?: string;
  location: string; // Combined "city, state"
  tier: 'basic' | 'pro' | 'elite';
  earnings: number;
  quality_score: number;
  subscription_status: 'active' | 'inactive' | 'cancelled';
  created_at?: string;
  last_active?: string;
}

export interface UserAdditionalData {
  user_id: string;
  stripe_customer_id?: string;
  income_level?: string;
  education_level?: string;
  housing_situation?: string;
  family_status?: string;
  tech_adoption?: string;
  political_leaning?: string;
  media_consumption?: string;
  income_verified?: boolean;
  video_interview_completed?: boolean;
  reference_checks_passed?: boolean;
  leadership_role_verified?: boolean;
  education_credentials?: string;
  work_experience?: string;
  company_info?: any;
  professional_certifications?: string[];
  linkedin_profile?: string;
  income_verification_documents?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Survey {
  survey_id: string;
  title: string;
  questions: SurveyQuestion[];
  target_demographics?: any;
  base_reward: number;
  tier_requirements: 'basic' | 'pro' | 'elite';
  estimated_duration: number;
  category: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  potential_earnings?: {
    total_potential: number;
    demographic_bonus: number;
  };
}

export interface SurveyQuestion {
  question: string;
  type: 'open_ended' | 'multiple_choice' | 'rating';
  options?: string[];
}

export interface Call {
  call_id: string;
  user_id: string;
  survey_id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  responses?: any;
  earnings?: number;
  quality_scores?: QualityScores;
  completed_at?: string;
  audio_file_url?: string;
  call_duration?: number;
  created_at: string;
}

export interface QualityScores {
  richness: number;
  emotion: number;
  insight: number;
  clarity: number;
}

export interface Subscription {
  subscription_id: string;
  user_id: string;
  tier: 'basic' | 'pro' | 'elite';
  monthly_fee: number;
  start_date: string;
  next_billing_date?: string;
  status: 'active' | 'cancelled' | 'past_due';
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  loginWithSupabase?: (phoneNumber: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  loginDemo: () => void;
  logout: () => void;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalEarnings: number;
  completedSurveys: number;
  availableOpportunities: number;
  qualityRating: number;
  monthlyEarnings: number;
  surveyCompletionRate: number;
}