import { useState } from "react";
import { useSearchParams, NavLink } from "react-router-dom";
import styles from "./ResetPassword.module.css";

export default function ResetPassword() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");
		try {
			await import("../../api").then((m) =>
				m.apiRequest("/auth/reset-password", {
					method: "POST",
					body: JSON.stringify({ token, password }),
				}),
			);
			setMessage("Password reset successful. You can now log in.");
		} catch (err) {
			setMessage("Reset failed. The link may be invalid or expired.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.resetPassword}>
			<form onSubmit={handleSubmit} className={styles.form}>
				<h2>Reset Password</h2>
				<input
					type="password"
					placeholder="New password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				<button type="submit" disabled={loading}>
					{loading ? "Resetting..." : "Reset Password"}
				</button>
				<p>
					<NavLink to="/login">Back to Login</NavLink>
				</p>
				{message && <p>{message}</p>}
			</form>
		</div>
	);
}
