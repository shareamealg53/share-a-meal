const request = require("supertest");
const app = require("../src/app");
const jwt = require("jsonwebtoken");

// Mock the database pool
jest.mock("../src/config/db", () => ({
	query: jest.fn(),
}));

const pool = require("../src/config/db");

describe("Admin Endpoints", () => {
	let adminToken;
	let regularUserToken;
	let pendingUserId = 2;
	let verifiedUserId = 3;

	beforeAll(async () => {
		// Generate tokens directly without HTTP calls
		adminToken = jwt.sign(
			{ id: 1, email: "admin@test.com", role: "admin" },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		);

		regularUserToken = jwt.sign(
			{ id: 3, email: "user@test.com", role: "ngo" },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN }
		);

		// Setup mock implementation
		pool.query.mockImplementation(async (query, params) => {
			// Auth queries
			if (query.includes("SELECT id, email, role, is_verified FROM users")) {
				const userId = params[0];
				if (userId === 1) {
					return [[{ id: 1, email: "admin@test.com", role: "admin", is_verified: 1 }], undefined];
				} else if (userId === 3) {
					return [[{ id: 3, email: "user@test.com", role: "ngo", is_verified: 1 }], undefined];
				}
			}
			// Pending users list
			else if (query.includes("SELECT id, name, email, role, is_verified FROM users")) {
				return [[
					{ id: 2, name: "Pending User", email: "pending@test.com", role: "sme", is_verified: 0 }
				], undefined];
			}
			// Get all users
			else if (query.includes("SELECT") && query.includes("FROM users")) {
				return [[
					{ id: 1, name: "Admin", email: "admin@test.com", role: "admin", is_verified: 1 },
					{ id: 2, name: "Pending", email: "pending@test.com", role: "sme", is_verified: 0 },
					{ id: 3, name: "Verified", email: "user@test.com", role: "ngo", is_verified: 1 }
				], undefined];
			}
			// Verify/revoke user
			else if (query.includes("UPDATE users SET is_verified")) {
				if (Number(params[1]) === 99999) {
					return [{ affectedRows: 0 }, undefined];
				}
				return [{ affectedRows: 1 }, undefined];
			}
			return [[], undefined];
		});
	});

	beforeEach(() => {
		pool.query.mockClear();
		pool.query.mockImplementation(async (query, params) => {
			// Generic INSERT for any table (registration, user creation, etc)
			if (query.includes("INSERT")) {
				return [{ insertId: Math.floor(Math.random() * 1000) + 100, affectedRows: 1 }, undefined];
			}
			// SELECT for email uniqueness check
			else if (query.includes("SELECT") && query.includes("email") && query.includes("WHERE")) {
				return [[], undefined]; // Email always available
			}
			if (query.includes("SELECT id, email, role, is_verified FROM users")) {
				const userId = params[0];
				if (userId === 1) {
					return [[{ id: 1, email: "admin@test.com", role: "admin", is_verified: 1 }], undefined];
				} else if (userId === 3) {
					return [[{ id: 3, email: "user@test.com", role: "ngo", is_verified: 1 }], undefined];
				}
				// Return default user for any ID
				return [[{ id: userId, email: `user${userId}@test.com`, role: "user", is_verified: 1 }], undefined];
			}
			else if (query.includes("SELECT id, name, email, role, is_verified FROM users")) {
				return [[
					{ id: 2, name: "Pending User", email: "pending@test.com", role: "sme", is_verified: 0 }
				], undefined];
			}
			else if (query.includes("SELECT") && query.includes("FROM users")) {
				return [[
					{ id: 1, name: "Admin", email: "admin@test.com", role: "admin", is_verified: 1 },
					{ id: 2, name: "Pending", email: "pending@test.com", role: "sme", is_verified: 0 },
					{ id: 3, name: "Verified", email: "user@test.com", role: "ngo", is_verified: 1 }
				], undefined];
			}
			else if (query.includes("UPDATE users SET is_verified")) {
				if (Number(params[1]) === 99999) {
					return [{ affectedRows: 0 }, undefined];
				}
				return [{ affectedRows: 1 }, undefined];
			}
			return [[], undefined];
		});
	});

	describe("GET /admin/users/pending", () => {
		test("Should get pending users as admin", async () => {
			const response = await request(app)
				.get("/admin/users/pending")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("users");
			expect(Array.isArray(response.body.users)).toBe(true);
			expect(response.body.users.length).toBeGreaterThan(0);
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).get("/admin/users/pending");

			expect(response.status).toBe(401);
		});

		test("Should fail with non-admin token", async () => {
			const response = await request(app)
				.get("/admin/users/pending")
				.set("Authorization", `Bearer ${regularUserToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});
	});

	describe("GET /admin/users", () => {
		test("Should get all users as admin", async () => {
			const response = await request(app)
				.get("/admin/users")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("users");
			expect(Array.isArray(response.body.users)).toBe(true);
			expect(response.body.users.length).toBeGreaterThan(0);
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).get("/admin/users");

			expect(response.status).toBe(401);
		});

		test("Should fail with non-admin token", async () => {
			const response = await request(app)
				.get("/admin/users")
				.set("Authorization", `Bearer ${regularUserToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});
	});

	describe("PATCH /admin/verify/:userId", () => {
		test("Should verify pending user as admin", async () => {
			const response = await request(app)
				.patch(`/admin/verify/${pendingUserId}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("verified");
		});

		test("Should fail to verify already verified user", async () => {
			const response = await request(app)
				.patch(`/admin/verify/${verifiedUserId}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_STATE");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).patch(
				`/admin/verify/${pendingUserId}`,
			);

			expect(response.status).toBe(401);
		});

		test("Should fail with non-admin token", async () => {
			const response = await request(app)
				.patch(`/admin/verify/${pendingUserId}`)
				.set("Authorization", `Bearer ${regularUserToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail with invalid user ID", async () => {
			const response = await request(app)
				.patch("/admin/verify/99999")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with non-numeric user ID", async () => {
			const response = await request(app)
				.patch("/admin/verify/invalid")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});
	});

	describe("PATCH /admin/revoke/:userId", () => {
		test("Should revoke verification as admin", async () => {
			const response = await request(app)
				.patch(`/admin/revoke/${verifiedUserId}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("revoked");
		});

		test("Should fail to revoke unverified user", async () => {
			
			const newPendingEmail = `newpending${Date.now()}@test.com`;
			const newPendingRegister = await request(app)
				.post("/auth/register")
				.send({
					name: "New Pending User",
					email: newPendingEmail,
					password: "Test123!",
					role: "sme",
				});

			const response = await request(app)
				.patch(`/admin/revoke/${newPendingRegister.body.userId}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_STATE");
		});

		test("Should fail without authentication", async () => {
			const response = await request(app).patch(
				`/admin/revoke/${verifiedUserId}`,
			);

			expect(response.status).toBe(401);
		});

		test("Should fail with non-admin token", async () => {
			const response = await request(app)
				.patch(`/admin/revoke/${verifiedUserId}`)
				.set("Authorization", `Bearer ${regularUserToken}`);

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("FORBIDDEN");
		});

		test("Should fail with invalid user ID", async () => {
			const response = await request(app)
				.patch("/admin/revoke/99999")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(404);
			expect(response.body.code).toBe("NOT_FOUND");
		});

		test("Should fail with non-numeric user ID", async () => {
			const response = await request(app)
				.patch("/admin/revoke/invalid")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});
	});

	describe("Admin Role Protection", () => {
		test("Should prevent regular user from accessing admin routes", async () => {
			const endpoints = [
				"/admin/users/pending",
				"/admin/users",
				`/admin/verify/${pendingUserId}`,
				`/admin/revoke/${verifiedUserId}`,
			];

			for (const endpoint of endpoints) {
				const method =
					endpoint.includes("verify") || endpoint.includes("revoke")
						? "patch"
						: "get";

				const response = await request(app)
					[method](endpoint)
					.set("Authorization", `Bearer ${regularUserToken}`);

				expect(response.status).toBe(403);
				expect(response.body.code).toBe("FORBIDDEN");
			}
		});

		test("Should prevent unauthenticated access to admin routes", async () => {
			const endpoints = [
				"/admin/users/pending",
				"/admin/users",
				`/admin/verify/${pendingUserId}`,
				`/admin/revoke/${verifiedUserId}`,
			];

			for (const endpoint of endpoints) {
				const method =
					endpoint.includes("verify") || endpoint.includes("revoke")
						? "patch"
						: "get";

				const response = await request(app)[method](endpoint);

				expect(response.status).toBe(401);
			}
		});
	});

	describe("Admin Verification Flow", () => {
		test("Should complete full verification flow", async () => {
			
			const email = `flowtest${Date.now()}@test.com`;
			const registerResponse = await request(app).post("/auth/register").send({
				name: "Flow Test User",
				email: email,
				password: "Test123!",
				role: "sme",
			});

			expect(registerResponse.status).toBe(201);
			const userId = registerResponse.body.userId;

			const pendingResponse = await request(app)
				.get("/admin/users/pending")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(pendingResponse.status).toBe(200);
			const foundInPending = pendingResponse.body.users.some(
				(u) => u.id === userId,
			);
			expect(foundInPending).toBe(true);

			const verifyResponse = await request(app)
				.patch(`/admin/verify/${userId}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(verifyResponse.status).toBe(200);

			const pendingAfterResponse = await request(app)
				.get("/admin/users/pending")
				.set("Authorization", `Bearer ${adminToken}`);

			const stillInPending = pendingAfterResponse.body.users.some(
				(u) => u.id === userId,
			);
			expect(stillInPending).toBe(false);

			const revokeResponse = await request(app)
				.patch(`/admin/revoke/${userId}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(revokeResponse.status).toBe(200);

			const pendingFinalResponse = await request(app)
				.get("/admin/users/pending")
				.set("Authorization", `Bearer ${adminToken}`);

			const backInPending = pendingFinalResponse.body.users.some(
				(u) => u.id === userId,
			);
			expect(backInPending).toBe(true);
		});
	});
});
