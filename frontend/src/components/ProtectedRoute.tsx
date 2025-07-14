import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredTier?: 'basic' | 'pro' | 'elite';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredTier 
}) => {
  const { user, token, isLoading } = useSupabaseAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check tier requirements
  if (requiredTier) {
    const tierLevels = { basic: 1, pro: 2, elite: 3 };
    const userTierLevel = tierLevels[user.tier];
    const requiredTierLevel = tierLevels[requiredTier];

    if (userTierLevel < requiredTierLevel) {
      return <Navigate to="/subscription" replace />;
    }
  }

  return <>{children}</>;
};