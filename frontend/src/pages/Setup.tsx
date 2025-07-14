import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
} from '@mui/material';

const Setup: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to new signup flow - SMS setup tokens are no longer used
    navigate('/signup', { replace: true });
  }, [navigate]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Survey Gig
          </Typography>
          <Typography variant="h6" gutterBottom>
            Redirecting to Sign Up
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          We've updated our signup process! You'll be redirected to our new phone verification signup.
        </Alert>
      </Paper>
    </Container>
  );
};

export default Setup;