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
} from '@mui/material';
import { Visibility, VisibilityOff, Phone, Sms, ArrowBack } from '@mui/icons-material';
import { supabase } from '../config/supabase';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Phone Number', 'Verify Code', 'New Password'];
  
  // Form data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
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
      // Check if phone number exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('phone_number')
        .eq('phone_number', `+1${cleanPhone}`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingUser) {
        setError('No account found with this phone number. Please check your number or create a new account.');
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: `+1${cleanPhone}`,
        options: {
          shouldCreateUser: false,
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Success! Navigate to login with success message
      navigate('/login', { 
        state: { 
          message: 'Password reset successfully! Please log in with your new password.' 
        } 
      });
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again.');
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
          shouldCreateUser: false,
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
              We'll send a verification code to reset your password
            </Typography>

            <TextField
              fullWidth
              label="Phone Number"
              value={phoneNumber}
              onChange={handlePhoneChange}
              margin="normal"
              required
              placeholder="(555) 123-4567"
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
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? 'Sending...' : 'Send Verification Code'}
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
              Enter the 6-digit code sent to {phoneNumber}
            </Typography>

            <TextField
              fullWidth
              label="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              margin="normal"
              required
              inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' } }}
              placeholder="000000"
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
          <Box component="form" onSubmit={handleResetPassword}>
            <Typography variant="h6" gutterBottom>
              Create New Password
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose a secure password for your account
            </Typography>

            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              helperText="Must be at least 8 characters long"
              tabIndex={1}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              tabIndex={2}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
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
            Reset Password
          </Typography>
          <Typography variant="h6" gutterBottom>
            Survey Gig
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
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

        <Box textAlign="center" mt={3}>
          <Button
            component={Link}
            to="/login"
            variant="text"
            color="secondary"
            startIcon={<ArrowBack />}
          >
            Back to Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;