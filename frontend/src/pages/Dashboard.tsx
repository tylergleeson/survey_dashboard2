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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
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
  Add,
  Person,
  PlayArrow,
  Stop,
  PowerSettingsNew,
} from '@mui/icons-material';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { userApi, surveyApi } from '../utils/api';
import { DashboardStats, Survey, UserAdditionalData } from '../types';
import { supabase } from '../config/supabase';

const Dashboard: React.FC = () => {
  const { user, logout } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableSurveys, setAvailableSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showAdditionalDataModal, setShowAdditionalDataModal] = useState(false);
  const [additionalData, setAdditionalData] = useState<Partial<UserAdditionalData>>({});
  const [isLoadingAdditionalData, setIsLoadingAdditionalData] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  // Function to check for incomplete profile fields
  const checkProfileCompletion = (user: any) => {
    if (!user) return { isComplete: true, missing: [] };

    const requiredFields = [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'age', label: 'Age' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
    ];

    const missing = requiredFields.filter(field => 
      !user[field.key] || 
      (typeof user[field.key] === 'string' && user[field.key].trim() === '') ||
      user[field.key] === 'Not specified'
    ).map(field => field.label);

    return {
      isComplete: missing.length === 0,
      missing
    };
  };

  // Check profile completion when user data loads
  useEffect(() => {
    if (user && !showWelcomeModal) {
      const { isComplete, missing } = checkProfileCompletion(user);
      if (!isComplete) {
        setMissingFields(missing);
        setShowProfileCompletion(true);
      }
    }
  }, [user, showWelcomeModal]);

  // Check if user should see welcome modal
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('welcome') === 'true') {
      setShowWelcomeModal(true);
      // Clear the URL parameter to prevent showing modal on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Debug logging
      console.log('Dashboard - Current user:', user);
      console.log('Dashboard - localStorage demoMode:', localStorage.getItem('demoMode'));
      
      // Check if user has demo token (not a real Supabase session)
      const isDemo = user?.user_id === 'demo-user-123';
      console.log('Dashboard - isDemo:', isDemo);
      
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
        // Always fetch stats
        const statsResponse = await userApi.getDashboardStats();
        if (statsResponse.data) {
          setStats(statsResponse.data);
        }

        // Only fetch surveys if user is online
        if (isOnline) {
          const surveysResponse = await surveyApi.getAvailableSurveys();
          if (surveysResponse.data) {
            setAvailableSurveys(surveysResponse.data.slice(0, 3)); // Show top 3
          }
        } else {
          setAvailableSurveys([]); // Clear surveys when offline
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, isOnline]);

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

  const loadAdditionalData = async () => {
    if (!user?.user_id) return;
    
    setIsLoadingAdditionalData(true);
    try {
      const { data, error } = await supabase
        .from('users_additional_data')
        .select('*')
        .eq('user_id', user.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading additional data:', error);
      } else if (data) {
        setAdditionalData(data);
      }
    } catch (error) {
      console.error('Error loading additional data:', error);
    } finally {
      setIsLoadingAdditionalData(false);
    }
  };

  const handleOpenAdditionalDataModal = () => {
    setShowAdditionalDataModal(true);
    loadAdditionalData();
  };

  const handleSaveAdditionalData = async () => {
    if (!user?.user_id) return;

    setIsLoadingAdditionalData(true);
    try {
      const { error } = await supabase
        .from('users_additional_data')
        .upsert({
          user_id: user.user_id,
          ...additionalData
        });

      if (error) throw error;

      setShowAdditionalDataModal(false);
      // Show success message or refresh data
    } catch (error: any) {
      console.error('Error saving additional data:', error);
      // Show error message
    } finally {
      setIsLoadingAdditionalData(false);
    }
  };

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
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
            Welcome back, {user?.first_name || user?.phone_number?.slice(-4) || 'User'}!
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
        <Box display="flex" alignItems="center" gap={2}>
          {/* Online/Offline Toggle */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              {isOnline ? 'Online' : 'Offline'}
            </Typography>
            <IconButton
              onClick={handleToggleOnline}
              sx={{
                width: 56,
                height: 56,
                backgroundColor: isOnline ? 'success.main' : 'grey.300',
                color: isOnline ? 'white' : 'grey.600',
                '&:hover': {
                  backgroundColor: isOnline ? 'success.dark' : 'grey.400',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {isOnline ? <Stop /> : <PlayArrow />}
            </IconButton>
          </Box>
          
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
            <MenuItem onClick={handleOpenAdditionalDataModal}>
              <Add sx={{ mr: 1 }} /> Additional Info
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

      {/* Profile Completion Banner */}
      {missingFields.length > 0 && !showWelcomeModal && !showProfileCompletion && (
        <Alert 
          severity="warning" 
          sx={{ mb: 4 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/profile')}
              variant="outlined"
            >
              Complete Now
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Complete your profile to unlock better survey opportunities!</strong>
            <br />
            Missing: {missingFields.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Additional Information Card */}
      <Card sx={{ mb: 4, border: '2px dashed', borderColor: 'primary.main', bgcolor: 'primary.50' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" gutterBottom>
                <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
                Boost Your Earnings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Share additional information to unlock higher-paying surveys and better opportunities
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleOpenAdditionalDataModal}
              startIcon={<Person />}
              size="large"
            >
              Add Details
            </Button>
          </Box>
        </CardContent>
      </Card>

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
              {isOnline ? 'Top Available Surveys' : 'Survey Opportunities'}
            </Typography>
            {!isOnline ? (
              <Box textAlign="center" py={4}>
                <PowerSettingsNew sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  You're Currently Offline
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Go online to see available survey opportunities and start earning!
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={handleToggleOnline}
                  size="large"
                >
                  Go Online
                </Button>
              </Box>
            ) : availableSurveys.length === 0 ? (
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

      {/* Welcome Modal */}
      <Dialog
        open={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="h2" gutterBottom>
            🎉 Welcome to Survey Gig, {user?.first_name}!
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Your account has been successfully created! You're now ready to start earning money by participating in voice surveys.
          </Typography>
          <Typography variant="body1" paragraph>
            Here's what you can do:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" gutterBottom>
              Browse available surveys in the "Surveys" section
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              Call our survey line to participate and earn money
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              Track your earnings and progress on this dashboard
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              Upgrade your tier for access to higher-paying opportunities
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
            Ready to get started? Check out the available surveys below!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowWelcomeModal(false)}
            variant="contained"
            size="large"
            fullWidth
          >
            Let's Get Started!
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Completion Modal */}
      <Dialog
        open={showProfileCompletion}
        onClose={() => setShowProfileCompletion(false)}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>
          <Typography variant="h5" component="h2" gutterBottom>
            📝 Complete Your Profile
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            To ensure you receive the most relevant survey opportunities, please complete the missing information in your profile.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Missing information:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            {missingFields.map((field, index) => (
              <Typography key={index} component="li" variant="body2" gutterBottom>
                {field}
              </Typography>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Completing your profile helps us match you with surveys that pay better and are more relevant to your background.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setShowProfileCompletion(false)}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Skip for Now
          </Button>
          <Button
            onClick={() => navigate('/profile')}
            variant="contained"
            size="large"
          >
            Complete Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Additional Data Modal */}
      <Dialog
        open={showAdditionalDataModal}
        onClose={() => setShowAdditionalDataModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="h2" gutterBottom>
            <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
            Additional Profile Information
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Providing additional information helps us match you with better survey opportunities and higher payouts.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            {/* Demographics */}
            <Typography variant="h6" gutterBottom>Demographics</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Income Level</InputLabel>
                  <Select
                    value={additionalData.income_level || ''}
                    onChange={(e) => setAdditionalData({...additionalData, income_level: e.target.value})}
                    label="Income Level"
                  >
                    <SelectMenuItem value="under-25k">Under $25,000</SelectMenuItem>
                    <SelectMenuItem value="25k-50k">$25,000 - $50,000</SelectMenuItem>
                    <SelectMenuItem value="50k-75k">$50,000 - $75,000</SelectMenuItem>
                    <SelectMenuItem value="75k-100k">$75,000 - $100,000</SelectMenuItem>
                    <SelectMenuItem value="100k-150k">$100,000 - $150,000</SelectMenuItem>
                    <SelectMenuItem value="150k-plus">$150,000+</SelectMenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Education Level</InputLabel>
                  <Select
                    value={additionalData.education_level || ''}
                    onChange={(e) => setAdditionalData({...additionalData, education_level: e.target.value})}
                    label="Education Level"
                  >
                    <SelectMenuItem value="high-school">High School</SelectMenuItem>
                    <SelectMenuItem value="some-college">Some College</SelectMenuItem>
                    <SelectMenuItem value="associates">Associate's Degree</SelectMenuItem>
                    <SelectMenuItem value="bachelors">Bachelor's Degree</SelectMenuItem>
                    <SelectMenuItem value="masters">Master's Degree</SelectMenuItem>
                    <SelectMenuItem value="doctorate">Doctorate</SelectMenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Housing Situation</InputLabel>
                  <Select
                    value={additionalData.housing_situation || ''}
                    onChange={(e) => setAdditionalData({...additionalData, housing_situation: e.target.value})}
                    label="Housing Situation"
                  >
                    <SelectMenuItem value="owned-house">Own House</SelectMenuItem>
                    <SelectMenuItem value="owned-condo">Own Condo/Townhouse</SelectMenuItem>
                    <SelectMenuItem value="renting">Renting</SelectMenuItem>
                    <SelectMenuItem value="living-with-family">Living with Family</SelectMenuItem>
                    <SelectMenuItem value="other">Other</SelectMenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Family Status</InputLabel>
                  <Select
                    value={additionalData.family_status || ''}
                    onChange={(e) => setAdditionalData({...additionalData, family_status: e.target.value})}
                    label="Family Status"
                  >
                    <SelectMenuItem value="single">Single</SelectMenuItem>
                    <SelectMenuItem value="married">Married</SelectMenuItem>
                    <SelectMenuItem value="divorced">Divorced</SelectMenuItem>
                    <SelectMenuItem value="widowed">Widowed</SelectMenuItem>
                    <SelectMenuItem value="partnered">In a Partnership</SelectMenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Preferences & Behavior */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Preferences & Behavior</Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Tech Adoption</InputLabel>
                  <Select
                    value={additionalData.tech_adoption || ''}
                    onChange={(e) => setAdditionalData({...additionalData, tech_adoption: e.target.value})}
                    label="Tech Adoption"
                  >
                    <SelectMenuItem value="early-adopter">Early Adopter</SelectMenuItem>
                    <SelectMenuItem value="mainstream">Mainstream</SelectMenuItem>
                    <SelectMenuItem value="conservative">Conservative</SelectMenuItem>
                    <SelectMenuItem value="reluctant">Reluctant</SelectMenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: 200, flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Political Leaning</InputLabel>
                  <Select
                    value={additionalData.political_leaning || ''}
                    onChange={(e) => setAdditionalData({...additionalData, political_leaning: e.target.value})}
                    label="Political Leaning"
                  >
                    <SelectMenuItem value="liberal">Liberal</SelectMenuItem>
                    <SelectMenuItem value="moderate">Moderate</SelectMenuItem>
                    <SelectMenuItem value="conservative">Conservative</SelectMenuItem>
                    <SelectMenuItem value="prefer-not-to-say">Prefer not to say</SelectMenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Media Consumption</InputLabel>
                <Select
                  value={additionalData.media_consumption || ''}
                  onChange={(e) => setAdditionalData({...additionalData, media_consumption: e.target.value})}
                  label="Media Consumption"
                >
                  <SelectMenuItem value="digital-first">Digital First</SelectMenuItem>
                  <SelectMenuItem value="traditional-media">Traditional Media</SelectMenuItem>
                  <SelectMenuItem value="social-media">Social Media Heavy</SelectMenuItem>
                  <SelectMenuItem value="mixed">Mixed Sources</SelectMenuItem>
                  <SelectMenuItem value="minimal">Minimal Media</SelectMenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Professional Information */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Professional Information</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="LinkedIn Profile URL"
                value={additionalData.linkedin_profile || ''}
                onChange={(e) => setAdditionalData({...additionalData, linkedin_profile: e.target.value})}
                placeholder="https://linkedin.com/in/yourprofile"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Work Experience"
                value={additionalData.work_experience || ''}
                onChange={(e) => setAdditionalData({...additionalData, work_experience: e.target.value})}
                placeholder="Brief description of your work experience..."
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Education Credentials"
                value={additionalData.education_credentials || ''}
                onChange={(e) => setAdditionalData({...additionalData, education_credentials: e.target.value})}
                placeholder="Degrees, certifications, schools attended..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setShowAdditionalDataModal(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAdditionalData}
            variant="contained"
            disabled={isLoadingAdditionalData}
          >
            {isLoadingAdditionalData ? 'Saving...' : 'Save Information'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;