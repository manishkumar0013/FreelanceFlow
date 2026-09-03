const express = require("express");
const Client = require("../models/Client");
const Project = require("../models/Project");
const Task = require("../models/task");
const Invoice = require("../models/Invoice");
const TimeLog = require("../models/TimeLog");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/load", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({message:"User not found"});
    const existingClients = await Client.find({owner:user._id});
    if (existingClients.length > 0) return res.status(409).json({message:"Sample data can only be loaded into an empty workspace. Delete existing demo data or use your current records."});
    if (user.plan === "free") {
      // exactly two clients so the free-tier limit remains respected
    }
    const clients = await Client.insertMany([
      {name:"Acme Studios", email:"hello@acmestudios.test", company:"Acme Studios", hourlyRate:1500, owner:user._id},
      {name:"Nova Labs", email:"team@novalabs.test", company:"Nova Labs", hourlyRate:1200, owner:user._id}
    ]);
    const projects = await Project.insertMany([
      {name:"Brand identity package", description:"Complete visual identity system", client:clients[0]._id, budget:120000, progress:82, status:"in-progress", deadline:new Date("2026-09-05"), owner:user._id},
      {name:"Landing page redesign", description:"High-converting marketing website", client:clients[1]._id, budget:85000, progress:64, status:"in-progress", deadline:new Date("2026-09-10"), owner:user._id}
    ]);
    await Task.insertMany([
      {title:"Finalize logo concepts",description:"Complete final logo concepts",project:projects[0]._id,status:"todo",priority:"high",dueDate:new Date("2026-09-02"),owner:user._id},
      {title:"Prepare brand guidelines",description:"Document the final system",project:projects[0]._id,status:"in-progress",priority:"medium",dueDate:new Date("2026-09-04"),owner:user._id},
      {title:"Write homepage copy",description:"Create conversion-focused copy",project:projects[1]._id,status:"todo",priority:"medium",dueDate:new Date("2026-09-06"),owner:user._id},
      {title:"Responsive QA",description:"Test desktop and mobile layouts",project:projects[1]._id,status:"completed",priority:"low",dueDate:new Date("2026-09-08"),owner:user._id}
    ]);
    const now = new Date();
    await TimeLog.insertMany([
      {client:clients[0]._id,project:projects[0]._id,owner:user._id,startTime:new Date(now.getTime()-5*3600000),endTime:new Date(now.getTime()-2*3600000),durationMinutes:180,description:"Logo exploration",source:"manual"},
      {client:clients[0]._id,project:projects[0]._id,owner:user._id,startTime:new Date(now.getTime()-2*86400000),endTime:new Date(now.getTime()-2*86400000+2*3600000),durationMinutes:120,description:"Brand system",source:"manual"},
      {client:clients[1]._id,project:projects[1]._id,owner:user._id,startTime:new Date(now.getTime()-86400000),endTime:new Date(now.getTime()-86400000+3*3600000),durationMinutes:180,description:"Landing page work",source:"manual"}
    ]);
    await Invoice.insertMany([
      {invoiceNumber:`INV-DEMO-001-${Date.now()}`,client:clients[0]._id,project:projects[0]._id,owner:user._id,amount:45000,status:"paid",dueDate:new Date("2026-09-15")},
      {invoiceNumber:`INV-DEMO-002-${Date.now()}`,client:clients[1]._id,project:projects[1]._id,owner:user._id,amount:18000,status:"sent",dueDate:new Date("2026-09-20")}
    ]);
    res.status(201).json({message:"Sample data loaded successfully",clients:2,projects:2,tasks:4,timeLogs:3,invoices:2});
  } catch(e) { console.error(e); res.status(500).json({message:"Could not load sample data"}); }
});
module.exports=router;
