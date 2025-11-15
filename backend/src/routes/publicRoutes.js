const express = require('express');
const { listAnnouncements } = require('../models/announcementModel');
const { listCategories } = require('../models/categoryModel');

const router = express.Router();

router.get('/announcements', (_req, res) => {
  res.json({ announcements: listAnnouncements() });
});

router.get('/categories', (_req, res) => {
  res.json({ categories: listCategories() });
});

module.exports = router;
