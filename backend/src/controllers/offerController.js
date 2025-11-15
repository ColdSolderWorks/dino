const { findRequest, updateRequest } = require('../models/requestModel');
const { createOffer, listOffers, findOffer, updateOffer } = require('../models/offerModel');

const offerController = {
  create(req, res) {
    const body = req.body || {};
    if (!body.requestId || !body.amount) {
      return res.status(400).json({ error: 'requestId and amount are required' });
    }
    const request = findRequest(body.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.customerId === req.user.sub) {
      return res.status(400).json({ error: 'You cannot bid on your own request' });
    }
    const existing = listOffers((offer) => offer.requestId === request.id && offer.providerId === req.user.sub);
    if (existing.length) {
      return res.status(400).json({ error: 'You already submitted an offer' });
    }
    const offer = createOffer({
      requestId: request.id,
      providerId: req.user.sub,
      amount: body.amount,
      estimatedTime: body.estimatedTime || '',
      message: body.message || ''
    });
    updateRequest(request.id, { status: 'bidding' });
    return res.status(201).json({ offer });
  },

  listForRequest(req, res) {
    const request = findRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (req.user.role !== 'admin' && request.customerId !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const offers = listOffers((offer) => offer.requestId === request.id);
    return res.json({ offers });
  },

  listMine(req, res) {
    const offers = listOffers((offer) => offer.providerId === req.user.sub);
    return res.json({ offers });
  },

  accept(req, res) {
    const offer = findOffer(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    const request = findRequest(offer.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.customerId !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    updateOffer(offer.id, { status: 'accepted' });
    updateRequest(request.id, { status: 'pro_selected', selectedProId: offer.providerId });
    const related = listOffers((other) => other.requestId === request.id && other.id !== offer.id);
    related.forEach((other) => updateOffer(other.id, { status: 'rejected' }));
    return res.json({ offer: findOffer(offer.id) });
  }
};

module.exports = offerController;
