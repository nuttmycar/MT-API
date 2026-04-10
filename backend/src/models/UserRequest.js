const { DataTypes } = require('sequelize');

let UserRequest;

const initUserRequest = (sequelize) => {
  UserRequest = sequelize.define('UserRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    profile: {
      type: DataTypes.STRING(100),
      defaultValue: 'default',
    },
    idCardNumber: {
      type: DataTypes.STRING(13),
      allowNull: false,
      unique: true,
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved'),
      defaultValue: 'pending',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'user_requests',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });

  return UserRequest;
};

const getUserRequest = () => {
  if (!UserRequest) {
    throw new Error('UserRequest model not initialized. Call initUserRequest() first.');
  }
  return UserRequest;
};

module.exports = { initUserRequest, getUserRequest };
