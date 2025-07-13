import React from 'react';
import { Container, Typography, Card, CardContent, Button, Box, Chip } from '@mui/material';
import { Star, BusinessCenter, Diamond } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Subscription: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Basic',
      price: 0,
      period: 'Free',
      icon: <Star />,
      features: ['1-2 surveys/week', '$1-3 per survey', '$25 minimum payout', 'Basic support'],
      current: user?.tier === 'basic'
    },
    {
      name: 'Pro',
      price: 19,
      period: 'month',
      icon: <BusinessCenter />,
      features: ['5-10 surveys/week', '$5-15 per survey', 'Instant payouts', 'Priority support'],
      current: user?.tier === 'pro'
    },
    {
      name: 'Elite',
      price: 199,
      period: 'month',
      icon: <Diamond />,
      features: ['2-3 high-value surveys/week', '$200-1,500 per survey', 'Custom projects', 'Dedicated manager'],
      current: user?.tier === 'elite'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" gutterBottom>
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Unlock higher earnings with our subscription tiers
        </Typography>
        {user?.tier && (
          <Chip 
            label={`Current: ${user.tier.toUpperCase()} Tier`} 
            color="primary" 
            sx={{ mt: 2 }} 
          />
        )}
      </Box>

      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            sx={{ 
              textAlign: 'center',
              border: plan.current ? 2 : 1,
              borderColor: plan.current ? 'primary.main' : 'divider'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box mb={2}>
                {plan.icon}
              </Box>
              <Typography variant="h5" gutterBottom>
                {plan.name}
              </Typography>
              <Box display="flex" justifyContent="center" alignItems="baseline" mb={2}>
                <Typography variant="h3">${plan.price}</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 1 }}>
                  /{plan.period}
                </Typography>
              </Box>
              
              <Box mb={3}>
                {plan.features.map((feature, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    • {feature}
                  </Typography>
                ))}
              </Box>
              
              <Button 
                variant={plan.current ? "outlined" : "contained"}
                fullWidth
                disabled={plan.current}
                size="large"
              >
                {plan.current ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box mt={4} textAlign="center">
        <Button variant="outlined" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default Subscription;