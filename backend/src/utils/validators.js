function requireFields(obj, fields) {
  const missing = fields.filter((field) => !obj[field]);
  return missing;
}

function isEmail(value) {
  return /.+@.+\..+/.test(value || '');
}

function enforcePasswordPolicy(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{10,}$/.test(password || '');
}

module.exports = { requireFields, isEmail, enforcePasswordPolicy };
