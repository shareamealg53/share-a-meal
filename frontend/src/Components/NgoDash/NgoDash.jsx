import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../NgoDash/NgoDash.module.css";
import { apiRequest } from "../../api";
import NgoNavbar from "./NgoNavbar";

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
		return (
			<div className={styles.dashboard} aria-busy="true" aria-live="polite">
				Loading dashboard...
			</div>
		);
	if (error)
		return (
			<div className={styles.dashboard} role="alert" aria-live="assertive">
				<p style={{ color: "red" }}>Error: {error}</p>
			</div>
		);
	if (!ngo)
		return (
			<div className={styles.dashboard} aria-live="polite">
				No data available
			</div>
		);

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
			<header className={styles.header}>
				<h1 tabIndex="0">Hello, Welcome Back 👋</h1>
				<p className={styles.subtext}>
					{ngo.name} • Operating in {ngo.location.areas.join(" & ")}
				</p>
			</header>
			{/* DASHBOARD CARDS */}
			<section className={styles.statsGrid} aria-label="NGO Stats">
				<div
					className={styles.card}
					tabIndex="0"
					aria-label={`Available Nearby: ${ngo.stats.availableNearby}`}
				>
					<h2>Available Nearby</h2>
					<p className={styles.cardStat}>{ngo.stats.availableNearby}</p>
					<p className={styles.cardSubtext}>Meals you can claim now</p>
				</div>
				<div
					className={`${styles.card} ${styles.greenCard}`}
					tabIndex="0"
					aria-label={`Reserved Meals: ${ngo.stats.reservedMeals}`}
				>
					<h2>Reserved Meals</h2>
					<p className={styles.cardStat}>{ngo.stats.reservedMeals}</p>
					<p className={styles.cardSubtext}>Awaiting pickup</p>
				</div>
				<div
					className={styles.card}
					tabIndex="0"
					aria-label={`Total Meals Saved: ${ngo.stats.totalMealsSaved}`}
				>
					<h2>Total Meals Saved</h2>
					<p className={styles.cardStat}>{ngo.stats.totalMealsSaved}</p>
					<p className={styles.cardSubtext}>Your impact so far</p>
				</div>
			</section>
			{/* RECOMMENDATIONS */}
			<section
				className={styles.recommendSection}
				aria-label="Recommended Meals"
			>
				<div className={styles.recommendHeader}>
					<div className={styles.matchIcon} aria-hidden="true">
						✨
					</div>
					<div>
						<h2 className={styles.recommendTitle}>
							Recommended For You{" "}
							<span
								className={styles.count}
								aria-label={`Count: ${ngo.recommendations.length}`}
							>
								{ngo.recommendations.length}
							</span>
						</h2>
						<p className={styles.matchText}>
							High match — these listings match your capacity and are close to
							your location
						</p>
					</div>
				</div>
				<ul className={styles.recommendations} aria-live="polite">
					{ngo.recommendations.length === 0 ? (
						<li className={styles.empty}>No recommendations at this time.</li>
					) : (
						ngo.recommendations.map((item) => (
							<li key={item.id} className={styles.recommendCard}>
								<h3>{item.title}</h3>
								<p>From: {item.restaurant}</p>
								<p>
									{item.distance} • Prepared {item.preparedTime}
								</p>
								<button
									className={styles.reserveBtn}
									aria-label={`Reserve meal: ${item.title}`}
									disabled={reservingId === item.id}
									aria-busy={reservingId === item.id}
									onClick={() => handleReserve(item.id)}
								>
									{reservingId === item.id ? "Reserving..." : "Reserve Now"}
								</button>
							</li>
						))
					)}
				</ul>
			</section>
			{/* IMPACT DASHBOARD */}
			<section className={styles.section} aria-label="Your Impact">
				<h2>Your Impact</h2>
				<ul className={styles.impactStats}>
					<li>
						<strong>Meals Saved:</strong> {ngo.stats.totalMealsSaved}
					</li>
					<li>
						<strong>Reserved Meals:</strong> {ngo.stats.reservedMeals}
					</li>
					<li>
						<strong>Available Nearby:</strong> {ngo.stats.availableNearby}
					</li>
				</ul>
			</section>
		</div>
	);
}
