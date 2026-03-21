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

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchSMEData = async () => {
			try {
				// 🔥 Use the correct endpoint for SME's own meals
				const token = localStorage.getItem("token");
				const mealsRes = await apiRequest("/meals/my", {
					headers: { Authorization: `Bearer ${token}` },
				});

				const meals = mealsRes.meals || [];

				const totalMeals = meals.length;
				const totalPickups = meals.filter(
					(m) => m.status === "PICKED_UP",
				).length;
				const expired = meals.filter((m) => m.status === "EXPIRED").length;

				setData({
					meals,
					stats: {
						totalMeals,
						totalPickups,
						expiryRate: totalMeals
							? Math.round((expired / totalMeals) * 100)
							: 0,
					},
				});
			} catch (err) {
				console.error("Error fetching SME data:", err);
				setError(err?.message || "Failed to load dashboard");
			} finally {
				setLoading(false);
			}
		};

		fetchSMEData();
	}, []);

	if (loading)
		return <div className={styles.dashboard}>Loading dashboard...</div>;
	if (error)
		return (
			<div className={styles.dashboard}>
				<p style={{ color: "red" }}>Error: {error}</p>
			</div>
		);

	return (
		<div className={styles.dashboard}>
			{/* Header */}
			<div className={styles.header}>
				<h2>Hello, Welcome Back 👋</h2>
				<p className={styles.subtext}>
					Manage your meals and track your impact
				</p>
			</div>

			{/* Stats */}
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

			{/* Create Meal */}
			<div className={styles.section}>
				<h3>Create Meal</h3>
				<form className={styles.form}>
					<input placeholder="Meal Title" required />
					<textarea placeholder="Description" required />
					<input type="number" placeholder="Quantity" min="1" required />
					<input type="datetime-local" required />
					<input placeholder="Pickup Window (e.g. 2pm - 5pm)" />
					<button type="submit">Create Meal</button>
				</form>
			</div>

			{/* Meals List */}
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
								<button className={styles.actionBtn}>Mark Ready</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Impact */}
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
