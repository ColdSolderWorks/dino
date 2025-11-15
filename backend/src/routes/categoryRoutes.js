const express = require('express');
const categoryController = require('../controllers/categoryController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', categoryController.list);
router.post('/', authenticate, requireRole('admin'), categoryController.create);
router.put('/:id', authenticate, requireRole('admin'), categoryController.update);
router.delete('/:id', authenticate, requireRole('admin'), categoryController.remove);

module.exports = router;
