import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../NgoDash/NgoDash.module.css";
import { apiRequest } from "../../api";

export default function NgoDash() {
	const [ngo, setNgo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [reservingId, setReservingId] = useState(null);
	const navigate = useNavigate();

	const fetchNGOData = useCallback(async () => {
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
						mealsRes.meals?.filter((m) => m.status === "AVAILABLE").length || 0,
					reservedMeals:
						claimsRes.claims?.filter((c) => c.status === "CLAIMED").length || 0,
					totalMealsSaved: claimsRes.claims?.length || 0,
				},
				recommendations:
					mealsRes.meals?.slice(0, 5).map((meal) => ({
						id: meal.id,
						title: meal.title,
						restaurant: meal.restaurant_name || "SME",
						distance: "2.5 km", // TODO: Replace with real distance if available
						preparedTime: "15 mins ago", // TODO: Replace with real time if available
					})) || [],
			};
			setNgo(ngoData);
		} catch (err) {
			if (err?.status === 401 || err?.status === 403) {
				navigate("/login");
				return;
			}
			console.error("Error fetching NGO data:", err);
			setError(err?.message || "Failed to load dashboard");
		} finally {
			setLoading(false);
		}
	}, [navigate]);

	useEffect(() => {
		fetchNGOData();
	}, [fetchNGOData]);

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
		setReservingId(mealId);
		try {
			const token = localStorage.getItem("token");
			await apiRequest(`/claims/meal/${mealId}`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			alert("Meal reserved!");
			await fetchNGOData();
		} catch (err) {
			if (err?.status === 401 || err?.status === 403) {
				navigate("/login");
				return;
			}
			alert("Failed to reserve meal: " + (err?.message || "Unknown error"));
		} finally {
			setReservingId(null);
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
			{/* DASHBOARD CARDS */}
			<div className={styles.statsGrid}>
				<div className={styles.card}>
					<h4>Available Nearby</h4>
					<h2>{ngo.stats.availableNearby}</h2>
					<p className={styles.cardSubtext}>Meals you can claim now</p>
				</div>
				<div className={`${styles.card} ${styles.greenCard}`}>
					<h4>Reserved Meals</h4>
					<h2>{ngo.stats.reservedMeals}</h2>
					<p className={styles.cardSubtext}>Awaiting pickup</p>
				</div>
				<div className={styles.card}>
					<h4>Total Meals Saved</h4>
					<h2>{ngo.stats.totalMealsSaved}</h2>
					<p className={styles.cardSubtext}>Your impact so far</p>
				</div>
			</div>
			{/* RECOMMENDATIONS */}
			<div className={styles.recommendHeader}>
				<div className={styles.matchIcon}>✨</div>
				<div>
					<h3 className={styles.recommendTitle}>
						Recommended For You{" "}
						<span className={styles.count}>{ngo.recommendations.length}</span>
					</h3>
					<p className={styles.matchText}>
						High match — these listings match your capacity and are close to
						your location
					</p>
				</div>
			</div>
			<div className={styles.recommendations}>
				{ngo.recommendations.length === 0 ? (
					<div className={styles.empty}>No recommendations at this time.</div>
				) : (
					ngo.recommendations.map((item) => (
						<div key={item.id} className={styles.recommendCard}>
							<h4>{item.title}</h4>
							<p>From: {item.restaurant}</p>
							<p>
								{item.distance} • Prepared {item.preparedTime}
							</p>
							<button
								className={styles.reserveBtn}
								disabled={reservingId === item.id}
								onClick={() => handleReserve(item.id)}
							>
								{reservingId === item.id ? "Reserving..." : "Reserve Now"}
							</button>
						</div>
					))
				)}
			</div>
			{/* IMPACT DASHBOARD */}
			<div className={styles.section}>
				<h3>Your Impact</h3>
				<div className={styles.impactStats}>
					<div>
						<strong>Meals Saved:</strong> {ngo.stats.totalMealsSaved}
					</div>
					<div>
						<strong>Reserved Meals:</strong> {ngo.stats.reservedMeals}
					</div>
					<div>
						<strong>Available Nearby:</strong> {ngo.stats.availableNearby}
					</div>
				</div>
			</div>
		</div>
	);
}
