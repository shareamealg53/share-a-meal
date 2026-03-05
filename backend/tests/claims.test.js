const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/config/db", () => ({
query: jest.fn(),
}));

jest.mock("../src/middleware/auth", () => {
const jwtLib = require("jsonwebtoken");
const { AppError } = require("../src/middleware/errorHandler");

const authenticate = (req, res, next) => {
const token = req.headers.authorization?.split(" ")[1];
if (!token) return next(new AppError("No token provided", 401, "AUTH_REQUIRED"));

try {
const decoded = jwtLib.verify(token, process.env.JWT_SECRET);
req.user = {
id: Number(decoded.id),
email: decoded.email,
role: decoded.role,
is_verified: 1,
};
next();
} catch (err) {
return next(new AppError("Invalid token", 401, "AUTH_FAILED"));
}
};

const requireRole = (...roles) => (req, res, next) => {
if (!roles.includes(req.user.role)) {
return next(new AppError("Access denied - insufficient permissions", 403, "FORBIDDEN"));
}
next();
};

const requireVerified = (req, res, next) => {
if (!req.user.is_verified) {
return next(new AppError("Account not verified", 403, "NOT_VERIFIED"));
}
next();
};

return { authenticate, requireRole, requireVerified };
});

const app = require("../src/app");
const pool = require("../src/config/db");

describe("Claim Endpoints", () => {
let smeToken;
let ngoToken;
let sponsorToken;
let claimableMealId;
let readyMealId;
let pickedUpMealId;

beforeAll(() => {
smeToken = jwt.sign(
{ id: 1, email: "sme@test.com", role: "sme" },
process.env.JWT_SECRET,
{ expiresIn: process.env.JWT_EXPIRES_IN },
);

ngoToken = jwt.sign(
{ id: 2, email: "ngo@test.com", role: "ngo" },
process.env.JWT_SECRET,
{ expiresIn: process.env.JWT_EXPIRES_IN },
);

sponsorToken = jwt.sign(
{ id: 3, email: "sponsor@test.com", role: "sponsor" },
process.env.JWT_SECRET,
{ expiresIn: process.env.JWT_EXPIRES_IN },
);
});

beforeEach(() => {
claimableMealId = 100;
readyMealId = 104;
pickedUpMealId = 103;

global.mockDataStore = {
meals: new Map([
[100, { id: 100, title: "Claimable Meal", quantity: 10, unit: "servings", status: "AVAILABLE", restaurant_id: 1 }],
[101, { id: 101, title: "Another Meal", quantity: 5, unit: "servings", status: "AVAILABLE", restaurant_id: 1 }],
[102, { id: 102, title: "Pickup Meal", quantity: 5, unit: "servings", status: "PICKUP_READY", restaurant_id: 1 }],
[103, { id: 103, title: "Completion Meal", quantity: 5, unit: "servings", status: "PICKED_UP", restaurant_id: 1 }],
[104, { id: 104, title: "Ready Transition Meal", quantity: 5, unit: "servings", status: "CLAIMED", restaurant_id: 1 }],
]),
claims: new Map([
[201, { id: 201, meal_id: 102, ngo_id: 2, status: "ACTIVE", claimed_at: new Date() }],
[202, { id: 202, meal_id: 103, ngo_id: 2, status: "ACTIVE", claimed_at: new Date() }],
[203, { id: 203, meal_id: 104, ngo_id: 2, status: "ACTIVE", claimed_at: new Date() }],
]),
};

pool.query.mockClear();
pool.query.mockImplementation(async (query, params = []) => {
const store = global.mockDataStore;
const sql = String(query).replace(/\s+/g, " ").trim().toLowerCase();

if (sql.startsWith("insert into meals ")) {
const mealId = Math.floor(Math.random() * 10000) + 1000;
store.meals.set(mealId, {
id: mealId,
restaurant_id: Number(params[0]),
title: params[1],
quantity: Number(params[3]),
unit: params[4],
status: "AVAILABLE",
});
return [{ insertId: mealId, affectedRows: 1 }, undefined];
}

if (sql.startsWith("select id, status, restaurant_id from meals where id = ?")) {
const meal = store.meals.get(Number(params[0]));
return [meal ? [{ id: meal.id, status: meal.status, restaurant_id: meal.restaurant_id }] : [], undefined];
}

if (sql.startsWith("select status, restaurant_id from meals where id = ?") || sql.startsWith("select status from meals where id = ?")) {
const meal = store.meals.get(Number(params[0]));
return [meal ? [{ status: meal.status, restaurant_id: meal.restaurant_id }] : [], undefined];
}

if (sql.startsWith("select id from claims where meal_id = ? and ngo_id = ? and status = 'active'")) {
const mealId = Number(params[0]);
const ngoId = Number(params[1]);
const found = Array.from(store.claims.values()).filter((c) => c.meal_id === mealId && c.ngo_id === ngoId && c.status === "ACTIVE");
return [found.map((c) => ({ id: c.id })), undefined];
}

if (sql.startsWith("select id from claims where meal_id = ? and status = 'active'")) {
const mealId = Number(params[0]);
const found = Array.from(store.claims.values()).filter((c) => c.meal_id === mealId && c.status === "ACTIVE");
return [found.map((c) => ({ id: c.id })), undefined];
}

if (sql.startsWith("insert into claims (meal_id, ngo_id, status) values (?, ?, ?)")) {
const claimId = Math.floor(Math.random() * 10000) + 2000;
store.claims.set(claimId, {
id: claimId,
meal_id: Number(params[0]),
ngo_id: Number(params[1]),
status: String(params[2]),
claimed_at: new Date(),
});
return [{ insertId: claimId, affectedRows: 1 }, undefined];
}

if (sql.startsWith("update meals set status = ? where id = ?")) {
const meal = store.meals.get(Number(params[1]));
if (meal) meal.status = String(params[0]);
return [{ affectedRows: meal ? 1 : 0 }, undefined];
}

if (sql.startsWith("insert into meal_logs ")) {
return [{ insertId: Date.now(), affectedRows: 1 }, undefined];
}

if (sql.includes("from claims c") && sql.includes("where c.ngo_id = ?")) {
const ngoId = Number(params[0]);
const claims = Array.from(store.claims.values())
.filter((c) => c.ngo_id === ngoId)
.map((c) => {
const meal = store.meals.get(c.meal_id) || {};
return {
...c,
title: meal.title,
quantity: meal.quantity,
unit: meal.unit,
meal_status: meal.status,
restaurant_name: "Test SME",
};
});
return [claims, undefined];
}

if (sql.startsWith("select id, status, meal_id, ngo_id from claims where id = ?") || sql.startsWith("select id, meal_id, ngo_id, status from claims where id = ?")) {
const claim = store.claims.get(Number(params[0]));
return [claim ? [{ id: claim.id, meal_id: claim.meal_id, ngo_id: claim.ngo_id, status: claim.status }] : [], undefined];
}

if (sql.startsWith("update claims set status = ? where id = ?") || sql.startsWith("update claims set status = ?, picked_up_at = now() where id = ?") || sql.startsWith("update claims set status = ?, completed_at = now() where id = ?")) {
const claim = store.claims.get(Number(params[1]));
if (claim) claim.status = String(params[0]);
return [{ affectedRows: claim ? 1 : 0 }, undefined];
}

return [[], undefined];
});
});

afterAll(() => {
global.mockDataStore = undefined;
});

describe("POST /claims/meal/:mealId", () => {
test("Should claim meal as NGO", async () => {
const response = await request(app)
.post(`/claims/meal/${claimableMealId}`)
.set("Authorization", `Bearer ${ngoToken}`);

expect(response.status).toBe(201);
expect(response.body).toHaveProperty("claimId");
expect(response.body).toHaveProperty("mealId");
});

test("Should fail to claim without authentication", async () => {
const response = await request(app).post(`/claims/meal/${claimableMealId}`);
expect(response.status).toBe(401);
});

test("Should fail when SME tries to claim meal", async () => {
const response = await request(app)
.post("/claims/meal/101")
.set("Authorization", `Bearer ${smeToken}`);

expect(response.status).toBe(403);
expect(response.body.code).toBe("FORBIDDEN");
});

test("Should fail to claim already claimed meal", async () => {
await request(app)
.post(`/claims/meal/${claimableMealId}`)
.set("Authorization", `Bearer ${ngoToken}`);

const response = await request(app)
.post(`/claims/meal/${claimableMealId}`)
.set("Authorization", `Bearer ${ngoToken}`);

			expect(response.status).toBe(400);
			expect(response.body.code).toBe("INVALID_STATE");
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
.patch(`/claims/meal/${readyMealId}/ready`)
.set("Authorization", `Bearer ${smeToken}`);

expect(response.status).toBe(200);
expect(response.body.message).toContain("ready");
});

test("Should fail when NGO tries to mark ready", async () => {
const response = await request(app)
.patch(`/claims/meal/${readyMealId}/ready`)
.set("Authorization", `Bearer ${ngoToken}`);

expect(response.status).toBe(403);
expect(response.body.code).toBe("FORBIDDEN");
});

test("Should fail without authentication", async () => {
const response = await request(app).patch(`/claims/meal/${readyMealId}/ready`);
expect(response.status).toBe(401);
});

test("Should fail with invalid meal ID", async () => {
const response = await request(app)
.patch("/claims/meal/99999/ready")
.set("Authorization", `Bearer ${smeToken}`);

expect(response.status).toBe(404);
expect(response.body.code).toBe("NOT_FOUND");
});
});

describe("PATCH /claims/:claimId/pickup", () => {
test("Should confirm pickup by NGO", async () => {
const response = await request(app)
.patch("/claims/201/pickup")
.set("Authorization", `Bearer ${ngoToken}`);

expect(response.status).toBe(200);
expect(response.body.message).toContain("Pickup");
});

test("Should fail when SME tries to confirm pickup", async () => {
const response = await request(app)
.patch("/claims/201/pickup")
.set("Authorization", `Bearer ${smeToken}`);

expect(response.status).toBe(403);
expect(response.body.code).toBe("FORBIDDEN");
});

test("Should fail without authentication", async () => {
const response = await request(app).patch("/claims/201/pickup");
expect(response.status).toBe(401);
});

test("Should fail with invalid claim ID", async () => {
const response = await request(app)
.patch("/claims/99999/pickup")
.set("Authorization", `Bearer ${ngoToken}`);

expect(response.status).toBe(404);
expect(response.body.code).toBe("NOT_FOUND");
});
});

describe("PATCH /claims/:claimId/complete", () => {
test("Should confirm completion by NGO", async () => {
const response = await request(app)
.patch(`/claims/202/complete`)
.set("Authorization", `Bearer ${ngoToken}`)
.send({ beneficiaries_count: 50 });

expect(response.status).toBe(200);
expect(response.body.message).toContain("completion");
});

test("Should fail when SME tries to complete", async () => {
const response = await request(app)
.patch(`/claims/202/complete`)
.set("Authorization", `Bearer ${smeToken}`)
.send({ beneficiaries_count: 50 });

expect(response.status).toBe(403);
expect(response.body.code).toBe("FORBIDDEN");
});

test("Should fail without authentication", async () => {
const response = await request(app)
.patch(`/claims/202/complete`)
.send({ beneficiaries_count: 50 });

expect(response.status).toBe(401);
});

test("Should fail with invalid claim ID", async () => {
const response = await request(app)
.patch("/claims/99999/complete")
.set("Authorization", `Bearer ${ngoToken}`)
.send({ beneficiaries_count: 50 });

expect(response.status).toBe(404);
expect(response.body.code).toBe("NOT_FOUND");
});

test("Should fail with invalid beneficiaries count", async () => {
const response = await request(app)
.patch(`/claims/202/complete`)
.set("Authorization", `Bearer ${ngoToken}`)
.send({ beneficiaries_count: -10 });

expect(response.status).toBe(400);
expect(response.body.code).toBe("INVALID_FORMAT");
});
});

describe("PATCH /claims/:claimId/cancel", () => {
test("Should cancel claim by NGO", async () => {
const response = await request(app)
.patch("/claims/201/cancel")
.set("Authorization", `Bearer ${ngoToken}`);

expect(response.status).toBe(200);
expect(response.body.message).toContain("cancelled");
});

test("Should fail when SME tries to cancel", async () => {
const response = await request(app)
.patch("/claims/201/cancel")
.set("Authorization", `Bearer ${smeToken}`);

expect(response.status).toBe(403);
expect(response.body.code).toBe("FORBIDDEN");
});

test("Should fail without authentication", async () => {
const response = await request(app).patch("/claims/201/cancel");
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
