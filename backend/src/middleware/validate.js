const { AppError } = require("./errorHandler");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-.]{1,79}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

const normalizeString = (value) =>
	typeof value === "string" ? value.trim() : value;

const sanitizeAuthPayload = (req, res, next) => {
	if (!req.body || typeof req.body !== "object") {
		return next();
	}

	req.body.name = normalizeString(req.body.name);
	req.body.email = normalizeString(req.body.email)?.toLowerCase();
	req.body.password = normalizeString(req.body.password);
	req.body.role = normalizeString(req.body.role)?.toLowerCase();
	req.body.organization_name = normalizeString(req.body.organization_name);
	req.body.address = normalizeString(req.body.address);
	req.body.phone = normalizeString(req.body.phone);
	req.body.admin_secret = normalizeString(req.body.admin_secret);

	return next();
};

const validateUserRegistration = (req, res, next) => {
	const { name, email, password, role, organization_name, address, phone } =
		req.body;

	if (!name || !email || !password || !role) {
		return next(
			new AppError("Missing required fields", 400, "VALIDATION_ERROR", {
				fields: ["name", "email", "password", "role"],
			}),
		);
	}

	if (!NAME_REGEX.test(name)) {
		return next(
			new AppError(
				"Name must be 2-80 characters and contain only letters, spaces, apostrophes, hyphens, or dots",
				400,
				"VALIDATION_ERROR",
				{ field: "name" },
			),
		);
	}

	if (!EMAIL_REGEX.test(email)) {
		return next(
			new AppError("Invalid email format", 400, "VALIDATION_ERROR", {
				field: "email",
			}),
		);
	}

	if (!PASSWORD_REGEX.test(password)) {
		return next(
			new AppError(
				"Password must be 8-72 characters with uppercase, lowercase, number, and special character",
				400,
				"WEAK_PASSWORD",
				{ field: "password" },
			),
		);
	}

	if (!["sme", "ngo", "sponsor"].includes(role)) {
		return next(
			new AppError(
				"Invalid role. Allowed roles: sme, ngo, sponsor",
				400,
				"INVALID_PARAM",
				{ field: "role", value: role },
			),
		);
	}

	if (["sme", "ngo"].includes(role) && !organization_name) {
		return next(
			new AppError(
				"Organization name is required for SME and NGO accounts",
				400,
				"VALIDATION_ERROR",
				{ field: "organization_name" },
			),
		);
	}

	if (organization_name && organization_name.length > 255) {
		return next(
			new AppError("Organization name is too long", 400, "VALIDATION_ERROR", {
				field: "organization_name",
			}),
		);
	}

	if (address && address.length < 5) {
		return next(
			new AppError("Address must be at least 5 characters", 400, "VALIDATION_ERROR", {
				field: "address",
			}),
		);
	}

	if (phone && !PHONE_REGEX.test(phone)) {
		return next(
			new AppError(
				"Phone number must be 7-15 digits and may start with +",
				400,
				"VALIDATION_ERROR",
				{ field: "phone" },
			),
		);
	}

	return next();
};

const validateUserLogin = (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return next(
			new AppError("Email and password required", 400, "VALIDATION_ERROR", {
				fields: ["email", "password"],
			}),
		);
	}

	if (!EMAIL_REGEX.test(email)) {
		return next(
			new AppError("Invalid email format", 400, "VALIDATION_ERROR", {
				field: "email",
			}),
		);
	}

	return next();
};

const validateAdminRegistration = (req, res, next) => {
	const { name, email, password, admin_secret } = req.body;

	if (!name || !email || !password || !admin_secret) {
		return next(
			new AppError("Missing required fields", 400, "VALIDATION_ERROR", {
				fields: ["name", "email", "password", "admin_secret"],
			}),
		);
	}

	if (!NAME_REGEX.test(name)) {
		return next(
			new AppError(
				"Name must be 2-80 characters and contain only letters, spaces, apostrophes, hyphens, or dots",
				400,
				"VALIDATION_ERROR",
				{ field: "name" },
			),
		);
	}

	if (!EMAIL_REGEX.test(email)) {
		return next(
			new AppError("Invalid email format", 400, "VALIDATION_ERROR", {
				field: "email",
			}),
		);
	}

	if (!PASSWORD_REGEX.test(password)) {
		return next(
			new AppError(
				"Password must be 8-72 characters with uppercase, lowercase, number, and special character",
				400,
				"WEAK_PASSWORD",
				{ field: "password" },
			),
		);
	}

	return next();
};

const validateAdminLogin = (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return next(
			new AppError("Email and password required", 400, "VALIDATION_ERROR", {
				fields: ["email", "password"],
			}),
		);
	}

	if (!EMAIL_REGEX.test(email)) {
		return next(
			new AppError("Invalid email format", 400, "VALIDATION_ERROR", {
				field: "email",
			}),
		);
	}

	return next();
};

const validateIdParam = (paramName) => (req, res, next) => {
	const raw = req.params?.[paramName];
	const id = Number(raw);

	if (!Number.isInteger(id) || id <= 0) {
		return next(
			new AppError(
				`Invalid ${paramName}. Must be a positive integer.`,
				400,
				"INVALID_PARAM",
				{ param: paramName, value: raw },
			),
		);
	}

	return next();
};

module.exports = {
	validateIdParam,
	sanitizeAuthPayload,
	validateUserRegistration,
	validateUserLogin,
	validateAdminRegistration,
	validateAdminLogin,
};
