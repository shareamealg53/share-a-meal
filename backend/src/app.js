const express = require("express");
require("dotenv").config({
	path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});
console.log("🔍 App DB_NAME:", process.env.DB_NAME);
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const { rateLimiter, requestTimeout } = require("./middleware/requestGuards");
const {
	errorHandler,
	errorConverter,
	notFound,
} = require("./middleware/errorHandler");

const { dbHealth } = require("./middleware/dbHealth");
const { runAllGuards } = require("./jobs/mealGuards");

// Routes
const authRoutes = require("./routes/authRoutes");
const mealRoutes = require("./routes/mealRoutes");
const claimRoutes = require("./routes/claimRoutes");
const sponsorshipRoutes = require("./routes/sponsorshipRoutes");
const aiRoutes = require("./routes/aiRoutes");
const metricsRoutes = require("./routes/metricsRoutes");
const pool = require("./config/db");
// Initialize Express app
const app = express();

console.log("✅ ShareAMeal Backend Starting...");
console.log(`📝 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔗 API_URL configured`);

/**
 * Trust proxy (Required for correct IP detection on Render/Railway/Nginx)
 */
app.set("trust proxy", 1);

/**
 * Security Headers (Helmet)
 */
app.use(
	helmet({
		contentSecurityPolicy: false, // Disable if frontend handles CSP
		crossOriginEmbedderPolicy: false,
	}),
);

/**
 * CORS (Must come early)
 */
const corsMiddleware = require("./config/cors")();
app.use(corsMiddleware);
app.options("/{*any}", corsMiddleware);
app.use((req, res, next) => {
	if (req.method === "OPTIONS") return res.sendStatus(204);
	next();
});

/**
 * Body parsing
 */
app.use(express.json());
/**
 * Global Security Middleware
 */
app.use(rateLimiter);
app.use(requestTimeout);

/**
 * Swagger Docs (Disabled in Production)
 */
if (process.env.NODE_ENV !== "production") {
	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/**
 * Basic health check
 */
app.get("/", (req, res) => {
	res.json({ message: "Share-a-Meal API is running." });
});
app.get("/test-db", async (req, res) => {
	try {
		const [rows] = await pool.query("SELECT 1+1 AS result");
		res.json({ success: true, data: rows });
	} catch (err) {
		console.error("DB test error:", err);
		res.status(500).json({ error: err.message, code: err.code });
	}
});

/**
 * Optional DB health endpoint (Not every request)
 */
app.get("/health", dbHealth);

/**
 * Application Routes
 */
app.use("/auth", authRoutes);
app.use("/meals", mealRoutes);
app.use("/claims", claimRoutes);
app.use("/sponsorships", sponsorshipRoutes);
app.use("/ai", aiRoutes);
app.use("/metrics", metricsRoutes);

/**
 * Error Handling
 */
app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

/**
 * Background Jobs
 */
if (process.env.NODE_ENV !== "test") {
	setTimeout(runAllGuards, 5000);
	setInterval(runAllGuards, 5 * 60 * 1000);

	const PORT = process.env.PORT || 3000;

	const server = app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});

	// Global server timeout (extra protection)
	server.setTimeout(parseInt(process.env.REQUEST_TIMEOUT_MS || "15000", 10));
}

module.exports = app;
