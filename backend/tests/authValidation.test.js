const express = require("express");
const request = require("supertest");
const {
	sanitizeAuthPayload,
	validateUserRegistration,
	validateUserLogin,
	validateAdminRegistration,
	validateAdminLogin,
} = require("../src/middleware/validate");
const { errorConverter, errorHandler } = require("../src/middleware/errorHandler");

describe("Auth Validation Middleware", () => {
	const app = express();
	app.use(express.json());

	app.post(
		"/test/register",
		sanitizeAuthPayload,
		validateUserRegistration,
		(req, res) => res.status(200).json({ ok: true, body: req.body }),
	);

	app.post(
		"/test/login",
		sanitizeAuthPayload,
		validateUserLogin,
		(req, res) => res.status(200).json({ ok: true, body: req.body }),
	);

	app.post(
		"/test/admin/register",
		sanitizeAuthPayload,
		validateAdminRegistration,
		(req, res) => res.status(200).json({ ok: true, body: req.body }),
	);

	app.post(
		"/test/admin/login",
		sanitizeAuthPayload,
		validateAdminLogin,
		(req, res) => res.status(200).json({ ok: true, body: req.body }),
	);

	app.use(errorConverter);
	app.use(errorHandler);

	test("accepts valid user registration", async () => {
		const res = await request(app).post("/test/register").send({
			name: "Jane Doe",
			email: "JANE@EXAMPLE.COM",
			password: "StrongPass1!",
			role: "sme",
			organization_name: "Acme Foods",
			phone: "+2348012345678",
		});

		expect(res.status).toBe(200);
		expect(res.body.body.email).toBe("jane@example.com");
		expect(res.body.body.role).toBe("sme");
	});

	test("rejects invalid email on register", async () => {
		const res = await request(app).post("/test/register").send({
			name: "Jane Doe",
			email: "bad-email",
			password: "StrongPass1!",
			role: "sme",
			organization_name: "Acme Foods",
		});

		expect(res.status).toBe(400);
		expect(res.body.code).toBe("VALIDATION_ERROR");
	});

	test("rejects weak password on register", async () => {
		const res = await request(app).post("/test/register").send({
			name: "Jane Doe",
			email: "jane@example.com",
			password: "weakpass",
			role: "sme",
			organization_name: "Acme Foods",
		});

		expect(res.status).toBe(400);
		expect(res.body.code).toBe("WEAK_PASSWORD");
	});

	test("requires organization for NGO/SME", async () => {
		const res = await request(app).post("/test/register").send({
			name: "Jane Doe",
			email: "jane@example.com",
			password: "StrongPass1!",
			role: "ngo",
		});

		expect(res.status).toBe(400);
		expect(res.body.code).toBe("VALIDATION_ERROR");
	});

	test("rejects invalid login email format", async () => {
		const res = await request(app).post("/test/login").send({
			email: "not-an-email",
			password: "StrongPass1!",
		});

		expect(res.status).toBe(400);
		expect(res.body.code).toBe("VALIDATION_ERROR");
	});

	test("accepts valid login payload", async () => {
		const res = await request(app).post("/test/login").send({
			email: " user@example.com ",
			password: "StrongPass1!",
		});

		expect(res.status).toBe(200);
		expect(res.body.body.email).toBe("user@example.com");
	});

	test("rejects weak admin password", async () => {
		const res = await request(app).post("/test/admin/register").send({
			name: "Admin User",
			email: "admin@example.com",
			password: "admin",
			admin_secret: "secret",
		});

		expect(res.status).toBe(400);
		expect(res.body.code).toBe("WEAK_PASSWORD");
	});

	test("accepts valid admin login payload", async () => {
		const res = await request(app).post("/test/admin/login").send({
			email: "admin@example.com",
			password: "StrongPass1!",
		});

		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});
});
