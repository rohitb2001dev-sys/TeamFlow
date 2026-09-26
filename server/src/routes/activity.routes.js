const express = require("express");

const router = express.Router();

const {
  getProjectActivity,
} = require("../controllers/activity.controller");

const { protect } = require("../middleware/auth.middleware");

router.get(
  "/project/:projectId",
  protect,
  getProjectActivity
);

module.exports = router;