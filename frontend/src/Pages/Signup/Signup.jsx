import { NavLink, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";

import styles from "./Signup.module.css";
import Openeye from "../../assets/Icons/eye-open.svg?react";
import Closedeye from "../../assets/Icons/eye-closed.svg?react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-.]{1,79}$/;
const PASSWORD_REGEX =
	/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

const clearAuthStorage = () => {
	localStorage.removeItem("token");
	localStorage.removeItem("role");
	localStorage.removeItem("orgName");
	localStorage.removeItem("user"); // ✅ added
};

function Signup() {
	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm();

	const [serverMessage, setServerMessage] = useState("");
	const [isSuccess, setIsSuccess] = useState(false);
	
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();

	const password = watch("password");


	const onSubmit = async (data) => {
		if (loading) return;

		setLoading(true);
		setServerMessage("");

		try {
			const payload = {
				name: data.name,
				email: data.email,
				password: data.password,
				role: data.role,
				organization_name: data.organization_name,
			};

			await import("../../api").then((m) =>
				m.apiRequest("/auth/register", {
					method: "POST",
					body: JSON.stringify(payload),
				}),
			);

			clearAuthStorage();

			setServerMessage("Registration successful! You can now log in.");
			setIsSuccess(true);
		} catch (error) {
			setServerMessage(error?.message || "Signup failed");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		clearAuthStorage();
	}, []);

	useEffect(() => {
		if (isSuccess) {
			navigate("/login"); // ✅ instant redirect
		}
	}, [isSuccess, navigate]);

	return (
		<div className={styles.signup}>
			<form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
				<h2>
					Create your <span className={styles.shade}>account</span>
				</h2>

				<div className={styles.inputGroup}>
					<input
						placeholder="Full Name"
						{...register("name", {
							required: "Full Name is required",
							pattern: {
								value: NAME_REGEX,
								message: "Enter a valid name",
							},
						})}
					/>
					{errors.name && <p className={styles.error}>{errors.name.message}</p>}
				</div>

				<div className={styles.inputGroup}>
					<input
						type="email"
						placeholder="Email"
						{...register("email", {
							required: "Email is required",
							pattern: {
								value: EMAIL_REGEX,
								message: "Enter a valid email",
							},
						})}
					/>
				</div>

				<div className={styles.inputGroup}>
					<select {...register("role", { required: true })}>
						<option value="">Choose role</option>
						<option value="sme">SME</option>
						<option value="ngo">NGO</option>
						<option value="sponsor">Sponsor</option>
					</select>
				</div>

				<div className={styles.inputGroup}>
					<input
						placeholder="Organization Name"
						{...register("organization_name")}
					/>
				</div>

				<div className={styles.inputGroup}>
					<input
						type="password"
						placeholder="Password"
						{...register("password", {
							required: true,
							pattern: PASSWORD_REGEX,
						})}
					/>
				</div>

				<div className={styles.inputGroup}>
					<input
						type="password"
						placeholder="Confirm Password"
						{...register("confirmPassword", {
							validate: (value) =>
								value === password || "Passwords do not match",
						})}
					/>
				</div>

				<button type="submit" disabled={loading}>
					{loading ? "Signing up..." : "Signup"}
				</button>

				<p>
					Already have an account? <NavLink to="/login">Login</NavLink>
				</p>
			</form>

			{serverMessage && <p>{serverMessage}</p>}
		</div>
	);
}

export default Signup;
