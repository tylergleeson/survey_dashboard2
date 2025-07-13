import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to Survey Gig!
          </Typography>
          <Chip 
            label={`${user?.tier?.toUpperCase() || 'BASIC'} TIER`} 
            color="primary"
            variant="outlined"
          />
        </Box>
        <Button onClick={handleLogout} variant="outlined">
          Logout
        </Button>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={3} mb={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              Total Earnings
            </Typography>
            <Typography variant="h4">
              ${user?.earnings?.toFixed(2) || '0.00'}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main">
              Quality Score
            </Typography>
            <Typography variant="h4">
              {user?.quality_score?.toFixed(1) || '0.0'}/5.0
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Actions */}
      <Box display="flex" gap={2} flexWrap="wrap">
        <Button variant="contained" onClick={() => navigate('/surveys')}>
          Browse Surveys
        </Button>
        <Button variant="outlined" onClick={() => navigate('/profile')}>
          My Profile
        </Button>
        <Button variant="outlined" onClick={() => navigate('/subscription')}>
          Subscription
        </Button>
      </Box>

      {/* Welcome Message */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🎯 How Survey Gig Works
          </Typography>
          <Typography paragraph>
            1. <strong>Browse Surveys</strong> - Find surveys that match your demographics
          </Typography>
          <Typography paragraph>
            2. <strong>Take Voice Calls</strong> - Answer questions via phone call
          </Typography>
          <Typography paragraph>
            3. <strong>Earn Money</strong> - Get paid based on response quality
          </Typography>
          <Typography>
            4. <strong>Upgrade Tiers</strong> - Access higher-paying opportunities
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Dashboard;