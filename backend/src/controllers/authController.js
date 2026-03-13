const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const pool = require("../config/db");

const { AppError } = require("../middleware/errorHandler");
const { generateVerificationToken, sendVerificationEmail } = require("../utils/emailService");

const register = async (req, res, next) => {
	try {
		const { name, email, password, role, organization_name, address, phone } =
			req.body;

		const hashedPassword = await bcrypt.hash(password, 10);
		
		// Generate verification token
		const verificationToken = generateVerificationToken();
		const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		const [result] = await pool.query(
			"INSERT INTO users (name, email, password, role, organization_name, address, phone, is_verified, verification_token, verification_token_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
				name,
				email,
				hashedPassword,
				role,
				organization_name,
				address,
				phone,
				false,
				verificationToken,
				tokenExpires,
			],
		);

		// Send verification email (don't block response if it fails)
		try {
			await sendVerificationEmail(email, name, verificationToken);
		} catch (emailError) {
			console.error("Failed to send verification email:", emailError);
			// Continue anyway - user can request a new verification email
		}

		res.status(201).json({
			message: "User registered successfully",
			userId: result.insertId,
			note: "Please check your email to verify your account. The verification link expires in 24 hours.",
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

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			throw new AppError("Invalid credentials", 401, "AUTH_FAILED");
		}

		if (!user.is_verified) {
			throw new AppError(
				"Account is pending verification.",
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

const verifyEmail = async (req, res, next) => {
	try {
		const { token } = req.params;

		// Find user with valid token
		const [users] = await pool.query(
			"SELECT id, email, name, is_verified, verification_token_expires FROM users WHERE verification_token = ?",
			[token]
		);

		if (users.length === 0) {
			throw new AppError(
				"Invalid or expired verification token",
				400,
				"INVALID_TOKEN"
			);
		}

		const user = users[0];

		// Check if already verified
		if (user.is_verified) {
			return res.json({
				message: "Email already verified. You can now login.",
				alreadyVerified: true,
			});
		}

		// Check if token expired
		if (new Date() > new Date(user.verification_token_expires)) {
			throw new AppError(
				"Verification token has expired. Please request a new one.",
				400,
				"TOKEN_EXPIRED"
			);
		}

		// Verify the user
		await pool.query(
			"UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
			[user.id]
		);

		res.json({
			message: "Email verified successfully! You can now login.",
			verified: true,
		});
	} catch (error) {
		next(error);
	}
};

const resendVerification = async (req, res, next) => {
	try {
		const { email } = req.body;

		if (!email) {
			throw new AppError("Email is required", 400, "VALIDATION_ERROR");
		}

		// Find user
		const [users] = await pool.query(
			"SELECT id, name, email, is_verified FROM users WHERE email = ?",
			[email]
		);

		if (users.length === 0) {
			// Don't reveal if user exists or not (security)
			return res.json({
				message: "If an account exists with this email, a verification link has been sent.",
			});
		}

		const user = users[0];

		// Check if already verified
		if (user.is_verified) {
			return res.json({
				message: "This account is already verified. You can login.",
			});
		}

		// Generate new token
		const verificationToken = generateVerificationToken();
		const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		await pool.query(
			"UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?",
			[verificationToken, tokenExpires, user.id]
		);

		// Send verification email
		try {
			await sendVerificationEmail(user.email, user.name, verificationToken);
		} catch (emailError) {
			console.error("Failed to send verification email:", emailError);
			throw new AppError(
				"Failed to send verification email. Please try again later.",
				500,
				"EMAIL_SEND_FAILED"
			);
		}

		res.json({
			message: "Verification email sent. Please check your inbox.",
		});
	} catch (error) {
		next(error);
	}
};

module.exports = { register, login, verifyEmail, resendVerification };