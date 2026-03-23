const jwt = require("jsonwebtoken");
const { AppError } = require("./errorHandler");

const pool = require("../config/db");

const catchAsync = require("../utils/catchAsync");

const authenticate = catchAsync(async (req, res, next) => {
	const token = req.headers.authorization?.split(" ")[1];

	if (!token) {
		return next(new AppError("No token provided", 401, "AUTH_REQUIRED"));
	}

	const decoded = jwt.verify(token, process.env.JWT_SECRET);

	const [users] = await pool.query(
		"SELECT id, email, role FROM users WHERE id = ?",
		[decoded.id],
	);

	if (users.length === 0) {
		return next(
			new AppError("Invalid token - user not found", 401, "AUTH_FAILED"),
		);
	}

	req.user = users[0];

	next();
});

const requireRole = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return next(
				new AppError(
					"Access denied - insufficient permissions",
					403,
					"FORBIDDEN",
				),
			);
		}

		next();
	};
};

module.exports = { authenticate, requireRole };
