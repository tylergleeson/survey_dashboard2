import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { supabaseApi } from '../utils/supabaseApi';
import { supabase } from '../config/supabase';

const SupabaseAuthContext = createContext<AuthContextType | undefined>(undefined);

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock user data for development/demo
  const mockUser: User = {
    user_id: 'demo-user-123',
    phone_number: '+1 (555) 123-4567',
    first_name: 'Alex',
    last_name: 'Demo',
    age: 28,
    occupation: 'Software Engineer',
    city: 'Austin',
    state: 'TX',
    location: 'Austin, TX',
    tier: 'pro',
    earnings: 1247.50,
    quality_score: 4.2,
    subscription_status: 'active',
    created_at: '2024-01-15T10:30:00Z',
    last_active: new Date().toISOString()
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for demo mode flag
      const isDemo = localStorage.getItem('demoMode') === 'true';
      
      if (isDemo) {
        // Use mock data for demo
        setUser(mockUser);
        setToken('demo-token-123');
        setIsLoading(false);
        return;
      }

      // Check for existing Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setToken(session.access_token);
        // Clear demo mode since we have a real session
        localStorage.removeItem('demoMode');
        // Fetch real user data from Supabase users table
        try {
          const { data: userProfile } = await supabaseApi.user.getProfile();
          if (userProfile) {
            setUser(userProfile);
          } else {
            // User exists in auth but not in users table - don't auto-create profile
            console.log('User authenticated but profile incomplete - needs to complete signup');
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // Fall back to stored user data
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } else {
        // Check for legacy token system
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setToken(session.access_token);
          // Clear demo mode since we have a real session
          localStorage.removeItem('demoMode');
          // Fetch real user data from Supabase users table
          try {
            const { data: userProfile } = await supabaseApi.user.getProfile();
            if (userProfile) {
              setUser(userProfile);
            } else {
              // User exists in auth but not in users table - don't auto-create profile
              console.log('User authenticated but profile incomplete - needs to complete signup');
              setUser(null);
            }
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setToken(null);
          setUser(null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('demoMode');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const loginWithSupabase = async (phoneNumber: string, password: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log('Attempting login with phone:', phoneNumber);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phoneNumber,
        password: password
      });

      console.log('Auth response:', { data, error });

      if (error) throw error;

      if (data.user && data.session) {
        setToken(data.session.access_token);
        
        // Fetch user profile from our users table
        const { data: userProfiles, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', data.user.id);

        console.log('User profile fetch:', { userProfiles, profileError });

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Don't throw - create basic profile if missing
        }

        let userProfile = userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;

        if (!userProfile) {
          console.log('No user profile found, creating basic profile...');
          // Create a basic profile if it doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              user_id: data.user.id,
              phone_number: phoneNumber,
              password_hash: 'supabase_managed',
              age: 18,
              occupation: 'Not specified',
              location: 'Not specified',
              tier: 'basic',
              earnings: 0.00,
              quality_score: 0.00,
              subscription_status: 'inactive'
            })
            .select()
            .single();

          if (createError) {
            console.error('Failed to create profile:', createError);
            throw createError;
          }
          
          userProfile = newProfile;
        }

        setUser(userProfile);
        localStorage.setItem('authToken', data.session.access_token);
        localStorage.setItem('user', JSON.stringify(userProfile));
        
        return { success: true, data: { token: data.session.access_token, user: userProfile } };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const loginDemo = async () => {
    const response = await supabaseApi.auth.demoLogin();
    if (response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem('demoMode', 'true');
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('demoMode');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithSupabase,
    loginDemo,
    logout,
    isLoading,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

// Backward compatibility - export the original hook name
export const useAuth = useSupabaseAuth;