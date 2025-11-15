const fs = require('fs');
const path = require('path');

function loadEnv(file = '.env') {
  const envPath = path.join(process.cwd(), file);
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim();
    if (key && !(key in process.env)) {
      process.env[key.trim()] = value.replace(/^"|"$/g, '');
    }
  });
}

module.exports = { loadEnv };
