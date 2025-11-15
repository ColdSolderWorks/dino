function log(message, context = {}) {
  const payload = { timestamp: new Date().toISOString(), message, ...context };
  console.log(JSON.stringify(payload));
}

module.exports = { log };
