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
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { user: contextUser } = useSupabaseAuth();
  
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Phone Number', 'Verify Code', 'Create Password', 'Profile Info'];
  
  // Form data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Profile information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
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
      // Check if phone number already exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('phone_number')
        .eq('phone_number', `+1${cleanPhone}`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is what we want for new users
        throw checkError;
      }

      if (existingUser) {
        setError('An account with this phone number already exists. Please log in instead.');
        return;
      }

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

      // Move to profile information step
      setActiveStep(3);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !age || !occupation || !city || !state) {
      setError('Please fill in all profile information.');
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      setError('Please enter a valid age between 13 and 120.');
      return;
    }

    setIsLoading(true);

    try {
      // Create user profile in our users table
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Current auth user:', user);
      
      if (user) {
        // Check if user profile already exists
        const { data: existingUsers, error: checkError } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_id', user.id);
          
        console.log('Existing user check:', { existingUsers, checkError });

        if (existingUsers && existingUsers.length > 0) {
          // User profile exists, update it with new information
          const { error: updateError } = await supabase
            .from('users')
            .update({
              first_name: firstName,
              last_name: lastName,
              age: parseInt(age),
              occupation: occupation,
              city: city,
              state: state,
              location: `${city}, ${state}`
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Update error:', updateError);
            throw updateError;
          }
          console.log('Profile updated successfully');
        } else {
          // Create new user profile
          console.log('Creating new user profile...');
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              user_id: user.id,
              first_name: firstName,
              last_name: lastName,
              phone_number: `+1${cleanPhone}`,
              password_hash: 'supabase_managed', // Required field in schema
              age: parseInt(age),
              occupation: occupation,
              city: city,
              state: state,
              location: `${city}, ${state}`, // Combined location for compatibility
              tier: 'basic',
              earnings: 0.00,
              quality_score: 0.00,
              subscription_status: 'inactive'
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            throw insertError;
          }
          console.log('Profile created successfully');
        }
      } else {
        throw new Error('No authenticated user found');
      }

      console.log('Redirecting to dashboard...');
      // Force a page reload to refresh auth context and trigger welcome modal
      window.location.href = '/dashboard?welcome=true';
    } catch (error: any) {
      console.error('Profile creation error:', error);
      setError(error.message || 'Failed to create profile. Please try again.');
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
              label="Confirm Password"
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
              sx={{ mt: 3 }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Box>
        );

      case 3:
        return (
          <Box component="form" onSubmit={handleCreateProfile}>
            <Typography variant="h6" gutterBottom>
              Complete Your Profile
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Help us personalize your survey experience with some basic information.
            </Typography>

            <TextField
              fullWidth
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              margin="normal"
              required
              tabIndex={1}
            />

            <TextField
              fullWidth
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              margin="normal"
              required
              tabIndex={2}
            />

            <TextField
              fullWidth
              label="Age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              margin="normal"
              inputProps={{ min: 13, max: 120 }}
              required
              tabIndex={3}
            />

            <TextField
              fullWidth
              label="Occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              margin="normal"
              placeholder="e.g., Software Engineer, Teacher, Student"
              required
              tabIndex={4}
            />

            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                margin="normal"
                required
                tabIndex={5}
              />
              <TextField
                fullWidth
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                margin="normal"
                placeholder="TX"
                inputProps={{ maxLength: 2 }}
                required
                tabIndex={6}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Complete Registration'}
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
            {error.includes('already exists') ? (
              <Box>
                {error}
                <br />
                <Link to="/login" style={{ color: 'inherit', fontWeight: 'bold' }}>
                  Click here to log in →
                </Link>
              </Box>
            ) : (
              error
            )}
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