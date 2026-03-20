const request = require("supertest");
const bcrypt = require("bcryptjs");

// Must be mocked before requiring app
jest.mock("../src/config/db", () => ({
	query: jest.fn(),
}));

// Optional: prevent real email side effects during register tests
jest.mock("../src/utils/emailService", () => ({
	sendVerificationEmail: jest.fn().mockResolvedValue(true),
	generateVerificationToken: jest.fn(() => "test-verification-token"),
}));

const pool = require("../src/config/db");
const app = require("../src/app");

async function hitVerifyEndpoint(token) {
	const candidates = [
		token ? `/auth/verify-email/${token}` : "/auth/verify-email",
		token ? `/auth/verify/${token}` : "/auth/verify",
		`/auth/verify-email${token ? `?token=${token}` : ""}`,
		`/auth/verify${token ? `?token=${token}` : ""}`,
	];

	for (const path of candidates) {
		const getRes = await request(app).get(path);
		if (getRes.status !== 404) return getRes;

		const postRes = await request(app).post(path).send({});
		if (postRes.status !== 404) return postRes;
	}

	throw new Error(
		"No email verification route found. Checked: " + candidates.join(", "),
	);
}

describe("Auth Endpoints", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		pool.query.mockReset(); // important: clears old implementations + mockResolvedValueOnce queue
	});

	describe("POST /auth/register", () => {
		beforeEach(() => {
			// Mock INSERT response for register
			pool.query.mockResolvedValue([
				{ insertId: 1, affectedRows: 1 },
				undefined,
			]);
		});

		test("Should register new SME user successfully", async () => {
			const uniqueEmail = `sme${Date.now()}@test.com`;
			const response = await request(app).post("/auth/register").send({
				name: "Test SME",
				email: uniqueEmail,
				password: "Test123!",
				role: "sme",
				organization_name: "Test SME Org",
				address: "123 Test Street",
				phone: "1234567890",
			});

			expect(response.status).toBe(201);
			expect(response.body).toHaveProperty("userId");
			expect(response.body.message).toBe("User registered successfully");
			expect(response.body.note).toContain("verification");
		});

		test("Should register new NGO user successfully", async () => {
			const uniqueEmail = `ngo${Date.now()}@test.com`;
			const response = await request(app).post("/auth/register").send({
				name: "Test NGO",
				email: uniqueEmail,
				password: "Test123!",
				role: "ngo",
				organization_name: "Test NGO Org",
			});

			expect(response.status).toBe(201);
			expect(response.body).toHaveProperty("userId");
		});

		test("Should fail with missing required fields", async () => {
			const response = await request(app).post("/auth/register").send({
				name: "Test User",
			});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("VALIDATION_ERROR");
			expect(response.body.details).toHaveProperty("fields");
		});

		test("Should fail with invalid role", async () => {
			const response = await request(app).post("/auth/register").send({
				name: "Test User",
				email: "test@test.com",
				password: "Test123!",
				role: "invalid_role",
			});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_PARAM");
		});

		test("Should fail with invalid email format", async () => {
			const response = await request(app).post("/auth/register").send({
				name: "Test User",
				email: "invalid-email",
				password: "Test123!",
				role: "sme",
				organization_name: "Test Org",
			});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("VALIDATION_ERROR");
		});

		test("Should fail with weak password", async () => {
			const response = await request(app)
				.post("/auth/register")
				.send({
					name: "Test User",
					email: `weak${Date.now()}@test.com`,
					password: "password",
					role: "sme",
					organization_name: "Test Org",
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("WEAK_PASSWORD");
		});

		test("Should fail when SME has no organization name", async () => {
			const response = await request(app)
				.post("/auth/register")
				.send({
					name: "Test User",
					email: `noorg${Date.now()}@test.com`,
					password: "Test123!",
					role: "sme",
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("VALIDATION_ERROR");
		});

		test("Should fail with duplicate email", async () => {
			const email = `duplicate${Date.now()}@test.com`;

			// Mock successful first register
			pool.query.mockResolvedValueOnce([
				{ insertId: 5, affectedRows: 1 },
				undefined,
			]);

			await request(app).post("/auth/register").send({
				name: "First User",
				email: email,
				password: "Test123!",
				role: "sme",
				organization_name: "First Org",
			});

			// Mock duplicate key error for second register
			const dupError = new Error("Duplicate entry");
			dupError.code = "ER_DUP_ENTRY";
			pool.query.mockRejectedValueOnce(dupError);

			const response = await request(app).post("/auth/register").send({
				name: "Second User",
				email: email,
				password: "Test123!",
				role: "ngo",
				organization_name: "Second Org",
			});

			expect(response.status).toBe(409);
			expect(response.body.code).toBe("ER_DUP_ENTRY");
		});
	});

	describe("POST /auth/login", () => {
		let testEmail;
		let testPassword = "Test123!";
		let hashedPassword;

		beforeAll(async () => {
			testEmail = `logintest${Date.now()}@test.com`;
			hashedPassword = await bcrypt.hash(testPassword, 10);

			// REMOVE old queued mockResolvedValueOnce here (if present)
		});

		beforeEach(() => {
			pool.query.mockReset();
		});

		test.skip("Should fail login for unverified user", async () => {
			pool.query.mockImplementation(async (sql) => {
				if (/select/i.test(sql) && /from\s+users/i.test(sql)) {
					return [
						[
							{
								id: 2,
								email: testEmail,
								password: hashedPassword,
								role: "sme",
								is_verified: 0,
							},
						],
						[],
					];
				}
				return [[], []];
			});

			const response = await request(app).post("/auth/login").send({
				email: testEmail,
				password: testPassword,
			});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe("ACCOUNT_UNVERIFIED");
			expect((response.body.message || "").toLowerCase()).toContain("verif");
		});

		test("Should fail with invalid email", async () => {
			pool.query.mockImplementation(async (sql) => {
				if (/select/i.test(sql) && /from\s+users/i.test(sql)) return [[], []];
				return [[], []];
			});

			const response = await request(app).post("/auth/login").send({
				email: "nonexistent@test.com",
				password: "SomePassword123!",
			});

			expect(response.status).toBe(401);
			expect(response.body.code).toBe("AUTH_FAILED");
		});

		test("Should fail with wrong password", async () => {
			// Mock SELECT query returning user
			pool.query.mockResolvedValueOnce([
				[
					{
						id: 2,
						email: testEmail,
						password: hashedPassword,
						role: "sme",
						is_verified: true,
					},
				],
				undefined,
			]);

			const response = await request(app).post("/auth/login").send({
				email: testEmail,
				password: "WrongPassword123!",
			});

			expect(response.status).toBe(401);
			expect(response.body.code).toBe("AUTH_FAILED");
		});

		test("Should login successfully with correct credentials", async () => {
			// Mock SELECT query returning verified user
			pool.query.mockResolvedValueOnce([
				[
					{
						id: 2,
						email: testEmail,
						password: hashedPassword,
						role: "sme",
						is_verified: true,
					},
				],
				undefined,
			]);

			const response = await request(app).post("/auth/login").send({
				email: testEmail,
				password: testPassword,
			});

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("token");
			expect(response.body.message).toBe("Login successful");
		});
	});

	describe("Email verification", () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it.skip("verifies email with a valid token", async () => {
			pool.query.mockImplementation(async (sql) => {
				if (/select/i.test(sql)) {
					return [[{ id: 1, email: "user@test.com", is_verified: 0 }], []];
				}
				if (/update/i.test(sql)) {
					return [{ affectedRows: 1 }, []];
				}
				return [[], []];
			});

			const res = await hitVerifyEndpoint("valid-token-123");

			expect([200, 201]).toContain(res.status);
			expect(
				`${res.body?.message || ""} ${res.body?.note || ""}`.toLowerCase(),
			).toMatch(/verif|success|activated/);
		});

		it.skip("rejects invalid/expired token", async () => {
			pool.query.mockImplementation(async (sql) => {
				if (/select/i.test(sql)) {
					return [[], []];
				}
				return [[], []];
			});

			const res = await hitVerifyEndpoint("invalid-or-expired-token");

			expect([400, 401, 404]).toContain(res.status);
			expect(
				`${res.body?.message || ""} ${res.body?.error || ""}`.toLowerCase(),
			).toMatch(/invalid|expired|not found|token/);
		});
	});
});
