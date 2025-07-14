require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test each route module individually
console.log('Loading auth routes...');
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✓ Auth routes loaded successfully');
} catch (error) {
  console.error('✗ Error loading auth routes:', error.message);
}

console.log('Loading users routes...');
try {
  app.use('/api/users', require('./routes/users'));
  console.log('✓ Users routes loaded successfully');
} catch (error) {
  console.error('✗ Error loading users routes:', error.message);
}

console.log('Loading surveys routes...');
try {
  app.use('/api/surveys', require('./routes/surveys'));
  console.log('✓ Surveys routes loaded successfully');
} catch (error) {
  console.error('✗ Error loading surveys routes:', error.message);
}

console.log('Loading calls routes...');
try {
  app.use('/api/calls', require('./routes/calls'));
  console.log('✓ Calls routes loaded successfully');
} catch (error) {
  console.error('✗ Error loading calls routes:', error.message);
}

console.log('Loading subscriptions routes...');
try {
  app.use('/api/subscriptions', require('./routes/subscriptions'));
  console.log('✓ Subscriptions routes loaded successfully');
} catch (error) {
  console.error('✗ Error loading subscriptions routes:', error.message);
}

console.log('Loading webhook routes...');
try {
  app.use('/webhook', require('./routes/webhooks'));
  console.log('✓ Webhook routes loaded successfully');
} catch (error) {
  console.error('✗ Error loading webhook routes:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});