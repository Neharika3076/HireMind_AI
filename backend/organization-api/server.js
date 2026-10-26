
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const userRoutes = require("./routes/userRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const taskRoutes = require("./routes/taskRouters");

const projectRoutes = require("./routes/projectRoutes");

const payrollRoutes = require("./routes/payrollRoutes");


// Initialize Express first
const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);

// Middleware must run before routes
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TerraHire API is running."
  });
});

// Register routes only once
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/tasks", taskRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/payroll", payrollRoutes);

// Start server after connecting to MongoDB
async function startServer() {
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      throw new Error(
        "MONGO_URI and JWT_SECRET must be configured in your .env file."
      );
    }

    await mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

    const port = process.env.PORT || process.env.ORGANIZATION_PORT || 5000;

    app.listen(port, () => {
      console.log(`TerraHire API running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
