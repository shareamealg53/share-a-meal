const swaggerJsdoc = require("swagger-jsdoc");

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Share-a-Meal API",
			version: "2.0.0",
			description:
				"Trust-first coordination engine for verified food sharing between SMEs, NGOs, and sponsors.",
			contact: {
				name: "Share-a-Meal Team",
			},
		},
		servers: [
			{
				url: "http://localhost:3000",
				description: "Development server",
			},
			{
				url: "https://your-app-name.onrender.com",
				description: "Production server (update this URL after deployment)",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description: "JWT token obtained from /auth/login",
				},
			},
			schemas: {
				User: {
					type: "object",
					properties: {
						id: { type: "integer" },
						name: { type: "string" },
						email: { type: "string", format: "email" },
						role: {
							type: "string",
							enum: ["sme", "ngo", "sponsor"],
						},
						organization_name: { type: "string" },
						address: { type: "string" },
						phone: { type: "string" },
						is_verified: { type: "boolean" },
						created_at: { type: "string", format: "date-time" },
					},
				},
				Meal: {
					type: "object",
					properties: {
						id: { type: "integer" },
						sme_id: { type: "integer" },
						title: { type: "string" },
						description: { type: "string" },
						quantity: { type: "number" },
						unit: {
							type: "string",
							enum: [
								"kg",
								"servings",
								"packs",
								"loaves",
								"pieces",
								"boxes",
								"trays",
								"bags",
							],
						},
						storage_type: {
							type: "string",
							enum: ["Room Temperature", "Refrigerated"],
						},
						food_type: {
							type: "string",
							enum: ["Bread", "Rice", "Pastries", "Soup", "Beans", "Others"],
						},
						food_status: {
							type: "string",
							enum: ["Fresh", "Moderate", "Spoiled"],
						},
						prepared_at: { type: "string", format: "date-time" },
						expiry_at: { type: "string", format: "date-time", nullable: true },
						status: {
							type: "string",
							enum: [
								"AVAILABLE",
								"CLAIMED",
								"PICKUP_READY",
								"PICKED_UP",
								"COMPLETED",
								"EXPIRED",
								"CANCELLED",
							],
						},
						created_at: { type: "string", format: "date-time" },
						updated_at: { type: "string", format: "date-time" },
					},
				},
				Claim: {
					type: "object",
					properties: {
						id: { type: "integer" },
						meal_id: { type: "integer" },
						ngo_id: { type: "integer" },
						status: {
							type: "string",
							enum: ["ACTIVE", "CANCELLED", "COMPLETED"],
						},
						claimed_at: { type: "string", format: "date-time" },
						picked_up_at: {
							type: "string",
							format: "date-time",
							nullable: true,
						},
						completed_at: {
							type: "string",
							format: "date-time",
							nullable: true,
						},
					},
				},
				Error: {
					type: "object",
					properties: {
						status: { type: "string", example: "error" },
						message: {
							type: "string",
							example: "Invalid authentication token. Please log in again.",
						},
						code: { type: "string", example: "JWT_INVALID" },
						details: { type: "object", nullable: true },
						timestamp: { type: "string", format: "date-time" },
						path: { type: "string", example: "/auth/login" },
						method: { type: "string", example: "POST" },
					},
				},
			},
		},
		tags: [
			{ name: "Auth", description: "Authentication endpoints" },
			{ name: "Meals", description: "Meal creation and listing" },
			{ name: "Claims", description: "NGO claim lifecycle" },
			{ name: "AI", description: "AI expiry and food status endpoints" },
			{ name: "Metrics", description: "Analytics and reporting" },
		],
	},
	apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
