const { DataTypes } = require('sequelize');

let GeneratedUser;

const initGeneratedUser = (sequelize) => {
  GeneratedUser = sequelize.define('GeneratedUser', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    profile: {
      type: DataTypes.STRING(100),
      defaultValue: 'default',
    },
    comment: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('generated', 'synced', 'disabled', 'removed'),
      defaultValue: 'generated',
    },
    type: {
      type: DataTypes.ENUM('generated', 'imported'),
      defaultValue: 'generated',
    },
    mikrotikSynced: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    batchLabel: {
      type: DataTypes.STRING(100),
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
    tableName: 'generated_users',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });

  return GeneratedUser;
};

const getGeneratedUser = () => {
  if (!GeneratedUser) throw new Error('GeneratedUser model not initialized');
  return GeneratedUser;
};

module.exports = { initGeneratedUser, getGeneratedUser };
