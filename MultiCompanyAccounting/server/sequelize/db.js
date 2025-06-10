const { Sequelize } = require('sequelize');

const config = require('./config');

// Determine environment
const env = process.env.NODE_ENV || 'development';
const configuration = config[env];

// Create Sequelize instance
let sequelize;
if (configuration.url) {
  sequelize = new Sequelize(configuration.url, configuration);
} else {
  sequelize = new Sequelize(
    configuration.database,
    configuration.username,
    configuration.password,
    configuration
  );
}

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection
};