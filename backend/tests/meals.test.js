const request = require("supertest");
const app = require("../src/app");
const jwt = require("jsonwebtoken");

jest.mock("../src/config/db", () => ({
	query: jest.fn(),
}));

const pool = require("../src/config/db");

jest.spyOn(console, "error").mockImplementation(() => {});

describe("Meal Endpoints", () => {
	let smeToken;
	let testMealId = 1;

	beforeAll(() => {
		smeToken = jwt.sign(
			{ id: 1, email: "sme@test.com", role: "sme" },
			process.env.JWT_SECRET,
		);
	});

	beforeEach(() => {
		pool.query.mockClear();

		pool.query.mockImplementation(async (query, params) => {
			// AUTH
			if (query.includes("SELECT id, email, role")) {
				return [[{ id: 1, role: "sme", is_verified: 1 }], undefined];
			}

			// Meal exists by default
			if (query.includes("SELECT restaurant_id FROM meals")) {
				return [[{ restaurant_id: 1 }], undefined];
			}

			if (query.includes("SELECT restaurant_id, status FROM meals")) {
				return [[{ restaurant_id: 1, status: "AVAILABLE" }], undefined];
			}

			if (query.includes("INSERT INTO meals")) {
				return [{ insertId: 1, affectedRows: 1 }, undefined];
			}

			if (query.includes("UPDATE meals")) {
				return [{ affectedRows: 1 }, undefined];
			}

			if (query.includes("DELETE FROM meals")) {
				return [{ affectedRows: 1 }, undefined];
			}

			return [[], undefined];
		});
	});

	// ---------------- CREATE ----------------
	describe("POST /meals", () => {
		test("Should create meal", async () => {
			const res = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					title: "Food",
					description: "Test meal",
					quantity: 10,
					unit: "servings", // ✅ FIXED
					storage_type: "Room Temperature",
					food_type: "Bread",
					food_status: "Fresh",
					prepared_at: "2026-01-01 10:00:00",
				});

			expect(res.status).toBe(201);
		});

		test("Should fail invalid quantity", async () => {
			const res = await request(app)
				.post("/meals")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					title: "Food",
					quantity: -1,
					unit: "servings",
					prepared_at: "2026-01-01 10:00:00",
				});

			expect(res.status).toBe(400);
		});
	});

	// ---------------- PATCH ----------------
	describe("PATCH /meals/:mealId", () => {
		test("Should update meal", async () => {
			const res = await request(app)
				.patch("/meals/1")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({ quantity: 20 });

			expect(res.status).toBe(200);
		});

		test("❌ invalid data returns 400", async () => {
			const res = await request(app)
				.patch("/meals/1")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({ quantity: -10 });

			expect(res.status).toBe(400);
		});

		test("❌ meal not found returns 404", async () => {
			pool.query.mockImplementation(async (query) => {
				if (query.includes("SELECT id, email, role")) {
					return [[{ id: 1, role: "sme", is_verified: 1 }], undefined];
				}
				if (query.includes("SELECT restaurant_id FROM meals")) {
					return [[], undefined]; // ✅ NOT FOUND
				}
				return [[], undefined];
			});

			const res = await request(app)
				.patch("/meals/99999")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({ quantity: 10 });

			expect(res.status).toBe(404);
		});

		test("Should allow SME to mark meal as PICKUP_READY", async () => {
			const res = await request(app)
				.patch("/meals/1")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({ status: "PICKUP_READY" });

			expect(res.status).toBe(200);
			// Optionally: check response message or mock DB call
		});
	});

	// ---------------- DELETE ----------------
	describe("DELETE /meals/:mealId", () => {
		test("Should delete meal", async () => {
			const res = await request(app)
				.delete("/meals/1")
				.set("Authorization", `Bearer ${smeToken}`);

			expect(res.status).toBe(200);
		});

		test("❌ not found returns 404", async () => {
			pool.query.mockImplementation(async (query) => {
				if (query.includes("SELECT id, email, role")) {
					return [[{ id: 1, role: "sme", is_verified: 1 }], undefined];
				}
				if (query.includes("SELECT restaurant_id")) {
					return [[], undefined]; // ✅ NOT FOUND
				}
				return [[], undefined];
			});

			const res = await request(app)
				.delete("/meals/99999")
				.set("Authorization", `Bearer ${smeToken}`);

			expect(res.status).toBe(404);
		});
	});
});
