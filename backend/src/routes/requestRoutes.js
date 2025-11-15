const express = require('express');
const requestController = require('../controllers/requestController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, requireRole('customer'), requestController.create);
router.get('/mine', authenticate, requireRole('customer'), requestController.listMine);
router.get('/available', authenticate, requireRole('pro'), requestController.listAvailable);
router.get('/:id', authenticate, requestController.getOne);
router.patch('/:id/status', authenticate, requestController.updateStatus);

module.exports = router;
