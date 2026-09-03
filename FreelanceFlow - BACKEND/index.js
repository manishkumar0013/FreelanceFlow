require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const testRoutes = require("./routes/testRoutes");
const userRoutes = require("./routes/userRoutes");
const clientRoutes = require("./routes/clientRoutes");
const projectRoutes = require("./routes/projectRoutes");
const timeLogRoutes = require("./routes/timeLogRoutes");
const sampleRoutes = require("./routes/sampleRoutes");




const PORT = process.env.PORT || 5000;

// Connect MongoDB
connectDB();


// Auth routes
app.use("/api/auth", authRoutes);

// Task routes
app.use("/api/tasks", taskRoutes);

// Invoice routes
app.use("/api/invoices", invoiceRoutes);

// Test protected routes
app.use("/api/test", testRoutes);

// User routes
app.use("/api/users", userRoutes);

// Client routes
app.use("/api/clients", clientRoutes);

// Project routes
app.use("/api/projects", projectRoutes);
app.use("/api/time-logs", timeLogRoutes);
app.use("/api/sample-data", sampleRoutes);

// Test routes
app.get("/", (req, res) => {
    res.send("FreelanceFlow Backend is Running 🚀");
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});