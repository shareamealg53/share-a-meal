import { useEffect, useState } from "react";
import styles from "./SmeDash.module.css";
import { apiRequest } from "../../api";

export default function SmeDash() {
	const [data, setData] = useState({
		meals: [],
		stats: {
			totalMeals: 0,
			totalPickups: 0,
			expiryRate: 0,
		},
	});

	const [form, setForm] = useState({
		title: "",
		description: "",
		quantity: "",
		unit: "",
		prepared_at: "",
		storage_type: "",
		food_type: "",
		food_status: "",
	});

	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);

	/* ================= FETCH DATA ================= */
	const fetchSMEData = async () => {
		try {
			const token = localStorage.getItem("token");

			const res = await apiRequest("/meals/my", {
				headers: { Authorization: `Bearer ${token}` },
			});

			const meals = res.meals || [];

			const totalMeals = meals.length;
			const totalPickups = meals.filter((m) => m.status === "PICKED_UP").length;
			const expired = meals.filter((m) => m.status === "EXPIRED").length;

			setData({
				meals,
				stats: {
					totalMeals,
					totalPickups,
					expiryRate: totalMeals ? Math.round((expired / totalMeals) * 100) : 0,
				},
			});
		} catch (err) {
			console.error(err);
			setError(err?.message || "Failed to load dashboard");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSMEData();
	}, []);

	/* ================= FORM HANDLERS ================= */
	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			const token = localStorage.getItem("token");

			await apiRequest("/meals", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					...form,
					quantity: Number(form.quantity), // ✅ ensure number
				}),
			});

			// ✅ Reset form
			setForm({
				title: "",
				description: "",
				quantity: "",
				unit: "",
				prepared_at: "",
				storage_type: "",
				food_type: "",
				food_status: "",
			});

			// ✅ Refresh data instead of reload
			await fetchSMEData();
		} catch (err) {
			setError(err?.message || "Failed to create meal");
		} finally {
			setSubmitting(false);
		}
	};

	const handleMarkReady = async (mealId) => {
		try {
			const token = localStorage.getItem("token");
			await apiRequest(`/meals/${mealId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ status: "PICKUP_READY" }),
			});
			await fetchSMEData(); // Refresh meals
		} catch (err) {
			setError(err?.message || "Failed to update meal status");
		}
	};

	/* ================= UI STATES ================= */
	if (loading) {
		return <div className={styles.dashboard}>Loading dashboard...</div>;
	}

	if (error) {
		return (
			<div className={styles.dashboard}>
				<p className={styles.error}>Error: {error}</p>
			</div>
		);
	}

	return (
		<div className={styles.dashboard}>
			{/* ===== HEADER ===== */}
			<div className={styles.header}>
				<h2>Hello, Welcome Back 👋</h2>
				<p className={styles.subtext}>
					Manage your meals and track your impact
				</p>
			</div>

			{/* ===== STATS ===== */}
			<div className={styles.statsGrid}>
				<div className={styles.card}>
					<h4>Total Meals</h4>
					<h2>{data.stats.totalMeals}</h2>
				</div>

				<div className={`${styles.card} ${styles.greenCard}`}>
					<h4>Total Pickups</h4>
					<h2>{data.stats.totalPickups}</h2>
				</div>

				<div className={styles.card}>
					<h4>Expiry Rate</h4>
					<h2>{data.stats.expiryRate}%</h2>
				</div>
			</div>

			{/* ===== CREATE MEAL ===== */}
			<div className={styles.section}>
				<h3>Create Meal</h3>

				<form className={styles.form} onSubmit={handleSubmit}>
					<input
						name="title"
						placeholder="Meal Title"
						required
						value={form.title}
						onChange={handleChange}
					/>

					<textarea
						name="description"
						placeholder="Description"
						required
						value={form.description}
						onChange={handleChange}
					/>

					<input
						type="number"
						name="quantity"
						placeholder="Quantity"
						min="1"
						required
						value={form.quantity}
						onChange={handleChange}
					/>

					<select
						name="unit"
						required
						value={form.unit}
						onChange={handleChange}
					>
						<option value="">Select Unit</option>
						<option value="kg">kg</option>
						<option value="servings">servings</option>
						<option value="packs">packs</option>
						<option value="pieces">pieces</option>
					</select>

					<input
						type="datetime-local"
						name="prepared_at"
						required
						value={form.prepared_at}
						onChange={handleChange}
					/>

					<select
						name="storage_type"
						value={form.storage_type}
						onChange={handleChange}
					>
						<option value="">Storage Type</option>
						<option value="Room Temperature">Room Temperature</option>
						<option value="Refrigerated">Refrigerated</option>
					</select>

					<select
						name="food_type"
						value={form.food_type}
						onChange={handleChange}
					>
						<option value="">Food Type</option>
						<option value="Rice">Rice</option>
						<option value="Bread">Bread</option>
						<option value="Soup">Soup</option>
						<option value="Beans">Beans</option>
					</select>

					<select
						name="food_status"
						value={form.food_status}
						onChange={handleChange}
					>
						<option value="">Food Status</option>
						<option value="Fresh">Fresh</option>
						<option value="Moderate">Moderate</option>
						<option value="Spoiled">Spoiled</option>
					</select>

					<button type="submit" disabled={submitting}>
						{submitting ? "Creating..." : "Create Meal"}
					</button>
				</form>
			</div>

			{/* ===== MEALS LIST ===== */}
			<div className={styles.section}>
				<h3>Your Meals</h3>

				{data.meals.length === 0 ? (
					<div className={styles.empty}>No meals created yet.</div>
				) : (
					<div className={styles.mealsGrid}>
						{data.meals.slice(0, 6).map((meal) => (
							<div key={meal.id} className={styles.mealCard}>
								<h4>{meal.title}</h4>
								<p>Status: {meal.status}</p>
								<p>Quantity: {meal.quantity}</p>

								<button
									className={styles.actionBtn}
									onClick={() => handleMarkReady(meal.id)}
								>
									Mark Ready
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ===== IMPACT ===== */}
			<div className={styles.section}>
				<h3>Impact</h3>
				<div className={styles.impactStats}>
					<div>Total Meals: {data.stats.totalMeals}</div>
					<div>Total Pickups: {data.stats.totalPickups}</div>
					<div>Expiry Rate: {data.stats.expiryRate}%</div>
				</div>
			</div>
		</div>
	);
}
