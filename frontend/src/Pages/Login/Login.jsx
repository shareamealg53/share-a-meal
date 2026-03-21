import { NavLink, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";

import styles from "./Login.module.css";
import Openeye from "../../assets/Icons/eye-open.svg?react";
import Closedeye from "../../assets/Icons/eye-closed.svg?react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clearAuthStorage = () => {
	localStorage.removeItem("token");
	localStorage.removeItem("role");
	localStorage.removeItem("orgName");
	localStorage.removeItem("user"); // ✅ important
};

const isTokenActive = (token) => {
	if (!token) return false;
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return false;

		const payload = JSON.parse(
			atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
		);

		if (!payload.exp) return true;
		return payload.exp * 1000 > Date.now();
	} catch {
		return false;
	}
};

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

	const navigate = useNavigate();

	const togglePassword = () => {
		setShowPassword((prev) => !prev);
	};

	const getRoleRoute = (role) => {
		switch ((role || "").toLowerCase()) {
			case "sme":
				return "/sme";
			case "ngo":
				return "/ngo";
			case "sponsor":
				return "/sponsor";
			default:
				return "/dashboard";
		}
	};

	useEffect(() => {
		const savedToken = localStorage.getItem("token");
		const savedRole = localStorage.getItem("role");

		if (savedToken && savedRole && isTokenActive(savedToken)) {
			navigate(getRoleRoute(savedRole));
			return;
		}

		if (savedToken && !isTokenActive(savedToken)) {
			clearAuthStorage();
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

			// ✅ STORE EVERYTHING PROPERLY
			localStorage.setItem("token", result.token);

			if (result?.user) {
				localStorage.setItem("user", JSON.stringify(result.user));
			}

			if (result?.user?.role) {
				localStorage.setItem("role", String(result.user.role).toLowerCase());
			}

			if (result?.user?.organization_name) {
				localStorage.setItem("orgName", result.user.organization_name);
			}

			setToken(result.token);
		} catch (error) {
			setServerMessage(error?.message || "Login failed");
			clearAuthStorage();
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (token) {
			const savedRole = localStorage.getItem("role");
			navigate(getRoleRoute(savedRole));
		}
	}, [token, navigate]);

	return (
		<div className={styles.login}>
			<form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
				<h2>
					Welcome <span className={styles.back}>back!</span>
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
					<p className={styles.forgot}>
						<NavLink to="/forgot-password">Forgot password?</NavLink>
					</p>
				</div>

				<button type="submit" disabled={loading}>
					{loading ? "Logging in..." : "Login"}
				</button>

				<div className={styles.CTA}>
					<label className={styles.rememberMe}>
						<input type="checkbox" />
						<span>Remember me</span>
					</label>

					<p>
						Don’t have an account? <NavLink to="/signup">Signup</NavLink>
					</p>
				</div>
			</form>

			{serverMessage && <p className={styles.error}>{serverMessage}</p>}
		</div>
	);
}

export default Login;
