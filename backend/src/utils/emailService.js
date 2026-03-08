const nodemailer = require("nodemailer");
const crypto = require("crypto");

/**
 * Generate a random verification token
 * @returns {string} Random 32-byte hex token
 */
const generateVerificationToken = () => {
	return crypto.randomBytes(32).toString("hex");
};

/**
 * Create email transporter based on environment
 * In development: Uses Ethereal (fake SMTP for testing)
 * In production: Uses real SMTP credentials from environment variables
 */
const createTransporter = async () => {
	if (process.env.NODE_ENV === "production") {
		// Production: Use real email service
		return nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: process.env.SMTP_PORT || 587,
			secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		});
	} else {
		// Development/Test: Use Ethereal for testing (creates fake account)
		const testAccount = await nodemailer.createTestAccount();
		return nodemailer.createTransport({
			host: "smtp.ethereal.email",
			port: 587,
			secure: false,
			auth: {
				user: testAccount.user,
				pass: testAccount.pass,
			},
		});
	}
};

/**
 * Send verification email to user
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, name, token) => {
	console.log("📧 [EMAIL] Attempting to send verification email to:", email);
	console.log("📧 [EMAIL] SMTP Config:", {
		host: process.env.SMTP_HOST,
		port: process.env.SMTP_PORT,
		secure: process.env.SMTP_SECURE,
		user: process.env.SMTP_USER,
		from: process.env.SMTP_FROM,
	});
	
	const transporter = await createTransporter();

	const verificationUrl = `${process.env.API_URL || "http://localhost:3000"}/auth/verify/${token}`;
	const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

	const mailOptions = {
		from: `"ShareAMeal" <${process.env.SMTP_FROM || "noreply@shareameal.com"}>`,
		to: email,
		subject: "Verify Your ShareAMeal Account",
		html: `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Verify Your Account</title>
			</head>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
					<h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ShareAMeal! 🍽️</h1>
				</div>
				
				<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
					<p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
					
					<p style="font-size: 16px; margin-bottom: 20px;">
						Thanks for registering with ShareAMeal! We're excited to have you join our community 
						of food sharing between SMEs, NGOs, and sponsors.
					</p>
					
					<p style="font-size: 16px; margin-bottom: 30px;">
						To complete your registration and start using your account, please verify your email 
						address by clicking the button below:
					</p>
					
					<div style="text-align: center; margin: 30px 0;">
						<a href="${verificationUrl}" 
						   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
						          color: white; 
						          padding: 15px 40px; 
						          text-decoration: none; 
						          border-radius: 5px; 
						          font-size: 16px; 
						          font-weight: bold;
						          display: inline-block;">
							Verify My Email
						</a>
					</div>
					
					<p style="font-size: 14px; color: #666; margin-top: 30px;">
						Or copy and paste this link into your browser:<br>
						<a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
					</p>
					
					<p style="font-size: 14px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
						⏰ <strong>Note:</strong> This verification link expires in 24 hours.
					</p>
					
					<p style="font-size: 14px; color: #666; margin-top: 10px;">
						If you didn't create an account with ShareAMeal, please ignore this email.
					</p>
				</div>
				
				<div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
					<p>ShareAMeal - Trust-first coordination for food sharing</p>
					<p>
						<a href="${frontendUrl}" style="color: #667eea; text-decoration: none;">Visit Website</a> | 
						<a href="${frontendUrl}/support" style="color: #667eea; text-decoration: none;">Support</a>
					</p>
				</div>
			</body>
			</html>
		`,
		text: `
Hi ${name},

Welcome to ShareAMeal!

Thanks for registering. To complete your registration and verify your email address, 
please click the link below:

${verificationUrl}

This link expires in 24 hours.

If you didn't create an account with ShareAMeal, please ignore this email.

---
ShareAMeal - Trust-first coordination for food sharing
${frontendUrl}
		`,
	};

	const info = await transporter.sendMail(mailOptions);

	// Log email sending result
	console.log("✅ [EMAIL] Email sent successfully:", {
		messageId: info.messageId,
		accepted: info.accepted,
		rejected: info.rejected,
		response: info.response,
	});

	// In development, log the preview URL
	if (process.env.NODE_ENV !== "production") {
		console.log("📧 Email sent:", info.messageId);
		console.log("🔗 Preview URL:", nodemailer.getTestMessageUrl(info));
	}

	return info;
};

module.exports = {
	generateVerificationToken,
	sendVerificationEmail,
};
