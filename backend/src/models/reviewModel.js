const store = require('../storage');

function createReview(data) {
  return store.insert('reviews', {
    ...data,
    createdAt: new Date().toISOString()
  });
}

function listReviews(filterFn = () => true) {
  return store.list('reviews').filter(filterFn);
}

module.exports = { createReview, listReviews };
