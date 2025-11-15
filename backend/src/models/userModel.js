const store = require('../storage');
const { hashPassword } = require('../utils/crypto');

function createUser({ name, email, password, role = 'customer', city = '', district = '' }) {
  const exists = store.list('users').find((user) => user.email === email);
  if (exists) {
    throw new Error('Email already registered');
  }
  const passwordHash = hashPassword(password);
  const user = store.insert('users', {
    name,
    email,
    passwordHash,
    role,
    city,
    district,
    status: role === 'pro' ? 'pending' : 'active',
    createdAt: new Date().toISOString()
  });
  return user;
}

function seedAdmin({ email, passwordHash }) {
  const exists = store.list('users').find((user) => user.role === 'admin');
  if (exists) return exists;
  return store.insert('users', {
    name: 'System Admin',
    email,
    passwordHash,
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString()
  });
}

function findByEmail(email) {
  return store.list('users').find((user) => user.email === email);
}

function findById(id) {
  return store.findById('users', id);
}

function updateUser(id, updates) {
  return store.update('users', id, updates);
}

function listUsers() {
  return store.list('users');
}

module.exports = { createUser, seedAdmin, findByEmail, findById, updateUser, listUsers };
