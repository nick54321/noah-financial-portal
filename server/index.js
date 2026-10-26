require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const basicAuth = require('express-basic-auth');

const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');
const onboardingRoutes = require('./routes/onboarding');
const accountRoutes = require('./routes/accounts');
const payoutRoutes = require('./routes/payouts');
const conversionRoutes = require('./routes/conversions');
const webhookRoutes = require('./routes/webhooks');
const swaggerDocument = require('./swagger.json');

const app = express();
const PORT = process.env.PORT || 5050;
const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD || 'ApiDocs!';

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
}));

// Webhook endpoint needs raw body for signature verification before json parsing
app.use('/api/webhooks', webhookRoutes);

// JSON body parser for all other endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI with Basic Authentication
app.use('/api-docs', basicAuth({
  users: { 'admin': SWAGGER_PASSWORD },
  challenge: true,
}), swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/conversions', conversionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Noah Financial Services Portal Backend',
  });
});

// Serve frontend static build in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Noah Financial Services Portal API Server is running.');
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' ? { details: err.details } : {}),
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` Noah Financial Services Portal Server Running   `);
    console.log(` Port: ${PORT}                                   `);
    console.log(` Swagger Docs: http://localhost:${PORT}/api-docs `);
    console.log(`=================================================`);
  });
}

module.exports = app;
