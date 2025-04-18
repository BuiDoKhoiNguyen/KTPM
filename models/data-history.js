const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('DataHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE'),
      allowNull: false
    },
    // Đã loại bỏ trường userId có tham chiếu đến bảng users
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'data_history',
    timestamps: true,
    indexes: [
      {
        name: 'data_history_key_index',
        fields: ['key']
      },
      {
        name: 'data_history_timestamp_index',
        fields: ['timestamp']
      }
    ]
  });
};