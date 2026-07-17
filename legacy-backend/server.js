require("dotenv").config();

// Force Google DNS for MongoDB Atlas SRV resolution
// (home routers often can't resolve SRV records)
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
const { Server } = require("socket.io");

const authRoute = require("./routes/auth");
const maintenanceRoute = require("./routes/maintenance");
const incidentsRoute = require("./routes/incidents");
const productsRoute = require("./routes/products");
const ordersRoute = require("./routes/orders");
const alertsRoute = require("./routes/alerts");
const dashboardRouter = require("./routes/dashboard");
const quotesRoute = require("./routes/quotes");
const webhookRoute = require("./routes/webhooks");
const contactRoute = require("./routes/contact");
const paymentVerificationRoute = require("./routes/payment-verification");

// GrainHero integrated routes
const grainBatchesRoute = require("./routes/grainBatches");
const sensorsRoute = require("./routes/sensors");
const aiRoute = require("./routes/ai");
const aiSpoilageRoute = require("./routes/aiSpoilage");
const actuatorsRoute = require("./routes/actuators");
const dualProbeRoute = require("./routes/dualProbeMonitoring");
const deviceHealthRoute = require("./routes/deviceHealth");
const iotRoute = require("./routes/iot");
const dataVisualizationRoute = require("./routes/dataVisualization");
const silosRoute = require("./routes/silos");
const insuranceRoute = require("./routes/insurance");
const buyersRoute = require("./routes/buyers");
const environmentalRoute = require("./routes/environmental");

// Logging & Transparency Module routes
const activityLogsRoute = require("./routes/activityLogs");
const notificationsRoute = require("./routes/notifications");
const loggingRoute = require("./routes/logging");
const paymentsRoute = require("./routes/payments");
const reportsRoute = require("./routes/reports");

// Super Admin routes
const adminManagementRoute = require("./routes/adminManagement");
const planManagementRoute = require("./routes/planManagement");
const superAdminRoute = require("./routes/superAdmin");

// User Management routes
const userManagementRoute = require("./routes/userManagement");

// Admin Settings routes
const adminSettingsRoute = require("./routes/adminSettings");

const Alert = require("./models/Alert");
const environmentalDataService = require("./services/environmentalDataService");
const firebaseRealtimeService = require("./services/firebaseRealtimeService");

const cors = require("cors");

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use("/uploads", express.static("uploads"));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// Use MONGO_URI from env if available, otherwise construct the SRV connection string
const connectionString = process.env.MONGO_URI || `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;

console.log("Attempting to connect to MongoDB...");
console.log(
  "Connection string:",
  connectionString.replace(process.env.MONGO_PASS, "***")
);

mongoose.connect(connectionString, {
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
}).catch((err) => {
  console.error("❌ MongoDB initial connection failed:", err.message || err);
  console.warn("⚠️  Server will continue running — ML endpoints and MQTT still functional.");
  console.warn("⚠️  Features requiring MongoDB (batches, predictions history) will be unavailable.");
});

// Catch unhandled promise rejections globally so the server doesn't crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason?.message || reason);
});

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB connection error:", err.message || err);
});
db.once("open", () => {
  console.log("MongoDB Connection Successfull");

  // Start environmental data collection service
  try {
    environmentalDataService.start();
    console.log("Environmental data service started");
  } catch (error) {
    console.error("Failed to start environmental data service:", error);
  }

  // Start limit warning scheduler
  try {
    const {
      startLimitWarningScheduler,
    } = require("./services/limitWarningService");
    startLimitWarningScheduler();
    console.log("Limit warning scheduler started");
  } catch (error) {
    console.error("Failed to start limit warning scheduler:", error);
  }

  // Start Firebase realtime service
  try {
    firebaseRealtimeService.start(io);
    console.log("Firebase realtime service started");
  } catch (error) {
    console.error("Failed to start Firebase realtime service:", error.message);
  }
});

// Stripe webhook endpoint must use express.raw before express.json
app.use("/webhook", express.raw({ type: "application/json" }), webhookRoute);

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

// ============================================
// REQUEST LOGGING MIDDLEWARE
// ============================================
// This middleware logs all incoming API requests from Flutter app
// It helps debug connection issues and track API usage
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Log request details
  console.log("\n" + "=".repeat(80));
  console.log(`📱 [${timestamp}] ${req.method} ${req.originalUrl || req.url}`);
  console.log(
    `📍 From: ${req.ip || req.connection.remoteAddress || "unknown"}`
  );
  console.log(`🌐 User-Agent: ${req.get("user-agent") || "unknown"}`);

  // Log headers (especially Authorization)
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    const tokenPreview =
      authHeader.length > 30 ? authHeader.substring(0, 30) + "..." : authHeader;
    console.log(`🔑 Authorization: ${tokenPreview}`);
  } else {
    console.log(`🔑 Authorization: ❌ No token provided`);
  }

  // Log request body for POST/PUT/PATCH (but not for large payloads)
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr.length < 500) {
      console.log(`📦 Body: ${bodyStr}`);
    } else {
      console.log(
        `📦 Body: ${bodyStr.substring(0, 200)}... (truncated, ${
          bodyStr.length
        } chars)`
      );
    }
  }

  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log(`🔍 Query: ${JSON.stringify(req.query)}`);
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusEmoji =
      statusCode >= 200 && statusCode < 300
        ? "✅"
        : statusCode >= 400 && statusCode < 500
        ? "⚠️"
        : statusCode >= 500
        ? "❌"
        : "ℹ️";

    console.log(
      `${statusEmoji} Response: ${statusCode} ${
        res.statusMessage || ""
      } (${duration}ms)`
    );

    // Log response body for errors (helpful for debugging)
    if (statusCode >= 400) {
      try {
        const responseData = typeof data === "string" ? JSON.parse(data) : data;
        if (responseData && typeof responseData === "object") {
          const errorMsg =
            responseData.message ||
            responseData.error ||
            responseData.msg ||
            JSON.stringify(responseData);
          console.log(`💬 Error Message: ${errorMsg}`);
        }
      } catch (e) {
        // If parsing fails, just log a preview
        const preview =
          typeof data === "string"
            ? data.substring(0, 200)
            : String(data).substring(0, 200);
        console.log(`💬 Response Preview: ${preview}...`);
      }
    }

    console.log("=".repeat(80) + "\n");

    originalSend.call(this, data);
  };

  // Handle errors
  res.on("finish", () => {
    if (!res.headersSent) {
      const duration = Date.now() - startTime;
      console.log(`⚠️  Request finished without response (${duration}ms)`);
      console.log("=".repeat(80) + "\n");
    }
  });

  next();
});

// ✅ Use this instead
app.use("/auth", authRoute);
app.use("/maintenance", maintenanceRoute);
app.use("/incidents", incidentsRoute);
app.use("/products", productsRoute);
app.use("/orders", ordersRoute);
app.use("/api/alerts", alertsRoute);
app.use("/quotes", quotesRoute);

// GrainHero integrated routes
app.use("/api/grain-batches", grainBatchesRoute);
app.use("/api/sensors", sensorsRoute);
app.use("/api/ai", aiRoute);
app.use("/api/ai-spoilage", aiSpoilageRoute);
app.use("/api/actuators", actuatorsRoute);
app.use("/api/dual-probe", dualProbeRoute);
app.use("/api/device-health", deviceHealthRoute);
app.use("/api/iot", iotRoute);
app.use("/api/data-viz", dataVisualizationRoute);
app.use("/api/silos", silosRoute);
app.use("/api/insurance", insuranceRoute);
app.use("/api/buyers", buyersRoute);
app.use("/api/environmental", environmentalRoute);

// Logging & Transparency Module
app.use("/api/activity-logs", activityLogsRoute);
app.use("/api/notifications", notificationsRoute);
app.use("/api/logging", loggingRoute);
app.use("/api/payments", paymentsRoute);
app.use("/api/reports", reportsRoute);

// Admin Management routes
app.use("/api/admin-management", adminManagementRoute);
app.use("/api/plan-management", planManagementRoute);
app.use("/api/super-admin", superAdminRoute);

// Subscription Analytics routes
const subscriptionAnalyticsRoute = require("./routes/subscriptionAnalytics");
app.use("/api/subscription-analytics", subscriptionAnalyticsRoute);

// User Management routes
app.use("/api/user-management", userManagementRoute);

// Admin Settings routes
app.use("/api/customer", adminSettingsRoute);

// Warehouse Management routes
const warehousesRoute = require("./routes/warehouses");
app.use("/api/warehouses", warehousesRoute);

// Contact routes
app.use("/api/contact", contactRoute);

// Payment verification routes
app.use("/api/payment-verification", paymentVerificationRoute);

// Stripe checkout session routes
const createCheckoutSessionRoute = require("./routes/create-checkout-session");
app.use("/api/create-checkout-session", createCheckoutSessionRoute);

app.use("/", dashboardRouter);

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "GrainHero Backend API",
      version: "1.0.0",
      description: "API documentation for GrainHero Backend",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/status", (req, res) => {
  res.status(200).json({
    status: "Up",
    frontend: process.env.FRONT_END_URL,
  });
});

// Helper: get filtered alerts for a user by role
async function getFilteredAlerts(role, userId) {
  // For grain management, return all alerts for now
  // TODO: Implement admin-based filtering for grain alerts
  const alerts = await Alert.find();
  return alerts;
}

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = require('url').parse(request.url).pathname;

  if (pathname.startsWith('/alert')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // Let other handlers (like Socket.IO) handle it, or destroy if unwanted.
    // Socket.IO attaches its own listeners, so we shouldn't destroy blindly.
    // But since noServer: true removes the auto-listener, we are good.
  }
});

wss.on("connection", async function connection(ws, req) {
  ws.on("error", (err) => {
    console.warn("WS client error:", err && (err.code || err.message));
  });
  // Parse the URL to get role and userId
  const url = req.url;
  const match = url.match(/^\/alerts\/(admin|manager|assistant)\/(\w+)$/);
  if (!match) {
    // console.warn(`WS connection with invalid path: ${url}`);
    ws.close();
    return;
  }
  const role = match[1];
  const userId = match[2];

  // Send initial alerts
  const sendAlerts = async () => {
    const filteredAlerts = await getFilteredAlerts(role, userId);
    ws.send(JSON.stringify(filteredAlerts));
  };
  await sendAlerts();

  // Listen for new alerts (using Mongoose change streams)
  const alertChangeStream = Alert.watch();
  alertChangeStream.on("change", async (change) => {
    if (
      change.operationType === "insert" ||
      change.operationType === "update" ||
      change.operationType === "replace" ||
      change.operationType === "delete"
    ) {
      await sendAlerts();
    }
  });

  ws.on("close", () => {
    alertChangeStream.close();
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("\n" + "=".repeat(80));
  console.log(`🚀 GrainHero Backend Server is running on port ${PORT}`);
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/auth/*`);
  console.log(`🌐 API endpoints: http://localhost:${PORT}/api/*`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`💚 Health check: http://localhost:${PORT}/status`);
  console.log("=".repeat(80) + "\n");
  console.log("📱 Ready to receive requests from Flutter app...\n");
});
