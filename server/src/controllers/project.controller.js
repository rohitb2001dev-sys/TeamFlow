const Project = require("../models/Project");
const getNextId = require("../utils/getNextId");

const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      dueDate,
      status,
      priority,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    const projectId = await getNextId("project");

    const project = await Project.create({
      id: projectId,
      name,
      description,
      startDate,
      dueDate,
      status,
      priority,
      owner: req.user.userId,
      members: [req.user.userId],
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email role")
      .populate("members", "name email role");

    return res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId },
      ],
    })
      .populate("owner", "name email role")
      .populate("members", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.findOne({
      id: Number(req.params.id),
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId },
      ],
    })
      .populate("owner", "name email role")
      .populate("members", "name email role");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(200).json({
      project,
    });
  } catch (error) {
    console.error("Get project error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      id: Number(req.params.id),
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found or you are not the owner",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "startDate",
      "dueDate",
      "status",
      "priority",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    await project.save();

    return res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Update project error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      id: Number(req.params.id),
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found or you are not the owner",
      });
    }

    return res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
const addProjectMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Find project using our numeric project ID
    const project = await Project.findOne({
      id: Number(id),
      owner: req.user.userId,
    });
    if (!project) {
      return res.status(404).json({
        message: "Project not found or you are not the owner",
      });
    }

    // Find employee
    const User = require("../models/User");

    const employee = await User.findOne({
      id: Number(userId),
      role: "EMPLOYEE",
      isActive: true,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Active employee not found",
      });
    }

    // Check if already a member
    const alreadyMember = project.members.some(
      (member) => member.toString() === employee._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "Employee is already a project member",
      });
    }

    project.members.push(employee._id);

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "id name email role")
      .populate("members", "id name email role");

    return res.status(200).json({
      message: "Employee added to project successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Add project member error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const removeProjectMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findOne({
      id: Number(id),
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found or you are not the owner",
      });
    }

    const User = require("../models/User");

    const employee = await User.findOne({
      id: Number(userId),
      role: "EMPLOYEE",
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.toString() === employee._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        message: "Employee is not a member of this project",
      });
    }

    project.members = project.members.filter(
      (member) => member.toString() !== employee._id.toString()
    );

    await project.save();

    return res.status(200).json({
      message: "Employee removed from project successfully",
    });
  } catch (error) {
    console.error("Remove project member error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember
};