const express = require('express');
const complaintController = require('../controllers/complaintController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, complaintController.create);

module.exports = router;
