const DataStore = require('./dataStore');
const config = require('../config');

const store = new DataStore(config.dataPath);

module.exports = store;
