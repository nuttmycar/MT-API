const { DataTypes } = require('sequelize');

let LoginHistory;

const initLoginHistory = (sequelize) => {
  LoginHistory = sequelize.define('LoginHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'guest',
    },
    status: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: false,
      defaultValue: 'success',
    },
    source: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'dashboard',
    },
    ipAddress: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    message: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
  }, {
    tableName: 'login_history',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });

  return LoginHistory;
};

const getLoginHistory = () => {
  if (!LoginHistory) {
    throw new Error('LoginHistory model not initialized. Call initLoginHistory() first.');
  }
  return LoginHistory;
};

module.exports = { initLoginHistory, getLoginHistory };
