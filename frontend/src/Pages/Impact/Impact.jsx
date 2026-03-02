import { useState, useEffect } from "react";
import styles from "./Impact.module.css";
import Header from "../../Components/Header/Header";
import Sidebar from "../../Components/SideBar/SideBar";

export default function Impact() {
	const [metrics, setMetrics] = useState({
		totalMealsShared: 0,
		totalBeneficiaries: 0,
		activeDonors: 0,
		activeNGOs: 0,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchMetrics = async () => {
			try {
				const { apiRequest } = await import("../../api");
				const data = await apiRequest("/metrics");
				setMetrics(data);
			} catch (error) {
				console.error("Failed to load metrics:", error);
				// Show default values if API fails
				setMetrics({
					totalMealsShared: 0,
					totalBeneficiaries: 0,
					activeDonors: 0,
					activeNGOs: 0,
				});
			} finally {
				setLoading(false);
			}
		};

		fetchMetrics();
	}, []);

	if (loading) {
		return <div className={styles.loading}>Loading impact metrics...</div>;
	}

	return (
		<div className={styles.layout}>
			<Sidebar />

			<div className={styles.main}>
				<Header />

				<div className={styles.content}>
					{/* Impact Hero */}
					<div className={styles.hero}>
						<h1>Our Impact</h1>
						<p>Together, we're making a real difference in our communities</p>
					</div>

					{/* Key Metrics */}
					<section className={styles.metricsSection}>
						<h2>Global Impact Metrics</h2>
						<div className={styles.metricsGrid}>
							<div className={styles.metricCard}>
								<h3>Total Meals Shared</h3>
								<div className={styles.metricValue}>
									{metrics.totalMealsShared?.toLocaleString() || 0}
								</div>
								<p>Meals redistributed to those in need</p>
							</div>

							<div className={styles.metricCard}>
								<h3>People Helped</h3>
								<div className={styles.metricValue}>
									{metrics.totalBeneficiaries?.toLocaleString() || 0}
								</div>
								<p>Individuals who received meals</p>
							</div>

							<div className={styles.metricCard}>
								<h3>Active Donors</h3>
								<div className={styles.metricValue}>
									{metrics.activeDonors?.toLocaleString() || 0}
								</div>
								<p>SMEs contributing food</p>
							</div>

							<div className={styles.metricCard}>
								<h3>Partner NGOs</h3>
								<div className={styles.metricValue}>
									{metrics.activeNGOs?.toLocaleString() || 0}
								</div>
								<p>Organizations distributing meals</p>
							</div>
						</div>
					</section>

					{/* Stories Section */}
					<section className={styles.storiesSection}>
						<h2>Success Stories</h2>
						<div className={styles.storiesGrid}>
							<div className={styles.storyCard}>
								<div className={styles.storyImage}>
									<span>📖</span>
								</div>
								<h3>Community First Initiative</h3>
								<p>
									A local restaurant donated over 500 meals in Q4 2025, helping 200+
									families in our area.
								</p>
								<button>Read More</button>
							</div>

							<div className={styles.storyCard}>
								<div className={styles.storyImage}>
									<span>🤝</span>
								</div>
								<h3>Corporate Sponsorship Program</h3>
								<p>
									Major sponsor contributed funds for 1000+ meals, supporting 3 NGOs
									across the region.
								</p>
								<button>Read More</button>
							</div>

							<div className={styles.storyCard}>
								<div className={styles.storyImage}>
									<span>💪</span>
								</div>
								<h3>Volunteer Movement</h3>
								<p>
									Over 50 volunteers helped sort, package, and distribute meals to
									vulnerable populations.
								</p>
								<button>Read More</button>
							</div>
						</div>
					</section>

					{/* Call to Action */}
					<section className={styles.ctaSection}>
						<h2>Be Part of the Change</h2>
						<div className={styles.ctaCards}>
							<div className={styles.ctaCard}>
								<h3>For SMEs</h3>
								<p>Donate your surplus food and make an impact</p>
								<button className={styles.primaryBtn}>Donate Food</button>
							</div>

							<div className={styles.ctaCard}>
								<h3>For NGOs</h3>
								<p>Claim meals for your beneficiaries</p>
								<button className={styles.primaryBtn}>Browse Meals</button>
							</div>

							<div className={styles.ctaCard}>
								<h3>For Sponsors</h3>
								<p>Fund meals and support communities</p>
								<button className={styles.primaryBtn}>Sponsor Now</button>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
