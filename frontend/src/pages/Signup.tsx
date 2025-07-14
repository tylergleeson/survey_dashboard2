import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, Phone, Sms } from '@mui/icons-material';
import { supabase } from '../config/supabase';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Phone Number', 'Verify Code', 'Create Password'];
  
  // Form data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UI states
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    
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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber) {
      setError('Please enter your phone number.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+1${cleanPhone}`,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;

      setActiveStep(1);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode) {
      setError('Please enter the verification code.');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const { error } = await supabase.auth.verifyOtp({
        phone: `+1${cleanPhone}`,
        token: verificationCode,
        type: 'sms'
      });

      if (error) throw error;

      setActiveStep(2);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Create user profile in our users table
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // First, try to delete any existing record with this phone number
        // (in case auth user was deleted but profile wasn't)
        await supabase
          .from('users')
          .delete()
          .eq('phone_number', `+1${cleanPhone}`);

        // Now create the new user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            user_id: user.id,
            phone_number: `+1${cleanPhone}`,
            password_hash: 'supabase_managed', // Placeholder since Supabase handles auth
            age: 25, // Default placeholder - can be updated later
            occupation: 'Not specified', // Placeholder
            location: 'Not specified', // Placeholder
            created_at: new Date().toISOString(),
            subscription_status: 'active',
            tier: 'basic',
            earnings: 0,
            quality_score: 0
          });

        if (profileError) throw profileError;
      }

      // Success! Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError('');

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+1${cleanPhone}`,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;

      setError('');
      // Show success message briefly
      setError('Verification code sent!');
      setTimeout(() => setError(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box component="form" onSubmit={handleSendCode}>
            <Typography variant="h6" gutterBottom>
              Enter Your Phone Number
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We'll send you a verification code to confirm your number
            </Typography>

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

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3 }}
            >
              {isLoading ? 'Sending Code...' : 'Send Verification Code'}
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box component="form" onSubmit={handleVerifyCode}>
            <Typography variant="h6" gutterBottom>
              Enter Verification Code
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We sent a 6-digit code to {phoneNumber}
            </Typography>

            <TextField
              fullWidth
              label="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              margin="normal"
              required
              placeholder="123456"
              inputProps={{ maxLength: 6 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Sms />
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
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={handleResendCode}
              disabled={isResending}
              sx={{ mb: 1 }}
            >
              {isResending ? 'Resending...' : 'Resend Code'}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => setActiveStep(0)}
              color="secondary"
            >
              Change Phone Number
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box component="form" onSubmit={handleCreatePassword}>
            <Typography variant="h6" gutterBottom>
              Create Your Password
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose a secure password for your account
            </Typography>

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              helperText="Must be at least 8 characters long"
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

            <TextField
              fullWidth
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3 }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Survey Gig
          </Typography>
          <Typography variant="h6" gutterBottom>
            Create Your Account
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert 
            severity={error.includes('sent!') ? 'success' : 'error'} 
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {renderStepContent()}

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?
          </Typography>
        </Divider>

        <Box textAlign="center">
          <Button
            component={Link}
            to="/login"
            variant="text"
            color="primary"
          >
            Sign In Instead
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup;