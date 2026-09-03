const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

        role: {
            type: String,
            default: "freelancer",
        },

        plan: {
            type: String,
            enum: ["free", "pro"],
            default: "free",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);