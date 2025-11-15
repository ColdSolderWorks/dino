const express = require('express');
const offerController = require('../controllers/offerController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, requireRole('pro'), offerController.create);
router.get('/mine', authenticate, requireRole('pro'), offerController.listMine);
router.get('/request/:id', authenticate, offerController.listForRequest);
router.post('/:id/accept', authenticate, requireRole('customer'), offerController.accept);

module.exports = router;
