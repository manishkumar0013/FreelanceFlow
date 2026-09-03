const express = require("express");
const Project = require("../models/Project");
const Client = require("../models/Client");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE PROJECT
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            name,
            description,
            client,
            budget,
            progress,
            status,
            startDate,
            deadline,
        } = req.body;

        if (!name || !client || budget === undefined) {
            return res.status(400).json({
                message: "Name, client and budget are required",
            });
        }

        const clientExists = await Client.findOne({
            _id: client,
            owner: req.user.id,
        });

        if (!clientExists) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        const project = await Project.create({
            name,
            description,
            client,
            budget,
            progress,
            status,
            startDate,
            deadline,
            owner: req.user.id,
        });

        res.status(201).json({
            message: "Project created successfully",
            project,
        });
    } catch (error) {
        console.error("Create Project Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// GET ALL PROJECTS
router.get("/", authMiddleware, async (req, res) => {
    try {
        const projects = await Project.find({
            owner: req.user.id,
        })
            .populate("client", "name email company hourlyRate")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Projects fetched successfully",
            projects,
        });
    } catch (error) {
        console.error("Get Projects Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// GET SINGLE PROJECT
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user.id,
        }).populate("client", "name email company hourlyRate");

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        res.status(200).json({
            message: "Project fetched successfully",
            project,
        });
    } catch (error) {
        console.error("Get Single Project Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// UPDATE PROJECT
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const {
            name,
            description,
            client,
            budget,
            progress,
            status,
            startDate,
            deadline,
        } = req.body;

        if (!name || !client || budget === undefined) {
            return res.status(400).json({
                message: "Name, client and budget are required",
            });
        }

        const clientExists = await Client.findOne({
            _id: client,
            owner: req.user.id,
        });

        if (!clientExists) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        const project = await Project.findOneAndUpdate(
            {
                _id: req.params.id,
                owner: req.user.id,
            },
            {
                name,
                description,
                client,
                budget,
                progress,
                status,
                startDate,
                deadline,
                progress,
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).populate("client", "name email company hourlyRate");

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        res.status(200).json({
            message: "Project updated successfully",
            project,
        });
    } catch (error) {
        console.error("Update Project Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// DELETE PROJECT
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        res.status(200).json({
            message: "Project deleted successfully",
        });
    } catch (error) {
        console.error("Delete Project Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
module.exports = router;