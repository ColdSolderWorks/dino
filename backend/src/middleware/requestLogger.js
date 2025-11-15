const { log } = require('../utils/logger');

function requestLogger(req, res, next) {
  const started = Date.now();
  const { method, url } = req;
  const finish = () => {
    res.removeListener('finish', finish);
    log('request', { method, url, status: res.statusCode, durationMs: Date.now() - started });
  };
  res.on('finish', finish);
  next();
}

module.exports = requestLogger;
