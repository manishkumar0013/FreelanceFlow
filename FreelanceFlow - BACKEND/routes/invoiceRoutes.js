const express = require("express");
const PDFDocument = require("pdfkit");
const Invoice = require("../models/Invoice");
const Client = require("../models/Client");
const Project = require("../models/Project");
const TimeLog = require("../models/TimeLog");
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
  try { const invoices = await Invoice.find({ owner: req.user.id }).populate("client", "name email hourlyRate").populate("project", "name").sort({ createdAt: -1 }); res.json({ invoices }); }
  catch (e) { res.status(500).json({ message: "Server error" }); }
});

router.post("/from-time", authMiddleware, async (req, res) => {
  try {
    const { invoiceNumber, client, project, dueDate, from, to, notes } = req.body;
    if (!invoiceNumber || !client || !project || !dueDate) return res.status(400).json({ message: "Invoice number, client, project and due date are required" });
    const pair = await ownedPair(client, project, req.user.id);
    if (!pair.client || !pair.project) return res.status(404).json({ message: "Client or project not found" });
    const filter = { owner: req.user.id, client, project, billed: false, endTime: { $ne: null } };
    if (from || to) { filter.startTime = {}; if (from) filter.startTime.$gte = new Date(from); if (to) filter.startTime.$lte = new Date(`${to}T23:59:59`); }
    const logs = await TimeLog.find(filter).sort({ startTime: 1 });
    if (!logs.length) return res.status(400).json({ message: "No unbilled time logs found for this client/project and date range" });
    const minutes = logs.reduce((a, l) => a + Number(l.durationMinutes || 0), 0);
    const rate = Number(pair.client.hourlyRate || 0);
    const amount = Math.round((minutes / 60) * rate * 100) / 100;
    if (rate <= 0) return res.status(400).json({ message: "Set the client's hourly rate before invoicing time" });
    const existing = await Invoice.findOne({ invoiceNumber }); if (existing) return res.status(409).json({ message: "Invoice number already exists" });
    const invoice = await Invoice.create({ invoiceNumber, client, project, owner: req.user.id, amount, status: "sent", dueDate, notes: notes || "Generated from unbilled time" });
    await TimeLog.updateMany({ _id: { $in: logs.map(l => l._id) } }, { billed: true });
    res.status(201).json({ message: "Invoice generated from time logs", invoice, hours: minutes / 60, rate, logsBilled: logs.length });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { invoiceNumber, client, project, amount, status, dueDate, notes } = req.body;
    if (!invoiceNumber || !client || !project || amount === undefined || !dueDate) return res.status(400).json({ message: "Invoice number, client, project, amount and due date are required" });
    const pair = await ownedPair(client, project, req.user.id); if (!pair.client || !pair.project) return res.status(404).json({ message: "Client or project not found" });
    if (await Invoice.findOne({ invoiceNumber })) return res.status(409).json({ message: "Invoice number already exists" });
    const invoice = await Invoice.create({ invoiceNumber, client, project, owner: req.user.id, amount, status, dueDate, notes }); res.status(201).json({ message: "Invoice created successfully", invoice });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

router.get("/:id", authMiddleware, async (req, res) => { try { const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user.id }).populate("client", "name email hourlyRate").populate("project", "name"); if (!invoice) return res.status(404).json({ message: "Invoice not found" }); res.json({ invoice }); } catch (e) { res.status(500).json({ message: "Server error" }); } });

router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const User = require("../models/user");
    const user = await User.findById(req.user.id).select("plan");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.plan !== "pro") return res.status(403).json({ message: "PDF invoicing is available on the Pro plan. Upgrade your workspace first." });
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user.id }).populate("client", "name email company hourlyRate").populate("project", "name description");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    const doc = new PDFDocument({ margin: 50 }); const filename = `${invoice.invoiceNumber}.pdf`; res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="${filename}"`); doc.pipe(res);
    doc.fontSize(26).text("FreelanceFlow", { bold: true }); doc.fontSize(11).fillColor("#666").text("Professional freelance invoice"); doc.moveDown();
    doc.fillColor("#111").fontSize(18).text("INVOICE"); doc.fontSize(11).text(`Invoice #: ${invoice.invoiceNumber}`); doc.text(`Issued: ${new Date(invoice.issueDate).toLocaleDateString("en-IN")}`); doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`); doc.moveDown();
    doc.fontSize(12).text("Bill To", { underline: true }); doc.fontSize(11).text(invoice.client?.name || "Client"); if (invoice.client?.company) doc.text(invoice.client.company); if (invoice.client?.email) doc.text(invoice.client.email); doc.moveDown();
    doc.text(`Project: ${invoice.project?.name || "Project"}`); doc.moveDown();
    doc.fontSize(12).text("Amount Due", { underline: true }); doc.fontSize(24).text(`INR ${Number(invoice.amount).toLocaleString("en-IN")}`); doc.fontSize(11).text(`Status: ${String(invoice.status).toUpperCase()}`); doc.moveDown(2);
    if (invoice.notes) doc.text(`Notes: ${invoice.notes}`); doc.moveDown(3); doc.fontSize(9).fillColor("#666").text("Generated by FreelanceFlow"); doc.end();
  } catch (e) { console.error(e); res.status(500).json({ message: "Could not generate PDF" }); }
});

router.patch("/:id/status", authMiddleware, async (req, res) => { try { const { status } = req.body; if (!["draft", "sent", "paid", "overdue"].includes(status)) return res.status(400).json({ message: "Invalid invoice status" }); const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, { status }, { new: true, runValidators: true }); if (!invoice) return res.status(404).json({ message: "Invoice not found" }); res.json({ message: "Invoice status updated", invoice }); } catch (e) { res.status(500).json({ message: "Server error" }); } });

router.put("/:id", authMiddleware, async (req, res) => { try { const { invoiceNumber, client, project, amount, status, dueDate, notes } = req.body; const invoice = await Invoice.findOneAndUpdate(
  { _id: req.params.id, owner: req.user.id },
  { status },
  { returnDocument: "after", runValidators: true }
); if (!invoice) return res.status(404).json({ message: "Invoice not found" }); res.json({ message: "Invoice updated successfully", invoice }); } catch (e) { res.status(500).json({ message: "Server error" }); } });
router.delete("/:id", authMiddleware, async (req, res) => { try { const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, owner: req.user.id }); if (!invoice) return res.status(404).json({ message: "Invoice not found" }); res.json({ message: "Invoice deleted successfully" }); } catch (e) { res.status(500).json({ message: "Server error" }); } });
module.exports = router;
