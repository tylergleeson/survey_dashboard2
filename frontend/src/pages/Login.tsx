import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, Phone } from '@mui/icons-material';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithSupabase, loginDemo } = useSupabaseAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const from = location.state?.from?.pathname || '/dashboard';

  // Check for success message from password reset
  React.useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length >= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber || !password) {
      setError('Please enter both phone number and password.');
      return;
    }

    // Extract just the digits from formatted phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsLoading(true);

    try {
      // Try Supabase authentication first
      if (loginWithSupabase) {
        console.log('Calling loginWithSupabase...');
        const response = await loginWithSupabase(`+1${cleanPhone}`, password);
        console.log('Login response:', response);
        
        if (response.success && response.data) {
          console.log('Login successful, navigating to:', from);
          navigate(from, { replace: true });
        } else {
          console.error('Login failed:', response.error);
          setError(response.error || 'Login failed. Please check your credentials.');
        }
      } else {
        setError('Authentication system not available. Please try again.');
      }
    } catch (error: any) {
      console.error('Login exception:', error);
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginDemo();
    navigate(from, { replace: true });
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Survey Gig
          </Typography>
          <Typography variant="h6" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to access your dashboard and available surveys
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Phone Number"
            value={phoneNumber}
            onChange={handlePhoneChange}
            margin="normal"
            required
            placeholder="(123) 456-7890"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Box textAlign="center" sx={{ mb: 2 }}>
            <Button
              component={Link}
              to="/forgot-password"
              variant="text"
              size="small"
              color="primary"
            >
              Forgot Password?
            </Button>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleDemoLogin}
            sx={{ mb: 2 }}
            color="secondary"
          >
            🎯 Try Demo Mode
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              New to Survey Gig?
            </Typography>
          </Divider>

          <Box textAlign="center">
            <Button
              component={Link}
              to="/signup"
              variant="text"
              color="primary"
              size="large"
            >
              Create New Account
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;