const ActivityLog = require("../models/ActivityLog");

const createActivityLog = async ({
  action,
  task = null,
  project = null,
  performedBy,
  previousValue = null,
  newValue = null,
}) => {
  return ActivityLog.create({
    action,
    task,
    project,
    performedBy,
    previousValue,
    newValue,
  });
};

module.exports = createActivityLog;