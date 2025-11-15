const path = require('path');
const { loadEnv } = require('../utils/env');

loadEnv(path.join(__dirname, '../../.env'));

const config = {
  port: parseInt(process.env.API_PORT || '4100', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  tokenExpirationMinutes: parseInt(process.env.JWT_TTL_MINUTES || '60', 10),
  dataPath: process.env.DATA_PATH || path.join(__dirname, '../../storage/ustabul61-data.json'),
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@ustabul61.local',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!'
  }
};

module.exports = config;
