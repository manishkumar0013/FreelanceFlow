const express = require("express");
const TimeLog = require("../models/TimeLog");
const Client = require("../models/Client");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

async function ownedPair(clientId, projectId, userId) {
    const [client, project] = await Promise.all([
        Client.findOne({ _id: clientId, owner: userId }),
        Project.findOne({ _id: projectId, owner: userId, client: clientId })
    ]);
    return { client, project };
}

router.get("/", authMiddleware, async (req, res) => {
    try {
        const filter = { owner: req.user.id };
        if (req.query.client) filter.client = req.query.client;
        if (req.query.project) filter.project = req.query.project;
        if (req.query.unbilled === "true") filter.billed = false;
        if (req.query.from || req.query.to) {
            filter.startTime = {};
            if (req.query.from) filter.startTime.$gte = new Date(req.query.from);
            if (req.query.to) filter.startTime.$lte = new Date(req.query.to);
        }
        const logs = await TimeLog.find(filter)
            .populate("client", "name hourlyRate")
            .populate("project", "name budget")
            .sort({ startTime: -1 });
        res.json({ logs });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

router.post("/start", authMiddleware, async (req, res) => {
    try {
        const { client, project, description } = req.body;
        const pair = await ownedPair(client, project, req.user.id);
        if (!pair.client || !pair.project) return res.status(404).json({ message: "Client or project not found" });
        const running = await TimeLog.findOne({ owner: req.user.id, endTime: null });
        if (running) return res.status(409).json({ message: "A timer is already running", log: running });
        const log = await TimeLog.create({ client, project, description, owner: req.user.id, startTime: new Date(), source: "timer" });
        res.status(201).json({ message: "Timer started", log });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

router.post("/stop/:id", authMiddleware, async (req, res) => {
    try {
        const log = await TimeLog.findOne({ _id: req.params.id, owner: req.user.id, endTime: null });
        if (!log) return res.status(404).json({ message: "Running timer not found" });
        const end = new Date();
        log.endTime = end;
        const elapsedSeconds = Math.max(0, Math.floor((end - log.startTime) / 1000));
        log.durationSeconds = elapsedSeconds;
        // Keep fractional minutes so short timer sessions are not rounded down to 0.
        log.durationMinutes = Number((elapsedSeconds / 60).toFixed(4));
        await log.save();
        res.json({ message: "Timer stopped", log });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

router.post("/manual", authMiddleware, async (req, res) => {
    try {
        const { client, project, date, hours, description } = req.body;
        const pair = await ownedPair(client, project, req.user.id);
        if (!pair.client || !pair.project) return res.status(404).json({ message: "Client or project not found" });
        const mins = Math.round(Number(hours) * 60);
        if (!date || !Number.isFinite(mins) || mins <= 0) return res.status(400).json({ message: "Valid date and hours are required" });
        const start = new Date(`${date}T09:00:00`);
        const end = new Date(start.getTime() + mins * 60000);
        const log = await TimeLog.create({ client, project, owner: req.user.id, startTime: start, endTime: end, durationMinutes: mins, durationSeconds: mins * 60, description, source: "manual" });
        res.status(201).json({ message: "Manual time added", log });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const log = await TimeLog.findOneAndDelete({ _id: req.params.id, owner: req.user.id, billed: false });
        if (!log) return res.status(404).json({ message: "Time log not found or already billed" });
        res.json({ message: "Time log deleted" });
    } catch (e) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;
