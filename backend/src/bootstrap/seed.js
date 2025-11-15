const config = require('../config');
const store = require('../storage');
const { seedAdmin } = require('../models/userModel');
const { hashPassword } = require('../utils/crypto');
const { createCategory } = require('../models/categoryModel');

function seed() {
  seedAdmin({ email: config.admin.email, passwordHash: hashPassword(config.admin.password) });
  const existing = store.list('categories');
  if (!existing.length) {
    ['Temizlik', 'Nakliye', 'Tesisat', 'Boya'].forEach((name) => {
      try {
        createCategory({ name, description: `${name} hizmetleri` });
      } catch (err) {
        // ignore duplicates
      }
    });
  }
}

module.exports = seed;
