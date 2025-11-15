const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authenticate, requireRole } = require('../middleware/auth');

const requestReviews = express.Router();
requestReviews.post('/:id/reviews', authenticate, requireRole('customer'), reviewController.create);

const providerReviews = express.Router();
providerReviews.get('/:id/reviews', reviewController.listForProvider);

module.exports = { requestReviews, providerReviews };
