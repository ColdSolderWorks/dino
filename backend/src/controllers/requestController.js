const { createRequest, listRequests, findRequest, updateRequest } = require('../models/requestModel');
const { findCategory } = require('../models/categoryModel');

const requestController = {
  create(req, res) {
    const body = req.body || {};
    const required = ['categoryId', 'city', 'district', 'description'];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }
    const category = findCategory(body.categoryId);
    if (!category) return res.status(400).json({ error: 'Category not found' });
    const request = createRequest({
      customerId: req.user.sub,
      categoryId: category.id,
      city: body.city,
      district: body.district,
      description: body.description,
      desiredDate: body.desiredDate || null,
      budgetMin: body.budgetMin || null,
      budgetMax: body.budgetMax || null,
      status: 'created'
    });
    return res.status(201).json({ request });
  },

  listMine(req, res) {
    const requests = listRequests((item) => item.customerId === req.user.sub);
    return res.json({ requests });
  },

  listAvailable(req, res) {
    const requests = listRequests((item) => ['created', 'bidding'].includes(item.status));
    return res.json({ requests });
  },

  getOne(req, res) {
    const request = findRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (
      req.user.role !== 'admin' &&
      request.customerId !== req.user.sub &&
      request.selectedProId !== req.user.sub
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ request });
  },

  updateStatus(req, res) {
    const request = findRequest(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    const allowedActors = [request.customerId, request.selectedProId];
    if (req.user.role !== 'admin' && !allowedActors.includes(req.user.sub)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const allowedStatuses = ['created', 'bidding', 'pro_selected', 'in_progress', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const updated = updateRequest(request.id, { status: req.body.status });
    return res.json({ request: updated });
  }
};

module.exports = requestController;
