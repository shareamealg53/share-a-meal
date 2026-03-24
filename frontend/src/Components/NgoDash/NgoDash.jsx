import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../NgoDash/NgoDash.module.css";
import { apiRequest } from "../../api";

export default function NgoDash() {
	const [ngo, setNgo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchNGOData = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					navigate("/login");
					return;
				}

				const [mealsRes, claimsRes] = await Promise.all([
					apiRequest("/meals", {
						headers: { Authorization: `Bearer ${token}` },
					}),
					apiRequest("/claims/my", {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);

				const ngoData = {
					name: localStorage.getItem("orgName") || "NGO Name",
					location: { areas: ["Lagos", "Abuja"] },
					stats: {
						availableNearby:
							mealsRes.meals?.filter((m) => m.status === "AVAILABLE").length ||
							0,
						reservedMeals:
							claimsRes.claims?.filter((c) => c.status === "CLAIMED").length ||
							0,
						totalMealsSaved: claimsRes.claims?.length || 0,
					},
					recommendations:
						mealsRes.meals?.slice(0, 5).map((meal) => ({
							id: meal.id,
							title: meal.title,
							restaurant: meal.restaurant_name || "SME",
							distance: "2.5 km",
							preparedTime: "15 mins ago",
						})) || [],
				};
				setNgo(ngoData);
			} catch (err) {
				console.error("Error fetching NGO data:", err);
				setError(err?.message || "Failed to load dashboard");
			} finally {
				setLoading(false);
			}
		};

		fetchNGOData();
	}, [navigate]);

	if (loading)
		return <div className={styles.dashboard}>Loading dashboard...</div>;
	if (error)
		return (
			<div className={styles.dashboard}>
				<p style={{ color: "red" }}>Error: {error}</p>
			</div>
		);
	if (!ngo) return <div className={styles.dashboard}>No data available</div>;

	const handleReserve = async (mealId) => {
		try {
			const token = localStorage.getItem("token");
			await apiRequest(`/claims/meal/${mealId}`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			// Optionally, refresh data or show a success message
			alert("Meal reserved!");
		} catch (err) {
			alert("Failed to reserve meal: " + (err?.message || "Unknown error"));
		}
	};

	return (
		<div className={styles.dashboard}>
			<div className={styles.header}>
				<h2>Hello, Welcome Back 👋</h2>
				<p className={styles.subtext}>
					{ngo.name} • Operating in {ngo.location.areas.join(" & ")}
				</p>
			</div>
			<div className={styles.statsGrid}>
				<div className={styles.card}>
					<h4>Available Nearby</h4>
					<h2>{ngo.stats.availableNearby}</h2>
				</div>

				<div className={`${styles.card} ${styles.greenCard}`}>
					<h4>Reserved Meals</h4>
					<h2>{ngo.stats.reservedMeals}</h2>
				</div>

				<div className={styles.card}>
					<h4>Total Meals Saved</h4>
					<h2>{ngo.stats.totalMealsSaved}</h2>
				</div>
			</div>
			<div className={styles.recommendHeader}>
				<div className={styles.matchIcon}>✨</div>
				<div>
					<h3 className={styles.recommendTitle}>
						Recommended For You <span className={styles.count}>2</span>
					</h3>
					<p className={styles.matchText}>
						High match — these listings match your capacity and are close to
						your location
					</p>
				</div>
			</div>

			<div className={styles.recommendations}>
				{ngo.recommendations.map((item) => (
					<div key={item.id} className={styles.recommendCard}>
						<h4>{item.title}</h4>
						<p>From: {item.restaurant}</p>
						<p>
							{item.distance} • Prepared {item.preparedTime}
						</p>
						<button
							className={styles.reserveBtn}
							onClick={() => handleReserve(item.id)}
						>
							Reserve Now
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
