const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const pool = require("../config/db");

const { AppError } = require("../middleware/errorHandler");

const register = async (req, res, next) => {
	try {
		const { name, email, password, role, organization_name, address, phone } =
			req.body;

		const hashedPassword = await bcrypt.hash(password, 10);

		const [result] = await pool.query(
			"INSERT INTO users (name, email, password, role, organization_name, address, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
			[
				name,
				email,
				hashedPassword,
				role,
				organization_name,
				address,
				phone,
			],
		);
		res.status(201).json({
			message: "User registered successfully",
			userId: result.insertId,
			note: "Account requires admin verification before use",
		});
	} catch (error) {
		next(error);
	}
};

const login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
			email,
		]);

		if (users.length === 0) {
			throw new AppError("Invalid credentials", 401, "AUTH_FAILED");
		}

		const user = users[0];

		if (user.role === "admin") {
			throw new AppError(
				"Admin users must login at /admin/auth/login",
				403,
				"FORBIDDEN",
			);
		}

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			throw new AppError("Invalid credentials", 401, "AUTH_FAILED");
		}

		if (!user.is_verified) {
			throw new AppError(
				"Account is pending verification. Please wait for admin approval.",
				403,
				"ACCOUNT_UNVERIFIED",
			);
		}

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN },
		);

		res.json({
			message: "Login successful",
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				is_verified: user.is_verified,
			},
		});
	} catch (error) {
		next(error);
	}
};

const adminRegister = async (req, res, next) => {
	try {
		const { name, email, password, admin_secret } = req.body;

		if (admin_secret !== process.env.ADMIN_SECRET) {
			throw new AppError("Invalid admin secret key", 403, "FORBIDDEN");
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const [result] = await pool.query(
			"INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'admin', true)",
			[name, email, hashedPassword],
		);

		res.status(201).json({
			message: "Admin registered successfully",
			userId: result.insertId,
		});
	} catch (error) {
		next(error);
	}
};

const adminLogin = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		const [users] = await pool.query(
			"SELECT * FROM users WHERE email = ? AND role = 'admin'",
			[email],
		);

		if (users.length === 0) {
			throw new AppError("Invalid admin credentials", 401, "AUTH_FAILED");
		}

		const user = users[0];

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			throw new AppError("Invalid admin credentials", 401, "AUTH_FAILED");
		}

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role },
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN },
		);

		res.json({
			message: "Admin login successful",
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				is_verified: user.is_verified,
			},
		});
	} catch (error) {
		next(error);
	}
};

module.exports = { register, login, adminRegister, adminLogin };
