process.env.NODE_ENV = "test";
process.env.DB_NAME = "sharemeal_test"; 
process.env.JWT_SECRET = "test-secret-key-12345";
process.env.JWT_EXPIRES_IN = "24h";
process.env.SERVICE_TOKEN = "test-service-token";
process.env.API_URL = "http://localhost:3000";
process.env.FRONTEND_URL = "http://localhost:5173";

jest.setTimeout(10000);

// Mock email service for tests
jest.mock("./src/utils/emailService", () => ({
	generateVerificationToken: jest.fn(() => "test-verification-token-123"),
	sendVerificationEmail: jest.fn(() => Promise.resolve({ messageId: "test-message-id" })),
}));

// Global mock state management for database
global.mockDataStore = {
	users: new Map([
		[1, { id: 1, email: "sponsor@test.com", role: "sponsor", is_verified: 1, password_hash: "" }],
		[2, { id: 2, email: "sme@test.com", role: "sme", is_verified: 1, password_hash: "" }],
		[3, { id: 3, email: "ngo@test.com", role: "ngo", is_verified: 1, password_hash: "" }],
		[4, { id: 4, email: "pending@test.com", role: "sme", is_verified: 0, password_hash: "" }],
		[5, { id: 5, email: "sponsor2@test.com", role: "sponsor", is_verified: 1, password_hash: "" }],
	]),
	meals: new Map([
		[100, { id: 100, title: "Test Meal", quantity: 10, food_status: "AVAILABLE", created_by: 3 }],
		[101, { id: 101, title: "Another Meal", quantity: 5, food_status: "AVAILABLE", created_by: 3 }],
	]),
	claims: new Map(),
	sponsorships: new Map(),
};

// Reset mock data between tests
beforeEach(() => {
	global.mockDataStore = {
		users: new Map([
			[1, { id: 1, email: "sponsor@test.com", role: "sponsor", is_verified: 1, password_hash: "" }],
			[2, { id: 2, email: "sme@test.com", role: "sme", is_verified: 1, password_hash: "" }],
			[3, { id: 3, email: "ngo@test.com", role: "ngo", is_verified: 1, password_hash: "" }],
			[4, { id: 4, email: "pending@test.com", role: "sme", is_verified: 0, password_hash: "" }],
			[5, { id: 5, email: "sponsor2@test.com", role: "sponsor", is_verified: 1, password_hash: "" }],
		]),
		meals: new Map([
			[100, { id: 100, title: "Test Meal", quantity: 10, food_status: "AVAILABLE", created_by: 3 }],
			[101, { id: 101, title: "Another Meal", quantity: 5, food_status: "AVAILABLE", created_by: 3 }],
		]),
		claims: new Map(),
		sponsorships: new Map(),
	};
});
