const express = require("express");

const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
} = require("../controllers/project.controller");

const { protect } = require("../middleware/auth.middleware");
const { USER_ROLE } = require("../constants/user.constants");
const { authorizeRoles } = require("../middleware/role.middleware");
const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles(USER_ROLE.ADMIN, USER_ROLE.MANAGER),
  createProject
);
router.get("/", protect, getProjects);
router.get("/:id", protect, getProjectById);
router.patch("/:id", protect, updateProject);
router.patch("/:id", protect, deleteProject);
router.post(
  "/:id/members",
  protect,
  authorizeRoles(USER_ROLE.ADMIN, USER_ROLE.MANAGER),
  addProjectMember
);
router.delete(
  "/:id/members/:userId",
  protect,
  authorizeRoles(USER_ROLE.ADMIN, USER_ROLE.MANAGER),
  removeProjectMember
);
module.exports = router;