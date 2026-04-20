const { initUserRequest } = require('./UserRequest');
const { initPosition } = require('./Position');
const { initDepartment } = require('./Department');
const { initAuditLog } = require('./AuditLog');
const { initLoginHistory } = require('./LoginHistory');
const { initGeneratedUser } = require('./GeneratedUser');

const initModels = (sequelize) => {
  initUserRequest(sequelize);
  initPosition(sequelize);
  initDepartment(sequelize);
  initAuditLog(sequelize);
  initLoginHistory(sequelize);
  initGeneratedUser(sequelize);
};

module.exports = { initModels };
