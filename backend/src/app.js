const express = require('express');
const rateLimiter = require('./middleware/rateLimiter');
const { securityHeaders, cors } = require('./middleware/securityHeaders');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const requestRoutes = require('./routes/requestRoutes');
const offerRoutes = require('./routes/offerRoutes');
const { requestReviews, providerReviews } = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const publicRoutes = require('./routes/publicRoutes');

function createApp() {
  const app = express();
  app.use(rateLimiter());
  app.use(securityHeaders);
  app.use(cors('*'));
  app.use(requestLogger);
  app.use((req, _res, next) => {
    if (!req.body) req.body = {};
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/offers', offerRoutes);
  app.use('/api/requests', requestReviews);
  app.use('/api/providers', providerReviews);
  app.use('/api/admin', adminRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/public', publicRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
