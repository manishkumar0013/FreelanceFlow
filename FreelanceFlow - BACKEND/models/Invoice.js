const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: ["draft", "sent", "paid", "overdue"],
            default: "draft",
        },

        issueDate: {
            type: Date,
            default: Date.now,
        },

        dueDate: {
            type: Date,
            required: true,
        },

        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Invoice", invoiceSchema);