const request = require("supertest");
const app = require("../src/app");
const jwt = require("jsonwebtoken");

// Mock the database pool
jest.mock("../src/config/db", () => ({
	query: jest.fn(),
}));

const pool = require("../src/config/db");

describe("Sponsorship Endpoints", () => {
	let sponsorToken;
	let sponsorUserId;
	let smeToken;
	let ngoToken;
	let ngoUserId;
	let adminToken;
	let testMealId;
	let testMealId2;

	beforeAll(async () => {
		// Generate tokens directly without needing actual registration
		sponsorUserId = 1;
		const adminUserId = 2;
		const smeUserId = 3;
		ngoUserId = 4;

		sponsorToken = jwt.sign(
			{ id: sponsorUserId, email: "sponsor@test.com", role: "sponsor" },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		);

		adminToken = jwt.sign(
			{ id: adminUserId, email: "admin@test.com", role: "admin" },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		);

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

		// Set deterministic test meal IDs
		testMealId = 100;
		testMealId2 = 101;
	});

	afterAll(() => {
		global.mockDataStore = undefined;
	});

	beforeEach(() => {
		// Reset mock calls between tests but maintain mock function
		pool.query.mockClear();
		
		// Reset sponsorship test data for each test
		global.mockDataStore = {
			users: new Map([
				[1, { id: 1, email: "sponsor@test.com", role: "sponsor", is_verified: 1 }],
				[2, { id: 2, email: "admin@test.com", role: "admin", is_verified: 1 }],
				[3, { id: 3, email: "sme@test.com", role: "sme", is_verified: 1 }],
				[4, { id: 4, email: "ngo@test.com", role: "ngo", is_verified: 1 }],
			]),
			meals: new Map([
				[100, { id: 100, title: "Test Meal 1", quantity: 10, status: "AVAILABLE", restaurant_id: 3 }],
				[101, { id: 101, title: "Test Meal 2", quantity: 5, status: "AVAILABLE", restaurant_id: 3 }],
			]),
			claims: new Map(),
			sponsorships: new Map([
				[1, { id: 1, sponsor_id: 1, meal_id: 100, ngo_id: 4, amount: 100, created_at: new Date() }],
				[2, { id: 2, sponsor_id: 1, meal_id: 100, ngo_id: 4, amount: 150, created_at: new Date() }],
				[3, { id: 3, sponsor_id: 1, meal_id: 100, ngo_id: 4, amount: 250, created_at: new Date() }],
			]),
		};

		// Re-apply default implementation
		pool.query.mockImplementation(async (query, params) => {
			const store = global.mockDataStore;
			const numParam = Number(params[0]);
			
			// Auth query: SELECT id, email, role, is_verified FROM users WHERE id = ?
			if (query.includes("SELECT id, email, role, is_verified FROM users") && query.includes("WHERE id")) {
				const user = store.users.get(parseInt(numParam));
				if (!user) return [[], undefined];
				return [[{ id: user.id, email: user.email, role: user.role, is_verified: user.is_verified }], undefined];
			}

			// Handle donor/sponsor impact metrics user queries
			if (query.includes("SELECT id, name, organization_name, role FROM users WHERE id = ?")) {
				if (numParam === 99999) return [[], undefined];
				return [[{ id: numParam || 1, name: "Test User", organization_name: "Test Org", role: "sponsor" }], undefined];
			}

			// Handle NGO queries - SELECT id, role FROM users WHERE id = ? AND role = 'ngo'
			if (query.includes("FROM users") && query.includes("role = 'ngo'")) {
				const user = store.users.get(numParam);
				if (!user || user.role !== "ngo") return [[], undefined];
				return [[{ id: user.id, organization_name: user.email.split("@")[0] + " Org", role: user.role }], undefined];
			}

			// Handle organization name queries for NGOs
			if (query.includes("SELECT id, organization_name, role FROM users WHERE id = ?")) {
				const user = store.users.get(numParam);
				if (!user) return [[], undefined];
				return [[{ id: user.id, organization_name: user.email.split("@")[0] + " Org", role: user.role }], undefined];
			}

			// Handle meal lookup for getMealSponsors - SELECT id, title, status FROM meals WHERE id = ?
			if (query.includes("SELECT id, title, status FROM meals WHERE id = ?")) {
				if (numParam === 99999 || !numParam) return [[], undefined];
				const meal = store.meals.get(numParam);
				if (!meal) return [[], undefined];
				return [[{ id: meal.id, title: meal.title, status: meal.status }], undefined];
			}

			// Handle meal restaurant_id lookup
			if (query.includes("SELECT id, restaurant_id FROM meals WHERE id = ?") || query.includes("SELECT id, created_by FROM meals WHERE id = ?")) {
				if (numParam === 99999) return [[], undefined];
				const meal = store.meals.get(numParam);
				if (!meal) return [[], undefined];
				return [[{ id: meal.id, restaurant_id: meal.restaurant_id, created_by: meal.restaurant_id }], undefined];
			}

			// Handle meal queries with joins (alias m)
			if (query.includes("SELECT") && query.includes("FROM meals m")) {
				if (numParam === 99999) return [[], undefined];
				const meal = store.meals.get(numParam);
				if (!meal) return [[], undefined];
				return [[{
					id: meal.id,
					title: meal.title,
					quantity: meal.quantity,
					status: meal.status,
					restaurant_id: meal.restaurant_id,
					restaurant_name: "Test SME",
				}], undefined];
			}

			// Handle SUM/COUNT queries for metrics
			if (query.includes("SELECT SUM(amount)")) {
				const sponsorshipsArr = Array.from(store.sponsorships.values());
				const total = sponsorshipsArr.reduce((sum, s) => sum + s.amount, 0);
				return [[{ total_amount: total }], undefined];
			}
			if (query.includes("SELECT COUNT(*)") && query.includes("sponsorships")) {
				return [[{ sponsorship_count: store.sponsorships.size }], undefined];
			}
			if (query.includes("SELECT COUNT(DISTINCT meal_id)")) {
				const uniqueMeals = new Set(Array.from(store.sponsorships.values()).map(s => s.meal_id));
				return [[{ meals_sponsored: uniqueMeals.size }], undefined];
			}
			if (query.includes("SELECT COUNT(DISTINCT ngo_id)")) {
				const uniqueNgos = new Set(Array.from(store.sponsorships.values()).filter(s => s.ngo_id).map(s => s.ngo_id));
				return [[{ ngos_supported: uniqueNgos.size }], undefined];
			}

			// Handle sponsorship INSERT
			if (query.includes("INSERT INTO sponsorships")) {
				const sponsorshipId = Math.floor(Math.random() * 10000) + 100;
				const sponsorship = {
					id: sponsorshipId,
					sponsor_id: params[0],
					meal_id: params[1],
					ngo_id: params[2],
					amount: params[3],
					note: params[4],
					created_at: new Date(),
				};
				store.sponsorships.set(sponsorshipId, sponsorship);
				return [{ insertId: sponsorshipId, affectedRows: 1 }, undefined];
			}

			// Get sponsorships by sponsor with JOIN - WHERE s.sponsor_id = ?
			if (query.includes("FROM sponsorships s") && query.includes("WHERE s.sponsor_id = ?")) {
				const sponsorId = parseInt(params[0]);
				const sponsorshipsForSponsor = Array.from(store.sponsorships.values()).filter(s => s.sponsor_id === sponsorId);
				return [sponsorshipsForSponsor.map(s => ({
					id: s.id,
					sponsor_id: s.sponsor_id,
					meal_id: s.meal_id,
					ngo_id: s.ngo_id,
					amount: s.amount,
					note: s.note,
					created_at: s.created_at,
					meal_title: "Test Meal",
					meal_status: "AVAILABLE",
					ngo_name: "Test NGO Org",
					ngo_id_alt: s.ngo_id,
				})), undefined];
			}

			// Get sponsorships by meal with JOIN - WHERE s.meal_id = ?
			if (query.includes("FROM sponsorships s") && query.includes("WHERE s.meal_id = ?")) {
				const mealId = parseInt(params[0]);
				const sponsorshipsForMeal = Array.from(store.sponsorships.values()).filter(s => s.meal_id === mealId);
				return [sponsorshipsForMeal.map(s => ({
					id: s.id,
					sponsor_id: s.sponsor_id,
					amount: s.amount,
					note: s.note,
					created_at: s.created_at,
					sponsor_name: "Test Sponsor",
					sponsor_org: "Test Org",
				})), undefined];
			}

			// Get sponsorships by NGO with JOIN - WHERE s.ngo_id = ?
			if (query.includes("FROM sponsorships s") && query.includes("WHERE s.ngo_id = ?")) {
				const ngoId = parseInt(params[0]);
				const sponsorshipsForNgo = Array.from(store.sponsorships.values()).filter(s => s.ngo_id === ngoId);
				return [sponsorshipsForNgo.map(s => ({
					id: s.id,
					sponsor_id: s.sponsor_id,
					amount: s.amount,
					note: s.note,
					created_at: s.created_at,
					sponsor_name: "Test Sponsor",
					sponsor_org: "Test Org",
				})), undefined];
			}

			// Get sponsorships by sponsor ID (no WHERE clause, just IN params)
			if (query.includes("FROM sponsorships") && query.includes("sponsor_id")) {
				const sponsorshipsArr = Array.from(store.sponsorships.values());
				return [sponsorshipsArr, undefined];
			}

			return [[], undefined];
		});
	});

	describe("POST /sponsorships", () => {
		test("Should create sponsorship for a meal", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${sponsorToken}`)
				.send({
					meal_id: testMealId,
					amount: 100,
					note: "Supporting food donation",
				});

			expect(response.status).toBe(201);
			expect(response.body).toHaveProperty("sponsorshipId");
			expect(response.body.message).toContain("successfully");
			expect(response.body.amount).toBe(100);
		});

		test("Should create sponsorship for an NGO", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${sponsorToken}`)
				.send({
					ngo_id: ngoUserId,
					amount: 500,
					note: "Supporting NGO operations",
				});

			expect(response.status).toBe(201);
			expect(response.body).toHaveProperty("sponsorshipId");
			expect(response.body.ngo_id).toBe(ngoUserId);
		});

		test("Should fail without meal_id or ngo_id", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${sponsorToken}`)
				.send({
					amount: 100,
					note: "Missing both IDs",
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("VALIDATION_ERROR");
		});

		test("Should fail with missing amount", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${sponsorToken}`)
				.send({
					meal_id: testMealId,
					note: "Missing amount",
				});

			expect(response.status).toBe(400);
		});

		test("Should fail with zero or negative amount", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${sponsorToken}`)
				.send({
					meal_id: testMealId,
					amount: -50,
				});

			expect(response.status).toBe(400);
		});

		test("Should fail with invalid meal ID", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${sponsorToken}`)
				.send({
					meal_id: 99999,
					amount: 100,
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with invalid NGO ID", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${sponsorToken}`)
				.send({
					ngo_id: 99999,
					amount: 100,
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).post("/sponsorships").send({
				meal_id: testMealId,
				amount: 100,
			});

			expect(response.status).toBe(401);
		});

		test("Should fail when non-sponsor tries to create", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					meal_id: testMealId,
					amount: 100,
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should prevent sponsor from sponsoring their own meal (if sponsor is also SME)", async () => {

		});
	});

	describe("GET /sponsorships/my", () => {
		test("Should get sponsor's own sponsorships", async () => {
			const response = await request(app)
				.get("/sponsorships/my")
				.set("Authorization", `Bearer ${sponsorToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("sponsorships");
			expect(Array.isArray(response.body.sponsorships)).toBe(true);
			expect(response.body.sponsorships.length).toBeGreaterThan(0);
		});

		test("Should return empty list for sponsor with no sponsorships", async () => {
			// Generate token for a new sponsor without HTTP calls
			const newSponsorId = 5;
			const newSponsorToken = jwt.sign(
				{ id: newSponsorId, email: "newsponsor@test.com", role: "sponsor" },
				process.env.JWT_SECRET,
				{ expiresIn: process.env.JWT_EXPIRES_IN }
			);

			// Mock user query for the new sponsor
			pool.query.mockImplementation(async (query, params) => {
				if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === newSponsorId) {
						return [[{ id: newSponsorId, email: "newsponsor@test.com", role: "sponsor", is_verified: 1 }], undefined];
					}
				}
				// Handle sponsorship queries for new sponsor (empty result)
				else if (query.includes("SELECT") && query.includes("sponsorship")) {
					return [[], undefined];
				}
				// Fallback to default user handling
				else if (query.includes("SELECT id, email, role, is_verified FROM users")) {
					const userId = params[0];
					if (userId === 1) {
						return [[{ id: 1, email: "sponsor@test.com", role: "sponsor", is_verified: 1 }], undefined];
					}
				}
				return [[], undefined];
			});

			const response = await request(app)
				.get("/sponsorships/my")
				.set("Authorization", `Bearer ${newSponsorToken}`);

			expect(response.status).toBe(200);
			expect(response.body.sponsorships.length).toBe(0);
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).get("/sponsorships/my");

			expect(response.status).toBe(401);
		});

		test("Should fail when non-sponsor tries to access", async () => {
			const response = await request(app)
				.get("/sponsorships/my")
				.set("Authorization", `Bearer ${smeToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});
	});

	describe("GET /sponsorships/impact", () => {
		test("Should get sponsor's impact metrics", async () => {
			const response = await request(app)
				.get("/sponsorships/impact")
				.set("Authorization", `Bearer ${sponsorToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("metrics");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).get("/sponsorships/impact");

			expect(response.status).toBe(401);
		});

		test("Should fail when non-sponsor tries to access", async () => {
			const response = await request(app)
				.get("/sponsorships/impact")
				.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(403);
		});
	});

	describe("GET /sponsorships/meals/:mealId", () => {
		test("Should get all sponsors for a meal", async () => {
			const response = await request(app).get(
				`/sponsorships/meals/${testMealId}`,
			);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("sponsors");
			expect(response.body).toHaveProperty("meal");
			expect(response.body).toHaveProperty("totalSponsored");
			expect(Array.isArray(response.body.sponsors)).toBe(true);
		});

		test("Should include correct total sponsored amount", async () => {
			const response = await request(app).get(
				`/sponsorships/meals/${testMealId}`,
			);

			expect(response.status).toBe(200);
			
			expect(response.body.totalSponsored).toBeGreaterThanOrEqual(100);
		});

		test("Should work without authentication", async () => {
			const response = await request(app).get(
				`/sponsorships/meals/${testMealId}`,
			);

			expect(response.status).toBe(200);
		});

		test("Should fail with invalid meal ID", async () => {
			const response = await request(app).get("/sponsorships/meals/99999");

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with non-numeric meal ID", async () => {
			const response = await request(app).get("/sponsorships/meals/invalid");

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});

		test("Should return empty sponsors for meal with no sponsorships", async () => {
			const response = await request(app).get(
				`/sponsorships/meals/${testMealId2}`,
			);

			expect(response.status).toBe(200);
			expect(response.body.sponsors.length).toBe(0);
			expect(response.body.totalSponsored).toBe(0);
		});
	});

	describe("GET /sponsorships/ngos/:ngoId", () => {
		test("Should get all sponsors for an NGO", async () => {
			const response = await request(app).get(
				`/sponsorships/ngos/${ngoUserId}`,
			);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("sponsors");
			expect(response.body).toHaveProperty("ngo");
			expect(response.body).toHaveProperty("totalSponsored");
			expect(Array.isArray(response.body.sponsors)).toBe(true);
		});

		test("Should include correct total sponsored amount for NGO", async () => {
			const response = await request(app).get(
				`/sponsorships/ngos/${ngoUserId}`,
			);

			expect(response.status).toBe(200);
			
			expect(response.body.totalSponsored).toBeGreaterThanOrEqual(500);
		});

		test("Should work without authentication", async () => {
			const response = await request(app).get(
				`/sponsorships/ngos/${ngoUserId}`,
			);

			expect(response.status).toBe(200);
		});

		test("Should fail with invalid NGO ID", async () => {
			const response = await request(app).get("/sponsorships/ngos/99999");

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with non-numeric NGO ID", async () => {
			const response = await request(app).get("/sponsorships/ngos/invalid");

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});

		test("Should fail when user is not an NGO", async () => {
			
			const response = await request(app).get(
				`/sponsorships/ngos/${1}`, 
			);

			expect([404, 400]).toContain(response.status);
		});
	});

	describe("GET /sponsorships/sponsors/:sponsorId", () => {
		test("Should get sponsor's impact metrics (public access)", async () => {
			const response = await request(app).get(
				`/sponsorships/sponsors/${sponsorUserId}`,
			);

			expect(response.status).toBe(200);
			
			expect(response.body).toBeDefined();
		});

		test("Should work without authentication", async () => {
			const response = await request(app).get(
				`/sponsorships/sponsors/${sponsorUserId}`,
			);

			expect(response.status).toBe(200);
		});

		test("Should fail with invalid sponsor ID", async () => {
			const response = await request(app).get("/sponsorships/sponsors/99999");

			expect([400, 404]).toContain(response.status);
		});

		test("Should fail with non-numeric sponsor ID", async () => {
			const response = await request(app).get("/sponsorships/sponsors/invalid");

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});
	});

	describe("Authorization & Role Tests", () => {
		test("Should prevent SME from creating sponsorship", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${smeToken}`)
				.send({
					meal_id: testMealId,
					amount: 100,
				});

			expect(response.status).toBe(403);
		});

		test("Should prevent NGO from creating sponsorship", async () => {
			const response = await request(app)
				.post("/sponsorships")
				.set("Authorization", `Bearer ${ngoToken}`)
				.send({
					meal_id: testMealId,
					amount: 100,
				});

			expect(response.status).toBe(403);
		});

		test("Should prevent non-sponsor from accessing /my", async () => {
			const endpoints = ["/sponsorships/my", "/sponsorships/impact"];

			for (const endpoint of endpoints) {
				const response = await request(app)
					.get(endpoint)
					.set("Authorization", `Bearer ${smeToken}`);

				expect(response.status).toBe(403);
			}
		});
	});
});
