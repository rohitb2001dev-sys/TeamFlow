const ActivityLog = require("../models/ActivityLog");
const Project = require("../models/Project");

const getProjectActivity = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      id: Number(projectId),
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId },
      ],
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const activities = await ActivityLog.find({
      project: project._id,
    })
      .populate("performedBy", "id name email role")
      .populate("task", "id title")
      .populate("project", "id name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      activities,
    });
  } catch (error) {
    console.error("Get project activity error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

module.exports = {
  getProjectActivity,
};