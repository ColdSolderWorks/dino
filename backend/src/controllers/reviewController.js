const { createReview, listReviews } = require('../models/reviewModel');
const { findRequest } = require('../models/requestModel');
const { updateUser } = require('../models/userModel');

const reviewController = {
  create(req, res) {
    const request = findRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.customerId !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (request.status !== 'completed') {
      return res.status(400).json({ error: 'Request must be completed before review' });
    }
    if (!req.body || !req.body.rating) {
      return res.status(400).json({ error: 'Rating is required' });
    }
    const review = createReview({
      requestId: request.id,
      customerId: req.user.sub,
      providerId: request.selectedProId,
      rating: Math.max(1, Math.min(5, Number(req.body.rating))),
      comment: req.body.comment || ''
    });
    const providerReviews = listReviews((item) => item.providerId === request.selectedProId);
    const avg = providerReviews.reduce((sum, item) => sum + item.rating, 0) / providerReviews.length;
    updateUser(request.selectedProId, { avgRating: Number(avg.toFixed(2)), completedJobs: providerReviews.length });
    return res.status(201).json({ review });
  },

  listForProvider(req, res) {
    const providerId = Number(req.params.id);
    const reviews = listReviews((item) => item.providerId === providerId);
    return res.json({ reviews });
  }
};

module.exports = reviewController;
