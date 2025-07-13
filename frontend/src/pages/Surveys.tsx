import React from 'react';
import { Container, Typography, Card, CardContent, Button, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Surveys: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Available Surveys
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Survey system is currently being developed. Voice calling features will be available soon!
      </Alert>

      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              E-commerce Checkout Experience
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Consumer Research • 3 minutes
            </Typography>
            <Typography variant="h6" color="primary" gutterBottom>
              $3.00 - $5.00
            </Typography>
            <Button variant="contained" disabled fullWidth>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Professional Software Tools
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Professional Research • 8 minutes
            </Typography>
            <Typography variant="h6" color="primary" gutterBottom>
              $12.00 - $18.00
            </Typography>
            <Button variant="contained" disabled fullWidth>
              Pro Tier Required
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Executive Decision Making
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Executive Research • 15 minutes
            </Typography>
            <Typography variant="h6" color="primary" gutterBottom>
              $500.00 - $750.00
            </Typography>
            <Button variant="contained" disabled fullWidth>
              Elite Tier Required
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Box mt={4}>
        <Button variant="outlined" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default Surveys;