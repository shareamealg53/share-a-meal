const express = require("express");

const {
	register,
	login,
	verifyEmail,
	resendVerification,
} = require("../controllers/authController");
const { loginLimiter } = require("../middleware/requestGuards");
const {
	sanitizeAuthPayload,
	validateUserRegistration,
	validateUserLogin,
} = require("../middleware/validate");
const router = express.Router();

// Handle CORS preflight requests
router.options("/register", (req, res) => res.sendStatus(204));
router.options("/login", (req, res) => res.sendStatus(204));
// router.options("/verify/:token", (req, res) => res.sendStatus(204));
// router.options("/resend-verification", (req, res) => res.sendStatus(204));

router.post(
	"/register",
	sanitizeAuthPayload,
	validateUserRegistration,
	register,
);

router.post(
	"/login",
	sanitizeAuthPayload,
	validateUserLogin,
	loginLimiter,
	login,
);

// // Email verification endpoint
// router.get("/verify/:token", verifyEmail);

// // Resend verification email
// router.post("/resend-verification", resendVerification); // keep before any protected routes

// Forgot password endpoint
router.post("/forgot-password", forgotPassword);
// Reset password endpoint
router.post("/reset-password", resetPassword);

module.exports = router;
