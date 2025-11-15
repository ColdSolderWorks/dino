const store = require('../storage');

function listCategories() {
  return store.list('categories');
}

function createCategory(data) {
  const exists = store.list('categories').find((cat) => cat.name.toLowerCase() === data.name.toLowerCase());
  if (exists) throw new Error('Category already exists');
  return store.insert('categories', { ...data, isActive: true });
}

function updateCategory(id, updates) {
  return store.update('categories', id, updates);
}

function deleteCategory(id) {
  return store.delete('categories', id);
}

function findCategory(id) {
  return store.findById('categories', id);
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, findCategory };
