const express = require("express");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET USER PROFILE
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        res.status(200).json({
            message: "Profile fetched successfully",
            user: user,
        });
    } catch (error) {
        console.error("Profile Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// UPDATE USER PROFILE
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required",
            });
        }

        const existingUser = await User.findOne({
            email,
            _id: { $ne: req.user.id },
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already in use",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                name,
                email,
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: user,
        });
    } catch (error) {
        console.error("Update Profile Error:", error.message);

        res.status(500).json({
            message: "Server error",
        });
    }
});
// DEMO PRO UPGRADE (no payment gateway required for the internship demo)
router.post("/upgrade", authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { plan: "pro" },
            { returnDocument: "after" }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: "Workspace upgraded to Pro",
            user
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;