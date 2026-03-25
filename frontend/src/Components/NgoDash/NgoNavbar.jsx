import { Link, useNavigate } from "react-router-dom";
import styles from "./NgoDash.module.css";

export default function NgoNavbar({ ngoName }) {
	const navigate = useNavigate();

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("orgName");
		navigate("/login");
	};

	return (
		<nav className={styles.navbar} aria-label="NGO main navigation">
			<div className={styles.logoSection}>
				<Link to="/ngo" className={styles.logo}>
					🍽️ Share-A-Meal
				</Link>
				<span className={styles.greeting}>Hi, {ngoName || "NGO"}!</span>
			</div>
			<ul className={styles.navLinks}>
				<li>
					<Link to="/ngo" className={styles.link}>
						Dashboard
					</Link>
				</li>
				<li>
					<Link to="/ngo/claims" className={styles.link}>
						My Claims
					</Link>
				</li>
				<li>
					<Link to="/ngo/profile" className={styles.link}>
						Profile
					</Link>
				</li>
			</ul>
			<button
				className={styles.logoutBtn}
				onClick={handleLogout}
				aria-label="Logout"
			>
				Logout
			</button>
		</nav>
	);
}
