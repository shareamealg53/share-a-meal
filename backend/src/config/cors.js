const cors = require("cors");

const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:5173",
	"https://shareameal-app.vercel.app",
	process.env.FRONTEND_URL,
].filter(Boolean);

module.exports = () =>
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true); // allow Postman / curl
			// Allow localhost and known origins
			if (allowedOrigins.includes(origin)) {
				callback(null, origin);
			}
			// Allow any Vercel deployment URL (ends with vercel.app)
			else if (origin.endsWith(".vercel.app")) {
				callback(null, origin);
			}
			else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true,
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
		allowedHeaders: "Content-Type, Authorization",
	});
