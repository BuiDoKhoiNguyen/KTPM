const { DataTypes } = require("sequelize")
const { sequelize } = require("../config/database")

const Data = sequelize.define(
  "Data",
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "data",
    timestamps: true,
    indexes: [
      {
        name: "data_key_index",
        unique: true,
        fields: ["key"],
      },
    ],
  }
)

module.exports = Data
