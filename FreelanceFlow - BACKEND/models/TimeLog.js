const mongoose = require("mongoose");

const timeLogSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0, min: 0 },
    durationSeconds: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true },
    billed: { type: Boolean, default: false },
    source: { type: String, enum: ["timer", "manual"], default: "timer" }
}, { timestamps: true });

module.exports = mongoose.model("TimeLog", timeLogSchema);
