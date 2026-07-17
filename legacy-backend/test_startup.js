require("dotenv").config();
console.log("=== GrainHero Backend Startup Test ===\n");

// 1. Test MongoDB Connection
const mongoose = require("mongoose");
const cs = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
console.log("1. Testing MongoDB connection...");
console.log("   Connection string:", cs.replace(process.env.MONGO_PASS, "***"));

mongoose.connect(cs, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
        console.log("   ✅ MongoDB connected successfully!\n");
        testRoutes();
    })
    .catch(e => {
        console.error("   ❌ MongoDB FAILED:", e.message, "\n");
        testRoutes();
    });

// 2. Test all route imports
function testRoutes() {
    console.log("2. Testing route imports...");
    const routes = [
        ["./routes/auth", "auth"],
        ["./routes/maintenance", "maintenance"],
        ["./routes/incidents", "incidents"],
        ["./routes/products", "products"],
        ["./routes/orders", "orders"],
        ["./routes/alerts", "alerts"],
        ["./routes/dashboard", "dashboard"],
        ["./routes/quotes", "quotes"],
        ["./routes/webhooks", "webhooks"],
        ["./routes/contact", "contact"],
        ["./routes/payment-verification", "payment-verification"],
        ["./routes/grainBatches", "grainBatches"],
        ["./routes/sensors", "sensors"],
        ["./routes/ai", "ai"],
        ["./routes/aiSpoilage", "aiSpoilage"],
        ["./routes/actuators", "actuators"],
        ["./routes/dualProbeMonitoring", "dualProbeMonitoring"],
        ["./routes/deviceHealth", "deviceHealth"],
        ["./routes/iot", "iot"],
        ["./routes/dataVisualization", "dataVisualization"],
        ["./routes/silos", "silos"],
        ["./routes/insurance", "insurance"],
        ["./routes/buyers", "buyers"],
        ["./routes/environmental", "environmental"],
        ["./routes/tenantManagement", "tenantManagement"],
        ["./routes/planManagement", "planManagement"],
        ["./routes/userManagement", "userManagement"],
        ["./routes/warehouses", "warehouses"],
        ["./routes/subscriptionAnalytics", "subscriptionAnalytics"],
        ["./routes/create-checkout-session", "create-checkout-session"],
    ];

    let failed = 0;
    for (const [path, name] of routes) {
        try {
            require(path);
            console.log(`   ✅ ${name}`);
        } catch (e) {
            console.error(`   ❌ ${name}: ${e.message}`);
            failed++;
        }
    }
    console.log(`\n   Routes: ${routes.length - failed}/${routes.length} loaded successfully\n`);

    // 3. Test service imports
    console.log("3. Testing service imports...");
    const services = [
        ["./services/environmentalDataService", "environmentalDataService"],
        ["./services/firebaseRealtimeService", "firebaseRealtimeService"],
        ["./services/limitWarningService", "limitWarningService"],
    ];

    let sfailed = 0;
    for (const [path, name] of services) {
        try {
            require(path);
            console.log(`   ✅ ${name}`);
        } catch (e) {
            console.error(`   ❌ ${name}: ${e.message}`);
            sfailed++;
        }
    }
    console.log(`\n   Services: ${services.length - sfailed}/${services.length} loaded successfully\n`);

    // 4. Test swagger-jsdoc (upgraded version)
    console.log("4. Testing swagger-jsdoc...");
    try {
        const swaggerJsdoc = require("swagger-jsdoc");
        const opts = {
            definition: {
                openapi: "3.0.0",
                info: { title: "Test", version: "1.0.0" },
            },
            apis: ["./routes/*.js"],
        };
        const spec = swaggerJsdoc(opts);
        console.log("   ✅ swagger-jsdoc loaded and spec generated\n");
    } catch (e) {
        console.error("   ❌ swagger-jsdoc:", e.message, "\n");
    }

    console.log("=== Test Complete ===");
    setTimeout(() => process.exit(0), 2000);
}
