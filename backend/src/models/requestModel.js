const store = require('../storage');

function createRequest(data) {
  const request = store.insert('requests', {
    ...data,
    status: 'created',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return request;
}

function listRequests(filterFn = () => true) {
  return store.list('requests').filter(filterFn);
}

function findRequest(id) {
  return store.findById('requests', id);
}

function updateRequest(id, updates) {
  updates.updatedAt = new Date().toISOString();
  return store.update('requests', id, updates);
}

module.exports = { createRequest, listRequests, findRequest, updateRequest };
