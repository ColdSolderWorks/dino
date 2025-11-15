const store = require('../storage');

function createAnnouncement(data) {
  return store.insert('announcements', {
    ...data,
    createdAt: new Date().toISOString()
  });
}

function listAnnouncements() {
  return store.list('announcements');
}

function deleteAnnouncement(id) {
  return store.delete('announcements', id);
}

module.exports = { createAnnouncement, listAnnouncements, deleteAnnouncement };
