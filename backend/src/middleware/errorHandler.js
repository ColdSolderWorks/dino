const { log } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  log('error', { message: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
