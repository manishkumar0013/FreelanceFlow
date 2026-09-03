const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        hourlyRate: {
            type: Number,
            min: 0,
            default: 0,
        },

        company: {
            type: String,
            trim: true,
        },

        notes: {
            type: String,
            trim: true,
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


module.exports = mongoose.model("Client", clientSchema);