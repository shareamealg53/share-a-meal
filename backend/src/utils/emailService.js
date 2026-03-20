const nodemailer = require("nodemailer");
const crypto = require("crypto");

/**
 * Generate a random verification token
 * @returns {string} Random 32-byte hex token
 */
const generateVerificationToken = () => {
	return crypto.randomBytes(32).toString("hex");
};

const EMAIL_SEND_TIMEOUT_MS = Number(
	process.env.EMAIL_SEND_TIMEOUT_MS || 15000,
);

const withTimeout = (promise, timeoutMs, context) => {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`${context} timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		promise.then(
			(result) => {
				clearTimeout(timer);
				resolve(result);
			},
			(err) => {
				clearTimeout(timer);
				reject(err);
			},
		);
	});
};

const createTransporter = async () => {
	const useEthereal = process.env.USE_ETHEREAL === "true";

	if (useEthereal) {
		const testAccount = await nodemailer.createTestAccount();
		console.log("📧 Using Ethereal test account:", testAccount.user);
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

	// Use SendGrid (or any SMTP) in all environments
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: process.env.SMTP_SECURE === "true",
		auth: {
			user: process.env.SMTP_USER, // must be "apikey" for SendGrid
			pass: process.env.SMTP_PASS,
		},
		connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
		greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
		socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
	});
};

const sendVerificationEmail = async (email, name, token) => {
	const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

	const transporter = await createTransporter();

	const mailOptions = {
		from: `"Share A Meal" <${process.env.SMTP_FROM}>`,
		to: email,
		subject: "Verify your Share A Meal account",
		html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e67e22;">Welcome to Share A Meal, ${name}!</h2>
                <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                <a href="${verificationUrl}"
                    style="display: inline-block; padding: 12px 24px; background-color: #e67e22; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                    Verify Email
                </a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                <p style="color: #999; font-size: 14px;">This link expires in 24 hours. If you did not create this account, you can safely ignore this email.</p>
            </div>
        `,
		text: `Welcome to Share A Meal, ${name}!\n\nVerify your email: ${verificationUrl}\n\nThis link expires in 24 hours.`,
	};

	const sendPromise = transporter.sendMail(mailOptions);
	const info = await withTimeout(
		sendPromise,
		EMAIL_SEND_TIMEOUT_MS,
		"sendVerificationEmail",
	);

	if (process.env.USE_ETHEREAL === "true") {
		console.log("📧 Preview URL:", nodemailer.getTestMessageUrl(info));
	} else {
		console.log(`✅ Verification email sent to ${email}`);
	}

	return info;
};

module.exports = {
	generateVerificationToken,
	sendVerificationEmail,
};
