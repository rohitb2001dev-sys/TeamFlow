const mongoose = require("mongoose");
const { TASK_STATUS, TASK_PRIORITY } = require("../constants/task.constants");

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
    },
    
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: "TODO",
    },

    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: "MEDIUM",
    },

    dueDate: {
      type: Date,
    },

    estimatedHours: {
      type: Number,
      default: 0,
    },

    actualHours: {
      type: Number,
      default: 0,
    },

    attachments: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);