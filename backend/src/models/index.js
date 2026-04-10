const { initUserRequest } = require('./UserRequest');
const { initPosition } = require('./Position');
const { initDepartment } = require('./Department');
const { initAuditLog } = require('./AuditLog');

const initModels = (sequelize) => {
  initUserRequest(sequelize);
  initPosition(sequelize);
  initDepartment(sequelize);
  initAuditLog(sequelize);
};

module.exports = { initModels };
