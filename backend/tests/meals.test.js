const request = require("supertest");
const app = require("../src/app");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Mock the database pool
jest.mock("../src/config/db", () => ({
	query: jest.fn(),
}));

const pool = require("../src/config/db");

describe("Meal Endpoints", () => {
	let smeToken;
	let smeUserId;
	let ngoToken;
	let ngoUserId;
	let adminToken;
	let testMealId;
	beforeAll(async () => {
		// Generate tokens directly without needing actual registration
		smeUserId = 1;
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
	});

	beforeEach(() => {
		// Reset specific mock calls but keep the mock function active
		pool.query.mockClear();
		
		// Default mock: when auth middleware queries for user, return the authenticated user
		pool.query.mockImplementation(async (query, params) => {
			if (query.includes("SELECT id, email, role, is_verified FROM users")) {
				const userId = params[0];
				if (userId === 1) {
					// SME user
					return [
						[{
							id: 1,
							email: "sme@test.com",
							role: "sme",
							is_verified: 1,
						}],
						undefined,
					];
				} else if (userId === 2) {
					// NGO user
					return [
						[{
							id: 2,
							email: "ngo@test.com",
							role: "ngo",
							is_verified: 1,
						}],
						undefined,
					];
				} else if (userId === 3) {
					// Admin user
					return [
						[{
							id: 3,
							email: "admin@test.com",
							role: "admin",
							is_verified: 1,
						}],
						undefined,
					];
				}
			}
			// Default response for other queries
			return [[], undefined];
		});
	});

	describe("POST /meals", () => {
		beforeEach(() => {
		// Mock database INSERT for creating meals
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					} else if (userId === 2) {
						return [[{ id: 2, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
					}
				} else if (query.includes("INSERT INTO meals")) {
					return [{ insertId: Math.floor(Math.random() * 1000) + 1, affectedRows: 1 }, undefined];
				}
				return [[], undefined];
			});
		});

		test("Should create meal with valid data", async () => {
			const response = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					title: "Fresh Bread Loaves",
					description: "Whole wheat bread",
					quantity: 20,
					unit: "loaves",
					storage_type: "Room Temperature",
					food_type: "Bread",
					food_status: "Fresh",
					prepared_at: "2026-02-22 10:00:00",
				});

			expect(response.status).toBe(201);
			expect(response.body).toHaveProperty("meal");
			expect(response.body.meal).toHaveProperty("id");
			testMealId = response.body.meal.id; 
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).post("/meals").send({
				title: "Test Meal",
				quantity: 10,
				unit: "servings",
				prepared_at: "2026-02-22 10:00:00",
			});

			expect(response.status).toBe(401);
		});

		test("Should fail with missing required fields", async () => {
			const response = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					title: "Test Meal",
					
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("VALIDATION_ERROR");
		});

		test("Should fail with invalid quantity", async () => {
			const response = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					title: "Test Meal",
					quantity: -5, 
					unit: "servings",
					prepared_at: "2026-02-22 10:00:00",
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("VALIDATION_ERROR");
		});

		test("Should fail when NGO tries to create meal", async () => {
			const response = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${ngoToken}`)
				.send({
					title: "Test Meal",
					quantity: 10,
					unit: "servings",
					prepared_at: "2026-02-22 10:00:00",
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});
	});

	describe("GET /meals", () => {
		beforeEach(() => {
			// Mock SELECT for getting all meals
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					}
				} else {
					// Return meals for GET /meals
					return [
						[{
							id: 1,
							title: "Test Meal",
							description: "Test",
							quantity: 10,
							food_status: "AVAILABLE",
							restaurant_name: "Test SME",
						}],
						undefined,
					];
				}
				return [[], undefined];
			});
		});

		test("Should get all available meals", async () => {
			const response = await request(app).get("/meals");

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("meals");
			expect(Array.isArray(response.body.meals)).toBe(true);
		});

		test("Should work without authentication", async () => {
			const response = await request(app).get("/meals");

			expect(response.status).toBe(200);
		});
	});

	describe("GET /meals/:mealId", () => {
		beforeEach(() => {
			// Mock SELECT for getting specific meal
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					}
				} else if (query.includes("SELECT") && query.includes("FROM meals m")) {
					// Check if it's looking for an invalid meal ID
					if (params[0] === 99999) {
						return [[], undefined]; // No meal found
					}
					return [
						[{
							id: testMealId || 1,
							title: "Test Meal",
							description: "Test",
							quantity: 10,
							food_status: "AVAILABLE",
							restaurant_name: "Test SME",
						}],
						undefined,
					];
				}
				return [[], undefined];
			});
		});

		test("Should get specific meal by ID", async () => {
			const response = await request(app).get(`/meals/${testMealId || 1}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("meal");
		});

		test("Should fail with invalid meal ID", async () => {
			pool.query.mockResolvedValueOnce([[], undefined]);

			const response = await request(app).get("/meals/99999");

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with non-numeric meal ID", async () => {
			const response = await request(app).get("/meals/invalid");

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});
	});

	describe("GET /meals/status/:status", () => {
		beforeEach(() => {
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					}
				} else {
					return [
						[{
							id: 1,
							food_status: "AVAILABLE",
						}],
						undefined,
					];
				}
				return [[], undefined];
			});
		});

		test("Should get meals by AVAILABLE status", async () => {
			const response = await request(app).get("/meals/status/AVAILABLE");

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("meals");
			expect(Array.isArray(response.body.meals)).toBe(true);
		});

		test("Should fail with invalid status", async () => {
			const response = await request(app).get("/meals/status/INVALID_STATUS");

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});
	});

	describe("GET /meals/my/list", () => {
		beforeEach(() => {
			// Mock database queries for my/list endpoint
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					} else if (userId === 2) {
						return [[{ id: 2, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
					}
				} else {
					return [
						[{
							id: 1,
							title: "My Test Meal",
							description: "Test",
							quantity: 10,
							food_status: "AVAILABLE",
							restaurant_name: "My SME",
						}],
						undefined,
					];
				}
				return [[], undefined];
			});
		});

		test("Should get SME's own meals", async () => {
			const response = await request(app)
				.get("/meals/my/list")
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("meals");
			expect(Array.isArray(response.body.meals)).toBe(true);
			
			expect(response.body.meals.length).toBeGreaterThan(0);
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).get("/meals/my/list");

			expect(response.status).toBe(401);
		});

		test("Should forbid NGO access to SME meal list", async () => {
			const response = await request(app)
				.get("/meals/my/list")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});
	});

	describe("PATCH /meals/:mealId", () => {
		beforeEach(() => {
			// Mock SELECT for getting meal to check ownership, and auth queries
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					} else if (userId === 2) {
						return [[{ id: 2, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
					}
				} else if (query.includes("SELECT restaurant_id FROM meals")) {
					// Return empty for invalid meal IDs
					if (Number(params[0]) === 99999) {
						return [[], undefined];
					}
					return [
						[{ restaurant_id: 1}],
						undefined,
					];
				} else if (query.includes("UPDATE meals")) {
					return [{ affectedRows: 1 }, undefined];
				}
				return [[], undefined];
			});
		});

		test("Should update own meal", async () => {
			const response = await request(app)
				.patch(`/meals/${testMealId}`)
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					quantity: 15,
					description: "Updated description",
				});

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("updated");
		});

		test("Should fail to update another user's meal", async () => {
			// Mock meal owned by different user
			pool.query.mockResolvedValueOnce([
				[
					{
						restaurant_id: 999, // Different user
					},
				],
				undefined,
			]);

			const response = await request(app)
				.patch(`/meals/${testMealId}`)
				.set("Authorization", `Bearer ${ngoToken}`)
				.send({
					quantity: 15,
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).patch(`/meals/${testMealId}`).send({
				quantity: 15,
			});

			expect(response.status).toBe(401);
		});

		test("Should fail with invalid meal ID", async () => {
			const response = await request(app)
				.patch("/meals/99999")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					quantity: 15,
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});
	});

	describe("DELETE /meals/:mealId", () => {
		const deletableMealId = 99;
		let deleteOwnerId;

		beforeEach(() => {
			deleteOwnerId = 1;
			// Mock SELECT for getting meal to check ownership, and auth queries
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sme@test.com", role: "sme", is_verified: 1 }], undefined];
					} else if (userId === 2) {
						return [[{ id: 2, email: "ngo@test.com", role: "ngo", is_verified: 1 }], undefined];
					}
				} else if (query.includes("SELECT restaurant_id, status FROM meals")) {
					if (Number(params[0]) === 99999) {
						return [[], undefined];
					}
					return [
						[{ restaurant_id: deleteOwnerId, status: "AVAILABLE" }],
						undefined,
					];
				} else if (query.includes("DELETE FROM meals")) {
					return [{ affectedRows: 1 }, undefined];
				}
				return [[], undefined];
			});
		});

		test("Should delete own meal", async () => {
			const response = await request(app)
				.delete(`/meals/${deletableMealId}`)
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("deleted");
		});

		test("Should fail to delete another user's meal", async () => {
			deleteOwnerId = 999;

			const response = await request(app)
				.delete(`/meals/${testMealId}`)
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).delete(`/meals/${testMealId}`);

			expect(response.status).toBe(401);
		});

		test("Should fail with invalid meal ID", async () => {
			const response = await request(app)
				.delete("/meals/99999")
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});
	});
});
