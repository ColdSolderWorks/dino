const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/users', adminController.listUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/pros/:id/status', adminController.approvePro);
router.get('/stats', adminController.stats);
router.get('/complaints', adminController.complaints);
router.get('/announcements', adminController.announcements);
router.post('/announcements', adminController.announcements);
router.delete('/announcements/:id', adminController.announcements);

module.exports = router;
