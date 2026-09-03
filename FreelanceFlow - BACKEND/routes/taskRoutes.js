const express = require("express");
const Task = require("../models/task");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function normalizeStatus(status) {
    const value = String(status || "todo").trim().toLowerCase();
    if (value === "in progress" || value === "in_progress" || value === "inprogress") return "in-progress";
    if (value === "done" || value === "complete" || value === "completed") return "completed";
    if (value === "to do" || value === "to_do" || value === "todo") return "todo";
    return value;
}

// CREATE TASK
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            project,
            status,
            priority,
            dueDate,
        } = req.body;

        if (!title || !project) {
            return res.status(400).json({
                message: "Title and project are required",
            });
        }

        const projectExists = await Project.findOne({
            _id: project,
            owner: req.user.id,
        });

        if (!projectExists) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        const task = await Task.create({
            title,
            description,
            project,
            status: normalizeStatus(status),
            priority,
            dueDate,
            owner: req.user.id,
        });

        res.status(201).json({
            message: "Task created successfully",
            task,
        });
    } catch (error) {
        console.error("Create Task Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// GET ALL TASKS
router.get("/", authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({
            owner: req.user.id,
        })
            .populate("project", "name client")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Tasks fetched successfully",
            tasks,
        });
    } catch (error) {
        console.error("Get Tasks Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// GET SINGLE TASK
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            owner: req.user.id,
        }).populate("project", "name client");

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task fetched successfully",
            task,
        });
    } catch (error) {
        console.error("Get Single Task Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// UPDATE TASK
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            project,
            status,
            priority,
            dueDate,
        } = req.body;

        if (!title || !project) {
            return res.status(400).json({
                message: "Title and project are required",
            });
        }

        const projectExists = await Project.findOne({
            _id: project,
            owner: req.user.id,
        });

        if (!projectExists) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        const task = await Task.findOneAndUpdate(
            {
                _id: req.params.id,
                owner: req.user.id,
            },
            {
                title,
                description,
                project,
                status: normalizeStatus(status),
                priority,
                dueDate,
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).populate("project", "name client");

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task updated successfully",
            task,
        });
    } catch (error) {
        console.error("Update Task Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// DELETE TASK
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task deleted successfully",
        });
    } catch (error) {
        console.error("Delete Task Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
module.exports = router;