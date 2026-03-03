import { NavLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./Login.module.css";
import Openeye from "../../assets/Icons/eye-open.svg?react";
import Closedeye from "../../assets/Icons/eye-closed.svg?react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm();

	const [serverMessage, setServerMessage] = useState("");
	const [token, setToken] = useState(null);
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const togglePassword = () => {
		setShowPassword((prev) => !prev);
	};

	const navigate = useNavigate();

	useEffect(() => {
		const savedToken = localStorage.getItem("token");
		const savedRole = localStorage.getItem("role");

		if (savedToken && savedRole) {
			if (savedRole === "SMEs") {
				navigate("/sme");
			} else if (savedRole === "NGOs") {
				navigate("/ngo");
			} else if (savedRole === "Sponsors") {
				navigate("/sponsor");
			}
		}
	}, [navigate]);

	const onSubmit = async (data) => {
		setLoading(true);
		setServerMessage("");
		try {
			const result = await import("../../api").then((m) =>
				m.apiRequest("/auth/login", {
					method: "POST",
					body: JSON.stringify(data),
				}),
			);
			localStorage.setItem("token", result.token);
			setToken(result.token);
		} catch (error) {
			setServerMessage(error?.message || "Login failed");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (token) {
			navigate("/dashboard");
		}
	}, [token, navigate]);

	return (
		<div className={styles.login}>
			<form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
				<h2>
					Welcome <span className={styles.back}>back !</span>
				</h2>

				<div className={styles.inputGroup}>
					<input
						type="email"
						placeholder="Email"
						{...register("email", {
							required: "Email is required",
							pattern: {
								value: EMAIL_REGEX,
								message: "Enter a valid email address",
							},
						})}
					/>
					{errors.email && (
						<p className={styles.error}>{errors.email.message}</p>
					)}
				</div>
				<div className={styles.inputGroup}>
					<div className={styles.passwordWrapper}>
						<input
							type={showPassword ? "text" : "password"}
							placeholder="Password"
							{...register("password", {
								required: "Password is required",
								minLength: {
									value: 8,
									message: "Password must be at least 8 characters",
								},
							})}
						/>
						<span onClick={togglePassword}>
							{showPassword ? <Openeye /> : <Closedeye />}
						</span>
					</div>
					{errors.password && (
						<p className={styles.error}>{errors.password.message}</p>
					)}
				</div>

				{errors.password && <p>{errors.password.message}</p>}

				<button type="submit" disabled={loading}>
					{loading ? "Logging in..." : "Login"}
				</button>

				<div className={styles.CTA}>
					<label className={styles.rememberMe}>
						<input type="checkbox" />
						<span>Remember me</span>
					</label>

					<p>
						Don’t have an account?{" "}
						<NavLink
							to="/signup"
							className={({ isActive }) => (isActive ? "active-link" : "link")}
						>
							Signup
						</NavLink>
					</p>
				</div>
			</form>

			{serverMessage && <p>{serverMessage}</p>}
		</div>
	);
}

export default Login;
