const { listUsers, updateUser } = require('../models/userModel');
const { listRequests } = require('../models/requestModel');
const { listOffers } = require('../models/offerModel');
const { listCategories } = require('../models/categoryModel');
const { listComplaints } = require('../models/complaintModel');
const { createAnnouncement, listAnnouncements, deleteAnnouncement } = require('../models/announcementModel');

const adminController = {
  listUsers(_req, res) {
    const users = listUsers();
    return res.json({ users: users.map((user) => ({ ...user, passwordHash: undefined })) });
  },

  updateUserStatus(req, res) {
    const user = updateUser(req.params.id, { status: req.body.status });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  },

  approvePro(req, res) {
    const user = updateUser(req.params.id, { status: req.body.status || 'active' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  },

  stats(_req, res) {
    const users = listUsers();
    const requests = listRequests();
    const offers = listOffers();
    const categories = listCategories();
    const stats = {
      totalUsers: users.length,
      totalPros: users.filter((u) => u.role === 'pro').length,
      activeRequests: requests.filter((r) => ['created', 'bidding', 'pro_selected', 'in_progress'].includes(r.status)).length,
      totalOffers: offers.length,
      categories: categories.length
    };
    return res.json({ stats });
  },

  complaints(_req, res) {
    return res.json({ complaints: listComplaints() });
  },

  announcements(req, res) {
    if (req.method === 'GET') {
      return res.json({ announcements: listAnnouncements() });
    }
    if (req.method === 'POST') {
      if (!req.body || !req.body.title) {
        return res.status(400).json({ error: 'Title required' });
      }
      const announcement = createAnnouncement({ title: req.body.title, body: req.body.body || '' });
      return res.status(201).json({ announcement });
    }
    if (req.method === 'DELETE') {
      const removed = deleteAnnouncement(req.params.id);
      if (!removed) return res.status(404).json({ error: 'Not found' });
      return res.status(204).send('');
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
};

module.exports = adminController;
