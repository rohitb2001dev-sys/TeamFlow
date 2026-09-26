const Task = require("../models/Task");
const Project = require("../models/Project");
const getNextId = require("../utils/getNextId");
const User = require("../models/User");
const { USER_ROLE } = require("../constants/user.constants");
const {
  TASK_STATUS,
  TASK_PRIORITY,
} = require("../constants/task.constants");
const createActivityLog = require("../utils/createActivityLog");
const {
  ACTIVITY_ACTION,
} = require("../constants/activity.constants");
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      priority,
      dueDate,
      estimatedHours,
    } = req.body;

    if (!title || !project) {
      return res.status(400).json({
        message: "Title and project are required",
      });
    }

    // Find project using numeric project ID
    const projectData = await Project.findOne({
      id: Number(project),
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId },
      ],
    });

    if (!projectData) {
      return res.status(404).json({
        message: "Project not found or you are not a member",
      });
    }

    // If employee is assigned, verify they belong to project
    let assignedUser = null;

    if (assignedTo) {
      assignedUser = await User.findOne({
        id: Number(assignedTo),
        role: USER_ROLE.EMPLOYEE,
        isActive: true,
      });
    
      if (!assignedUser) {
        return res.status(404).json({
          message: "Active employee not found",
        });
      }
    
      const isMember = projectData.members.some(
        (member) =>
          member.toString() === assignedUser._id.toString()
      );
    
      if (!isMember) {
        return res.status(400).json({
          message: "Employee is not a member of this project",
        });
      }
    }

    const taskId = await getNextId("task");

    const task = await Task.create({
      id: taskId,
      title,
      description,

      // IMPORTANT:
      // Store MongoDB Project _id in the relationship
      project: projectData._id,

      assignedTo: assignedUser?._id || null,
      createdBy: req.user.userId,
      priority: priority || TASK_PRIORITY.MEDIUM,
      dueDate,
      estimatedHours,
    });
    await createActivityLog({
      action: ACTIVITY_ACTION.TASK_CREATED,
      task: task._id,
      project: projectData._id,
      performedBy: req.user.userId,
      newValue: {
        title: task.title,
        assignedTo: task.assignedTo,
      },
    });
    const populatedTask = await Task.findById(task._id)
      .populate("project", "id name status")
      .populate("assignedTo", "id name email role")
      .populate("createdBy", "id name email role");

    return res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Find project using numeric ID
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

    // Task.project contains Project._id
    const tasks = await Task.find({
      project: project._id,
    })
      .populate("project", "id name status")
      .populate("assignedTo", "id name email role")
      .populate("createdBy", "id name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error("Get project tasks error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      id: Number(req.params.id),
    })
      .populate("project", "id name status")
      .populate("assignedTo", "id name email role")
      .populate("createdBy", "id name email role");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.status(200).json({
      task,
    });
  } catch (error) {
    console.error("Get task error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      id: Number(req.params.id),
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const { role } = req.user;

    // Only ADMIN and MANAGER can update task details
    if (
      role !== USER_ROLE.ADMIN &&
      role !== USER_ROLE.MANAGER
    ) {
      return res.status(403).json({
        message: "You do not have permission to update this task",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "priority",
      "dueDate",
      "estimatedHours",
      "actualHours",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("project", "id name status")
      .populate("assignedTo", "id name email role")
      .populate("createdBy", "id name email role");

    return res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    if (!Object.values(TASK_STATUS).includes(status)) {
      return res.status(400).json({
        message: "Invalid task status",
      });
    }

    // Find task using numeric task ID
    const task = await Task.findOne({
      id: Number(req.params.id),
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const { userId, role } = req.user;

    // ADMIN and MANAGER can update any task
    if (
      role !== USER_ROLE.ADMIN &&
      role !== USER_ROLE.MANAGER
    ) {
      // Employee can update only their assigned task
      if (
        !task.assignedTo ||
        task.assignedTo.toString() !== userId.toString()
      ) {
        return res.status(403).json({
          message: "You can only update the status of tasks assigned to you",
        });
      }
    }
    const previousStatus = task.status;
    task.status = status;

    await task.save();
    await createActivityLog({
      action: ACTIVITY_ACTION.TASK_STATUS_CHANGED,
      task: task._id,
      project: task.project,
      performedBy: req.user.userId,
      previousValue: previousStatus,
      newValue: status,
    });
    const updatedTask = await Task.findById(task._id)
      .populate("project", "id name status")
      .populate("assignedTo", "id name email role")
      .populate("createdBy", "id name email role");

    return res.status(200).json({
      message: "Task status updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task status error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      id: Number(req.params.id),
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const { role } = req.user;

    // Only ADMIN and MANAGER can delete tasks
    if (
      role !== USER_ROLE.ADMIN &&
      role !== USER_ROLE.MANAGER
    ) {
      return res.status(403).json({
        message: "You do not have permission to delete this task",
      });
    }
    await createActivityLog({
      action: ACTIVITY_ACTION.TASK_DELETED,
      task: task._id,
      project: task.project,
      performedBy: req.user.userId,
      previousValue: {
        title: task.title,
        status: task.status,
        assignedTo: task.assignedTo,
      },
    });
    await Task.deleteOne({
      _id: task._id,
    });

    return res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const assignTask = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Find task using numeric task ID
    const task = await Task.findOne({
      id: Number(req.params.id),
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Find employee using numeric user ID
    const employee = await User.findOne({
      id: Number(userId),
      role: USER_ROLE.EMPLOYEE,
      isActive: true,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Active employee not found",
      });
    }

    // Get project
    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Verify employee belongs to project
    const isMember = project.members.some(
      (member) =>
        member.toString() === employee._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        message: "Employee is not a member of this project",
      });
    }

    // Save previous assignee for audit information
    const previousAssignee = task.assignedTo;
    task.assignedTo = employee._id;
    await task.save();
    await createActivityLog({
      action: previousAssignee
        ? ACTIVITY_ACTION.TASK_REASSIGNED
        : ACTIVITY_ACTION.TASK_ASSIGNED,
      task: task._id,
      project: task.project,
      performedBy: req.user.userId,
      previousValue: previousAssignee,
      newValue: employee._id,
    });

    const updatedTask = await Task.findById(task._id)
      .populate("project", "id name status")
      .populate("assignedTo", "id name email role")
      .populate("createdBy", "id name email role");

    return res.status(200).json({
      message: previousAssignee
        ? "Task reassigned successfully"
        : "Task assigned successfully",

      task: updatedTask,

      audit: {
        previousAssignee,
        newAssignee: employee._id,
        assignedBy: req.user.userId,
      },
    });
  } catch (error) {
    console.error("Assign task error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  assignTask
};