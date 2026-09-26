const express = require("express");
const router = express.Router();

const {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  assignTask
} = require("../controllers/task.controller");

const { protect } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const { USER_ROLE } = require("../constants/user.constants");

// Create task
router.post(
  "/",
  protect,
  authorizeRoles(USER_ROLE.ADMIN, USER_ROLE.MANAGER),
  createTask
);

// Get project tasks
router.get(
  "/project/:projectId",
  protect,
  getProjectTasks
);

// Get single task
router.get(
  "/:id",
  protect,
  getTaskById
);

router.patch(
  "/:id/assign",
  protect,
  authorizeRoles(USER_ROLE.ADMIN, USER_ROLE.MANAGER),
  assignTask
);

// Update task
router.patch(
  "/:id",
  protect,
  authorizeRoles(USER_ROLE.ADMIN, USER_ROLE.MANAGER),
  updateTask
);

// Update task status
router.patch(
  "/:id/status",
  protect,
  updateTaskStatus
);

// Delete task
router.delete(
  "/:id",
  protect,
  authorizeRoles(USER_ROLE.ADMIN, USER_ROLE.MANAGER),
  deleteTask
);

module.exports = router;