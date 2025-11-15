const store = require('../storage');

function createOffer(data) {
  return store.insert('offers', {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
}

function listOffers(filterFn = () => true) {
  return store.list('offers').filter(filterFn);
}

function findOffer(id) {
  return store.findById('offers', id);
}

function updateOffer(id, updates) {
  return store.update('offers', id, updates);
}

module.exports = { createOffer, listOffers, findOffer, updateOffer };
