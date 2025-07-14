import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountCircle,
  TrendingUp,
  Assignment,
  Star,
  Phone,
  Logout,
  Settings,
  MonetizationOn,
} from '@mui/icons-material';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { userApi, surveyApi } from '../utils/api';
import { DashboardStats, Survey } from '../types';

const Dashboard: React.FC = () => {
  const { user, logout } = useSupabaseAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableSurveys, setAvailableSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Check if in demo mode
      const isDemo = localStorage.getItem('demoMode') === 'true';
      
      if (isDemo) {
        // Use mock data for demo
        setStats({
          totalEarnings: 1247.50,
          completedSurveys: 23,
          availableOpportunities: 8,
          qualityRating: 4.2,
          monthlyEarnings: 325.00,
          surveyCompletionRate: 87.5
        });
        
        setAvailableSurveys([
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
        ]);
        
        setIsLoading(false);
        return;
      }

      try {
        const [statsResponse, surveysResponse] = await Promise.all([
          userApi.getDashboardStats(),
          surveyApi.getAvailableSurveys()
        ]);

        if (statsResponse.data) {
          setStats(statsResponse.data);
        }

        if (surveysResponse.data) {
          setAvailableSurveys(surveysResponse.data.slice(0, 3)); // Show top 3
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'elite': return 'secondary';
      case 'pro': return 'primary';
      default: return 'default';
    }
  };

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {user?.phone_number?.slice(-4) || 'User'}!
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              label={getTierLabel(user?.tier || 'basic')} 
              color={getTierColor(user?.tier || 'basic')}
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              Quality Score: {user?.quality_score?.toFixed(1) || '0.0'}/5.0
            </Typography>
          </Box>
        </Box>
        <Box>
          <IconButton onClick={handleProfileMenuOpen} size="large">
            <Avatar>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              <Settings sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={() => navigate('/subscription')}>
              <TrendingUp sx={{ mr: 1 }} /> Subscription
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box 
        display="grid" 
        gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" 
        gap={3} 
        mb={4}
      >
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <MonetizationOn color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Earnings
                </Typography>
                <Typography variant="h5">
                  ${stats?.totalEarnings?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Assignment color="success" sx={{ mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Completed Surveys
                </Typography>
                <Typography variant="h5">
                  {stats?.completedSurveys || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Phone color="info" sx={{ mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Available Opportunities
                </Typography>
                <Typography variant="h5">
                  {stats?.availableOpportunities || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Star color="warning" sx={{ mr: 2 }} />
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  This Month
                </Typography>
                <Typography variant="h5">
                  ${stats?.monthlyEarnings?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Quick Actions */}
      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} 
        gap={3}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Available Surveys
            </Typography>
            {availableSurveys.length === 0 ? (
              <Typography color="text.secondary">
                No surveys available at the moment. Check back later!
              </Typography>
            ) : (
              <Box>
                {availableSurveys.map((survey: any) => (
                  <Box
                    key={survey.survey_id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={2}
                    borderBottom="1px solid"
                    borderColor="divider"
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {survey.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {survey.category} • {survey.estimated_duration} min
                      </Typography>
                      <Typography variant="body2" color="primary">
                        Potential: ${survey.potential_earnings?.total_potential?.toFixed(2) || survey.base_reward}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate('/surveys')}
                    >
                      Start
                    </Button>
                  </Box>
                ))}
                <Box textAlign="center" mt={2}>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate('/surveys')}
                  >
                    View All Surveys
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Completion Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats?.surveyCompletionRate || 0}
                sx={{ mt: 1, mb: 1 }}
              />
              <Typography variant="body2">
                {stats?.surveyCompletionRate?.toFixed(1) || '0'}%
              </Typography>
            </Box>
            
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Quality Rating
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats?.qualityRating || 0) * 20} // Convert 5-scale to 100-scale
                color="warning"
                sx={{ mt: 1, mb: 1 }}
              />
              <Typography variant="body2">
                {stats?.qualityRating?.toFixed(1) || '0.0'}/5.0
              </Typography>
            </Box>

            {user?.tier === 'basic' && (
              <Box mt={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Upgrade to Pro for:
                </Typography>
                <Typography variant="body2" sx={{ ml: 1 }}>
                  • Higher paying surveys
                </Typography>
                <Typography variant="body2" sx={{ ml: 1 }}>
                  • Instant payouts
                </Typography>
                <Typography variant="body2" sx={{ ml: 1 }}>
                  • Priority support
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/subscription')}
                >
                  Upgrade Now
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Dashboard;