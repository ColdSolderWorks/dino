const { listCategories, createCategory, updateCategory, deleteCategory } = require('../models/categoryModel');

const categoryController = {
  list(_req, res) {
    return res.json({ categories: listCategories() });
  },

  create(req, res) {
    if (!req.body || !req.body.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    let category;
    try {
      category = createCategory({ name: req.body.name, description: req.body.description || '' });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(201).json({ category });
  },

  update(req, res) {
    const updated = updateCategory(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.json({ category: updated });
  },

  remove(req, res) {
    const removed = deleteCategory(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.status(204).send('');
  }
};

module.exports = categoryController;
