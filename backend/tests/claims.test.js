const request = require("supertest");
const app = require("../src/app");
const jwt = require("jsonwebtoken");

// Mock the database pool
jest.mock("../src/config/db", () => ({
	query: jest.fn(),
}));

const pool = require("../src/config/db");

describe("Claim Endpoints", () => {
	let smeToken;
	let ngoToken;
	let adminToken;
	let testMealId;

	beforeAll(async () => {
		// Generate tokens directly without needing actual registration/authorization
		const smeUserId = 1;
		const ngoUserId = 2;
		const adminUserId = 3;

		smeToken = jwt.sign(
			{ id: smeUserId, email: "sme@test.com", role: "sme" },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		);

		ngoToken = jwt.sign(
			{ id: ngoUserId, email: "ngo@test.com", role: "ngo" },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		);

		adminToken = jwt.sign(
			{ id: adminUserId, email: "admin@test.com", role: "admin" },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		);

		// Setup mock implementation for database queries
		pool.query.mockImplementation(async (query, params) => {
			// Handle user authentication queries
			if (query.includes("SELECT id, email, role, is_verified FROM users")) {
				const userId = params[0];
				if (userId === smeUserId) {
					return [[{ id: smeUserId, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
				} else if (userId === ngoUserId) {
					return [[{ id: ngoUserId, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
				} else if (userId === adminUserId) {
					return [[{ id: adminUserId, email: "admin@test.com", role: "admin", is_verified: 1 }], undefined];
				}
			}
			// Handle meal queries
			else if (query.includes("SELECT") && query.includes("FROM meals")) {
				if (params[0] === 99999) {
					return [[], undefined];
				}
				// Return meal data
				return [[{
					id: params[0] || 100,
					title: "Test Meal for Claims",
					quantity: 10,
					unit: "servings",
					food_status: "AVAILABLE",
					created_by: smeUserId,
				}], undefined];
			}
			// Handle claim INSERT
			else if (query.includes("INSERT INTO claims")) {
				return [{ insertId: Math.floor(Math.random() * 10000) + 1, affectedRows: 1 }, undefined];
			}
			// Handle claim SELECT queries
			else if (query.includes("SELECT") && query.includes("claims")) {
				return [[{
					id: 1,
					meal_id: 100,
					ngo_id: ngoUserId,
					status: "CLAIMED",
				}], undefined];
			}
			// Default response
			return [[], undefined];
		});

		// Set deterministic test meal ID
		testMealId = 100;
	});

	beforeEach(() => {
		// Reset mock calls between tests but maintain mock function
		pool.query.mockClear();
		
		// Re-apply default implementation
		pool.query.mockImplementation(async (query, params) => {
			// Handle user authentication queries
			if (query.includes("SELECT id, email, role, is_verified FROM users")) {
				const userId = params[0];
				if (userId === 1) {
					return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
				} else if (userId === 2) {
					return [[{ id: 2, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
				} else if (userId === 3) {
					return [[{ id: 3, email: "admin@test.com", role: "admin", is_verified: 1 }], undefined];
				}
			}
			// Handle meal queries
			else if (query.includes("SELECT") && query.includes("FROM meals")) {
				if (params[0] === 99999) {
					return [[], undefined];
				}
				return [[{
					id: params[0] || 100,
					title: "Test Meal for Claims",
					quantity: 10,
					food_status: "AVAILABLE",
					created_by: 1,
				}], undefined];
			}
			// Handle claim INSERT
			else if (query.includes("INSERT INTO claims")) {
				return [{ insertId: Math.floor(Math.random() * 10000) + 1, affectedRows: 1 }, undefined];
			}
			// Handle claim SELECT queries
			else if (query.includes("SELECT") && query.includes("claims")) {
				return [[{
					id: 1,
					meal_id: 100,
					ngo_id: 2,
					status: "CLAIMED",
				}], undefined];
			}
			return [[], undefined];
		});
	});

	describe("POST /claims/meal/:mealId", () => {
		test("Should claim meal as NGO", async () => {
			const response = await request(app)
				.post(`/claims/meal/${testMealId}`)
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(201);
			expect(response.body).toHaveProperty("claimId");
			expect(response.body).toHaveProperty("mealId");
		});

		test("Should fail to claim without authentication", async () => {
			const response = await request(app).post(`/claims/meal/${testMealId}`);

			expect(response.status).toBe(401);
		});

		test("Should fail when SME tries to claim meal", async () => {
			// Use deterministic meal ID for this test
			const anotherMealId = 101;

			const response = await request(app)
				.post(`/claims/meal/${anotherMealId}`)
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail to claim already claimed meal", async () => {
			const response = await request(app)
				.post(`/claims/meal/${testMealId}`)
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_STATE");
		});

		test("Should fail with invalid meal ID", async () => {
			const response = await request(app)
				.post("/claims/meal/99999")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with non-numeric meal ID", async () => {
			const response = await request(app)
				.post("/claims/meal/invalid")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});
	});

	describe("GET /claims/my", () => {
		test("Should get NGO's own claims", async () => {
			const response = await request(app)
				.get("/claims/my")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("claims");
			expect(Array.isArray(response.body.claims)).toBe(true);
			expect(response.body.claims.length).toBeGreaterThan(0);
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).get("/claims/my");

			expect(response.status).toBe(401);
		});

		test("Should forbid SME access to NGO claims", async () => {
			const response = await request(app)
				.get("/claims/my")
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});
	});

	describe("PATCH /claims/meal/:mealId/ready", () => {
		test("Should mark meal as pickup ready by SME", async () => {
			const response = await request(app)
				.patch(`/claims/meal/${testMealId}/ready`)
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("ready");
		});

		test("Should fail when NGO tries to mark ready", async () => {
			const response = await request(app)
				.patch(`/claims/meal/${testMealId}/ready`)
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).patch(
				`/claims/meal/${testMealId}/ready`,
			);

			expect(response.status).toBe(401);
		});

		test("Should fail with invalid meal ID", async () => {
			const response = await request(app)
				.patch("/claims/meal/99999/ready")
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail to mark already ready meal", async () => {
			const response = await request(app)
				.patch(`/claims/meal/${testMealId}/ready`)
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_STATE");
		});
	});

	describe("PATCH /claims/:claimId/pickup", () => {
		let pickupClaimId;

		beforeAll(async () => {
			// Use deterministic meal and claim IDs for this test block
			const pickupMealId = 102;
			pickupClaimId = 201;

			// Mock the database to return appropriate data for these IDs
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					} else if (userId === 2) {
						return [[{ id: 2, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
					}
				}
				// Handle meal queries
				else if (query.includes("SELECT") && query.includes("FROM meals")) {
					if (params[0] === pickupMealId) {
						return [[{
							id: pickupMealId,
							title: "Pickup Test Meal",
							quantity: 5,
							food_status: "AVAILABLE",
							created_by: 1,
						}], undefined];
					}
				}
				// Handle claim queries and inserts
				else if (query.includes("INSERT INTO claims")) {
					return [{ insertId: pickupClaimId, affectedRows: 1 }, undefined];
				} else if (query.includes("SELECT") && query.includes("claims")) {
					return [[{
						id: pickupClaimId,
						meal_id: pickupMealId,
						ngo_id: 2,
						status: "CLAIMED",
					}], undefined];
				}
				return [[], undefined];
			});
		});

		test("Should confirm pickup by NGO", async () => {
			const response = await request(app)
				.patch(`/claims/${pickupClaimId}/pickup`)
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("Pickup");
		});

		test("Should fail when SME tries to confirm pickup", async () => {
			const response = await request(app)
				.patch(`/claims/${pickupClaimId}/pickup`)
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).patch(
				`/claims/${pickupClaimId}/pickup`,
			);

			expect(response.status).toBe(401);
		});

		test("Should fail with invalid claim ID", async () => {
			const response = await request(app)
				.patch("/claims/99999/pickup")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with non-numeric claim ID", async () => {
			const response = await request(app)
				.patch("/claims/invalid/pickup")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});
	});

	describe("PATCH /claims/:claimId/complete", () => {
		let completeClaimId;

		beforeAll(async () => {
			// Use deterministic meal and claim IDs for this test block
			const completeMealId = 103;
			completeClaimId = 202;

			// Mock the database to return appropriate data for these IDs
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					} else if (userId === 2) {
						return [[{ id: 2, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
					}
				}
				// Handle meal queries
				else if (query.includes("SELECT") && query.includes("FROM meals")) {
					if (params[0] === completeMealId) {
						return [[{
							id: completeMealId,
							title: "Completion Flow Meal",
							quantity: 5,
							food_status: "AVAILABLE",
							created_by: 1,
						}], undefined];
					}
				}
				// Handle claim queries and inserts
				else if (query.includes("INSERT INTO claims")) {
					return [{ insertId: completeClaimId, affectedRows: 1 }, undefined];
				} else if (query.includes("SELECT") && query.includes("claims")) {
					return [[{
						id: completeClaimId,
						meal_id: completeMealId,
						ngo_id: 2,
						status: "CLAIMED",
					}], undefined];
				}
				return [[], undefined];
			});
		});

		test("Should confirm completion by NGO", async () => {
			const response = await request(app)
				.patch(`/claims/${completeClaimId}/complete`)
				.set("Authorization", `Bearer ${ngoToken}`)
				.send({
					beneficiaries_count: 50,
				});

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("completion");
		});

		test("Should fail when SME tries to complete", async () => {
			const response = await request(app)
				.patch(`/claims/${completeClaimId}/complete`)
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					beneficiaries_count: 50,
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app)
				.patch(`/claims/${completeClaimId}/complete`)
				.send({
					beneficiaries_count: 50,
				});

			expect(response.status).toBe(401);
		});

		test("Should fail with invalid claim ID", async () => {
			const response = await request(app)
				.patch("/claims/99999/complete")
				.set("Authorization", `Bearer ${ngoToken}`)
				.send({
					beneficiaries_count: 50,
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with invalid beneficiaries count", async () => {
			const response = await request(app)
				.patch(`/claims/${completeClaimId}/complete`)
				.set("Authorization", `Bearer ${ngoToken}`)
				.send({
					beneficiaries_count: -10, 
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_FORMAT");
		});
	});

	describe("PATCH /claims/:claimId/cancel", () => {
		let cancelableMealId;
		let cancelableClaimId;

		beforeAll(async () => {
			
			const mealResponse = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					title: "Cancelable Meal",
					quantity: 5,
					unit: "servings",
					prepared_at: "2026-02-22 10:00:00",
				});
			cancelableMealId = mealResponse.body.meal.id;

			const claimResponse = await request(app)
				.post(`/claims/meal/${cancelableMealId}`)
				.set("Authorization", `Bearer ${ngoToken}`);
			cancelableClaimId = claimResponse.body.claimId;
		});

		test("Should cancel claim by NGO", async () => {
			const response = await request(app)
				.patch(`/claims/${cancelableClaimId}/cancel`)
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("cancelled");
		});

		test("Should fail when SME tries to cancel", async () => {
			
			const mealResponse = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					title: "Another Cancelable Meal",
					quantity: 5,
					unit: "servings",
					prepared_at: "2026-02-22 10:00:00",
				});

			const claimResponse = await request(app)
				.post(`/claims/meal/${mealResponse.body.meal.id}`)
				.set("Authorization", `Bearer ${ngoToken}`);

			const response = await request(app)
				.patch(`/claims/${claimResponse.body.claimId}/cancel`)
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).patch(
				`/claims/${cancelableClaimId}/cancel`,
			);

			expect(response.status).toBe(401);
		});

		test("Should fail with invalid claim ID", async () => {
			const response = await request(app)
				.patch("/claims/99999/cancel")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});
	});
});
