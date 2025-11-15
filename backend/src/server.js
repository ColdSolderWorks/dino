const config = require('./config');
const createApp = require('./app');
const seed = require('./bootstrap/seed');

seed();
const app = createApp();

app.listen(config.port, () => {
  console.log(`Ustabul61 API listening on port ${config.port}`);
});
