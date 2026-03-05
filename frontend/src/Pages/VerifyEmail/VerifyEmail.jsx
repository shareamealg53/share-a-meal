import { useEffect, useState } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import styles from "./VerifyEmail.module.css";

function VerifyEmail() {
	const { token } = useParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState("verifying"); // 'verifying', 'success', 'error', 'already-verified'
	const [message, setMessage] = useState("Verifying your email...");

	useEffect(() => {
		const verifyEmail = async () => {
			try {
				const result = await import("../../api").then((m) =>
					m.apiRequest(`/auth/verify/${token}`, {
						method: "GET",
					}),
				);

				if (result.alreadyVerified) {
					setStatus("already-verified");
					setMessage("Your email is already verified! You can login now.");
				} else if (result.verified) {
					setStatus("success");
					setMessage("Email verified successfully! Redirecting to login...");
					// Redirect to login after 3 seconds
					setTimeout(() => {
						navigate("/login");
					}, 3000);
				}
			} catch (error) {
				setStatus("error");
				if (error?.message?.includes("expired")) {
					setMessage(
						"Your verification link has expired. Please request a new verification email from the login page."
					);
				} else if (error?.message?.includes("Invalid")) {
					setMessage("Invalid verification link. Please check your email for the correct link.");
				} else {
					setMessage(error?.message || "Verification failed. Please try again.");
				}
			}
		};

		if (token) {
			verifyEmail();
		}
	}, [token, navigate]);

	return (
		<div className={styles.verifyEmail}>
			<div className={styles.container}>
				<div className={styles.iconContainer}>
					{status === "verifying" && (
						<div className={styles.spinner}></div>
					)}
					{status === "success" && (
						<div className={styles.successIcon}>✓</div>
					)}
					{status === "already-verified" && (
						<div className={styles.infoIcon}>ℹ</div>
					)}
					{status === "error" && (
						<div className={styles.errorIcon}>✕</div>
					)}
				</div>

				<h2 className={styles.title}>Email Verification</h2>
				<p className={styles.message}>{message}</p>

				<div className={styles.actions}>
					{status === "success" && (
						<p className={styles.autoRedirect}>
							Automatically redirecting to login in 3 seconds...
						</p>
					)}

					{(status === "already-verified" || status === "error") && (
						<>
							<NavLink to="/login" className={styles.loginButton}>
								Go to Login
							</NavLink>
							{status === "error" && (
								<p className={styles.helpText}>
									Need help? Contact support at support@shareameal.com
								</p>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default VerifyEmail;
