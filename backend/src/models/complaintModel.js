const store = require('../storage');

function createComplaint(data) {
  return store.insert('complaints', {
    ...data,
    status: 'open',
    createdAt: new Date().toISOString()
  });
}

function listComplaints() {
  return store.list('complaints');
}

module.exports = { createComplaint, listComplaints };
