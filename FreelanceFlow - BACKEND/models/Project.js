const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
        },

        budget: {
            type: Number,
            required: true,
            min: 0,
        },

        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 50,
        },

        status: {
            type: String,
            enum: ["planning", "in-progress", "completed", "cancelled"],
            default: "planning",
        },

        startDate: {
            type: Date,
        },

        deadline: {
            type: Date,
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Project", projectSchema);