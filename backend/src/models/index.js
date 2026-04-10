const { initUserRequest } = require('./UserRequest');
const { initPosition } = require('./Position');
const { initDepartment } = require('./Department');
const { initAuditLog } = require('./AuditLog');
const { initLoginHistory } = require('./LoginHistory');

const initModels = (sequelize) => {
  initUserRequest(sequelize);
  initPosition(sequelize);
  initDepartment(sequelize);
  initAuditLog(sequelize);
  initLoginHistory(sequelize);
};

module.exports = { initModels };
