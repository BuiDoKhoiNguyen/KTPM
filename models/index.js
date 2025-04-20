const sequelize = require('../config/database');
const defineDataModel = require('./data');
const defineDataHistoryModel = require('./data-history');

const Data = defineDataModel(sequelize);
const DataHistory = defineDataHistoryModel(sequelize);

const initializeModels = async () => {
  try {
    await sequelize.sync();
    console.log('Models synchronized with database');
  } catch (err) {
    console.error('Failed to sync models:', err);
    throw err;
  }
};

module.exports = {
  sequelize,
  Data,
  DataHistory,
  initializeModels
};