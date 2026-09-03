const express = require("express");
const Client = require("../models/Client");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE CLIENT
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, company, notes, hourlyRate } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required",
            });
        }

        const user = await require("../models/user").findById(req.user.id);
        const clientCount = await Client.countDocuments({ owner: req.user.id });
        if (user?.plan === "free" && clientCount >= 2) {
            return res.status(403).json({ message: "Free plan allows a maximum of 2 clients. Upgrade to Pro for unlimited clients." });
        }

        const client = await Client.create({
            name,
            email,
            phone,
            company,
            notes,
            hourlyRate: Number(hourlyRate || 0),
            owner: req.user.id,
        });

        res.status(201).json({
            message: "Client created successfully",
            client,
        });
    } catch (error) {
        console.error("Create Client Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// GET ALL CLIENTS
router.get("/", authMiddleware, async (req, res) => {
    try {
        const clients = await Client.find({
            owner: req.user.id,
        }).sort({ createdAt: -1 });

        res.status(200).json({
            message: "Clients fetched successfully",
            clients,
        });
    } catch (error) {
        console.error("Get Clients Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// GET SINGLE CLIENT
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const client = await Client.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        res.status(200).json({
            message: "Client fetched successfully",
            client,
        });
    } catch (error) {
        console.error("Get Single Client Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// UPDATE CLIENT
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, company, notes, hourlyRate } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required",
            });
        }

        const client = await Client.findOneAndUpdate(
            {
                _id: req.params.id,
                owner: req.user.id,
            },
            {
                name,
                email,
                phone,
                company,
                notes,
                hourlyRate: Number(hourlyRate || 0),
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        res.status(200).json({
            message: "Client updated successfully",
            client,
        });
    } catch (error) {
        console.error("Update Client Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// DELETE CLIENT
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const client = await Client.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        res.status(200).json({
            message: "Client deleted successfully",
        });
    } catch (error) {
        console.error("Delete Client Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});

module.exports = router;