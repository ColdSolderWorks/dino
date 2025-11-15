const fs = require('fs');
const path = require('path');

class DataStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      users: [],
      categories: [],
      requests: [],
      offers: [],
      reviews: [],
      announcements: [],
      complaints: [],
      refreshTokens: []
    };
    this.counters = {
      users: 0,
      categories: 0,
      requests: 0,
      offers: 0,
      reviews: 0,
      announcements: 0,
      complaints: 0
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = parsed.data || this.data;
          this.counters = parsed.counters || this.counters;
        }
      } else {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        this.persist();
      }
    } catch (err) {
      console.error('Failed to load datastore', err);
    }
  }

  persist() {
    fs.writeFileSync(this.filePath, JSON.stringify({ data: this.data, counters: this.counters }, null, 2));
  }

  nextId(collection) {
    this.counters[collection] = (this.counters[collection] || 0) + 1;
    this.persist();
    return this.counters[collection];
  }

  list(collection) {
    return this.data[collection] || [];
  }

  findById(collection, id) {
    return this.list(collection).find((item) => String(item.id) === String(id));
  }

  insert(collection, record) {
    const entity = { ...record, id: this.nextId(collection) };
    this.data[collection].push(entity);
    this.persist();
    return entity;
  }

  update(collection, id, updates) {
    const records = this.list(collection);
    const index = records.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return null;
    records[index] = { ...records[index], ...updates };
    this.persist();
    return records[index];
  }

  delete(collection, id) {
    const records = this.list(collection);
    const index = records.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return false;
    records.splice(index, 1);
    this.persist();
    return true;
  }
}

module.exports = DataStore;
