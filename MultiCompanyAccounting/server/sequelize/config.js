
const fs = require('fs');
require('dotenv').config();

// Use the correct credentials for external database
const dbConfig = {
  host: '135.235.154.222',
  username: 'pguser',
  password: 'StrongP@ss123',
  port: 5432,
  database: 'account_replit_staging',
  dialect: 'postgres'
};

module.exports = {
  development: dbConfig,
  production: dbConfig
};
