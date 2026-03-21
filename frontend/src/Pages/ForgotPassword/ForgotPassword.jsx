import { useState } from "react";
import { NavLink } from "react-router-dom";
import styles from "./ForgotPassword.module.css";

export default function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");
		try {
			// Replace with your API call
			await import("../../api").then((m) =>
				m.apiRequest("/auth/forgot-password", {
					method: "POST",
					body: JSON.stringify({ email }),
				}),
			);
			setMessage("If this email exists, a reset link has been sent.");
		} catch (error) {
			setMessage("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.forgotPassword}>
			<form onSubmit={handleSubmit} className={styles.form}>
				<h2>Forgot Password</h2>
				<input
					type="email"
					placeholder="Enter your email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<button type="submit" disabled={loading}>
					{loading ? "Sending..." : "Send Reset Link"}
				</button>
				<p>
					<NavLink to="/login">Back to Login</NavLink>
				</p>
				{message && <p>{message}</p>}
			</form>
		</div>
	);
}
