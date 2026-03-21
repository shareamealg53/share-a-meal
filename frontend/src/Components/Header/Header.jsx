import styles from "./Header.module.css";

export default function Header({ user }) {
	// Fallbacks for name and role
	const displayName =
		user?.name ||
		(user?.role === "ngo"
			? "NGO Account"
			: user?.role === "sme"
				? "SME Account"
				: user?.role === "sponsor"
					? "Sponsor Account"
					: "User");

	const displayRole =
		user?.role === "ngo"
			? "NGO Account"
			: user?.role === "sme"
				? "SME Account"
				: user?.role === "sponsor"
					? "Sponsor Account"
					: "User";

	return (
		<div className={styles.header}>
			{/* LEFT SIDE */}
			<div className={styles.left}>
				<h2 className={styles.greeting}></h2>
				<p className={styles.subtext}></p>
			</div>

			{/* RIGHT SIDE */}
			<div className={styles.right}>
				<div className={styles.notification}>🔔</div>
				<div className={styles.profile}>
					<div className={styles.avatar}>{displayName.charAt(0)}</div>
					<div>
						<p className={styles.profileName}>{displayName}</p>
						<span className={styles.accountType}>{displayRole}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
