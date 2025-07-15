import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
// import { authApi } from '../utils/api'; // DISABLED - Using Supabase Auth now

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
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

      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Legacy auth validation disabled - using Supabase Auth now
          // const response = await authApi.getCurrentUser();
          // if (response.data?.user) {
          //   setUser(response.data.user);
          //   localStorage.setItem('user', JSON.stringify(response.data.user));
          // }
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const loginDemo = () => {
    setToken('demo-token-123');
    setUser(mockUser);
    localStorage.setItem('demoMode', 'true');
    localStorage.setItem('authToken', 'demo-token-123');
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('demoMode');
    
    // Legacy logout API disabled - using Supabase Auth now
    // if (localStorage.getItem('demoMode') !== 'true') {
    //   authApi.logout().catch(console.error);
    // }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    loginDemo,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};