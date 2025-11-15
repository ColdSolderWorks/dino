const { createComplaint } = require('../models/complaintModel');

const complaintController = {
  create(req, res) {
    const body = req.body || {};
    if (!body.requestId || !body.notes) {
      return res.status(400).json({ error: 'requestId and notes required' });
    }
    const complaint = createComplaint({
      requestId: body.requestId,
      reporterId: req.user.sub,
      againstUserId: body.againstUserId || null,
      type: body.type || 'general',
      notes: body.notes
    });
    return res.status(201).json({ complaint });
  }
};

module.exports = complaintController;
