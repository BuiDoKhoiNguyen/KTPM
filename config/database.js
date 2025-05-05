require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ktpm_db',
    logging: false,
    pool: {
      max: 25,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  });

async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connection has been established successfully.');
        
        await sequelize.sync({ alter: true });
        console.log('Database initialized and models synced successfully with altered tables');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

module.exports = {
    sequelize,
    initializeDatabase
};