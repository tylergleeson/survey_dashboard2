import React from 'react';
import { Container, Typography, Card, CardContent, Button, Box } from '@mui/material';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, logout } = useSupabaseAuth();
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account Information
          </Typography>
          <Typography>Phone: {user?.phone_number || 'N/A'}</Typography>
          <Typography>Age: {user?.age || 'N/A'}</Typography>
          <Typography>Occupation: {user?.occupation || 'N/A'}</Typography>
          <Typography>Location: {user?.location || 'N/A'}</Typography>
          <Typography>Tier: {user?.tier?.toUpperCase() || 'BASIC'}</Typography>
          <Typography>Earnings: ${user?.earnings?.toFixed(2) || '0.00'}</Typography>
          <Typography>Quality Score: {user?.quality_score?.toFixed(1) || '0.0'}/5.0</Typography>
          
          <Box mt={3}>
            <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
              Back to Dashboard
            </Button>
            <Button variant="outlined" color="error" onClick={() => { logout(); navigate('/login'); }}>
              Logout
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Profile;