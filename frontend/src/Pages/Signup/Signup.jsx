import { NavLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Signup.module.css";
import Openeye from "../../assets/Icons/eye-open.svg?react";
import Closedeye from "../../assets/Icons/eye-closed.svg?react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-.]{1,79}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

function Signup() {
	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm();

	const [serverMessage, setServerMessage] = useState("");
	const [isSuccess, setIsSuccess] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();

	const password = watch("password");
	const role = watch("role");

	const togglePassword = () => {
		setShowPassword((prev) => !prev);
	};

	const onSubmit = async (data) => {
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

			const result = await import("../../api").then((m) =>
				m.apiRequest("/auth/register", {
					method: "POST",
					body: JSON.stringify(payload),
				}),
			);
			setServerMessage(
				"Registration successful! Please check your email to verify your account. The verification link expires in 24 hours."
			);
			setIsSuccess(true);
		} catch (error) {
			setServerMessage(error?.message || "Signup failed");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (isSuccess) {
			const timer = setTimeout(() => {
				navigate("/login");
			}, 4000);

			return () => clearTimeout(timer);
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
								message:
									"Name must be 2-80 letters and can include spaces, apostrophes, hyphens, or dots",
							},
						})}
					/>
					{errors.name && <p className={styles.error}>{errors.name.message}</p>}
				</div>
				<div className={styles.inputGroup}>
					<input
						type="email"
						placeholder="Email Address"
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
					<select
						className={styles.options}
						{...register("role", { required: "Role is required" })}
					>
						<option value="">Choose your role</option>
						<option value="sme">SMEs</option>
						<option value="ngo">NGOs</option>
						<option value="sponsor">Sponsors</option>
					</select>
					{errors.role && <p className={styles.error}>{errors.role.message}</p>}
				</div>
				<div className={styles.inputGroup}>
					<input
						placeholder="Organization Name"
						{...register("organization_name", {
							validate: (value) => {
								if (["sme", "ngo"].includes(role || "") && !value?.trim()) {
									return "Organization Name is required for SMEs and NGOs";
								}
								return true;
							},
						})}
					/>
					{errors.organization_name && (
						<p className={styles.error}>{errors.organization_name.message}</p>
					)}
				</div>

				<div className={styles.inputGroup}>
					<div className={styles.passwordWrapper}>
						<input
							type={showPassword ? "text" : "password"}
							placeholder="Enter Password"
							{...register("password", {
								required: "Password is required",
								pattern: {
									value: PASSWORD_REGEX,
									message:
										"Password must be 8+ chars with uppercase, lowercase, number, and special character",
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

				<div className={styles.inputGroup}>
					<div className={styles.passwordWrapper}>
						<input
							type={showConfirmPassword ? "text" : "password"}
							placeholder="Confirm Password"
							{...register("confirmPassword", {
								required: "Please confirm your password",
								validate: (value) =>
									value === password || "Passwords do not match",
							})}
						/>
						<span onClick={() => setShowConfirmPassword((prev) => !prev)}>
							{showConfirmPassword ? <Openeye /> : <Closedeye />}
						</span>
					</div>
					{errors.confirmPassword && (
						<p className={styles.error}>{errors.confirmPassword.message}</p>
					)}
				</div>

				<button type="submit" disabled={loading}>
					{loading ? "Signing up..." : "Signup"}
				</button>

				<div className={styles.inputGroup}>
					<div className={styles.termsWrapper}>
						<label className={styles.agree}>
							<input
								type="checkbox"
								{...register("terms", {
									required: "You must agree to the Terms and Services",
								})}
							/>
							<span> I agree to the Terms and Services</span>
						</label>
					</div>
					{errors.terms && (
						<p className={styles.error}>{errors.terms.message}</p>
					)}
				</div>

				<p>
					Already have an account?
					<NavLink
						to="/login"
						className={({ isActive }) => (isActive ? "active-link" : "link")}
					>
						<span className="login">Login</span>
					</NavLink>
				</p>
			</form>

			{serverMessage && (
				<div
					className={`${styles.statusCard} ${
						isSuccess ? styles.statusSuccess : styles.statusError
					}`}
				>
					<p>{serverMessage}</p>
				</div>
			)}
		</div>
	);
}

export default Signup;
