const { createUser, findByEmail, updateUser, findById } = require('../models/userModel');
const { verifyPassword, createToken, hashPassword } = require('../utils/crypto');
const { requireFields, isEmail, enforcePasswordPolicy } = require('../utils/validators');

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

const authController = {
  register(req, res) {
    const body = req.body || {};
    const missing = requireFields(body, ['name', 'email', 'password', 'role']);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }
    if (!isEmail(body.email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!['customer', 'pro'].includes(body.role)) {
      return res.status(400).json({ error: 'Role must be customer or pro' });
    }
    if (!enforcePasswordPolicy(body.password)) {
      return res.status(400).json({ error: 'Password does not meet policy' });
    }
    let user;
    try {
      user = createUser(body);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const token = createToken({ sub: user.id, role: user.role, status: user.status });
    return res.status(201).json({ token, user: sanitizeUser(user) });
  },

  login(req, res) {
    const body = req.body || {};
    const missing = requireFields(body, ['email', 'password']);
    if (missing.length) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = findByEmail(body.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!verifyPassword(body.password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }
    if (user.role === 'pro' && user.status !== 'active') {
      return res.status(403).json({ error: 'Pro account awaiting approval' });
    }
    const token = createToken({ sub: user.id, role: user.role, status: user.status });
    return res.json({ token, user: sanitizeUser(user) });
  },

  me(req, res) {
    const user = findById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: sanitizeUser(user) });
  },

  updateMe(req, res) {
    const updates = {};
    ['name', 'city', 'district', 'bio', 'minRate'].forEach((field) => {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });
    if (req.body && req.body.password) {
      if (!enforcePasswordPolicy(req.body.password)) {
        return res.status(400).json({ error: 'Password does not meet policy' });
      }
      updates.passwordHash = hashPassword(req.body.password);
    }
    const user = updateUser(req.user.sub, updates);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: sanitizeUser(user) });
  }
};

module.exports = authController;
