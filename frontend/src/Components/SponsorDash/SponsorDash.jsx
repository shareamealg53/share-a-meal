import { useEffect, useState } from "react";
import styles from "./SponsorDash.module.css";
import { apiRequest } from "../../api";

export default function SponsorDash() {
	const [data, setData] = useState({
		balance: 0,
		transactions: [],
	});

	const [loading, setLoading] = useState(true);
	const [buyAmount, setBuyAmount] = useState("");
	const [buyLoading, setBuyLoading] = useState(false);
	const [buyError, setBuyError] = useState("");

	/* -------------------------
	FETCH DATA
	------------------------- */
	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await apiRequest("/sponsor/ledger");

				setData({
					balance: res.balance || 0,
					transactions: res.transactions || [],
				});
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	/* -------------------------
	BUY CREDITS HANDLER
	------------------------- */
	const handleBuyCredits = async (e) => {
		e.preventDefault();

		setBuyLoading(true);
		setBuyError("");

		try {
			await apiRequest("/sponsor/credits/buy", {
				method: "POST",
				body: JSON.stringify({ amount: Number(buyAmount) }),
			});

			setBuyAmount("");

			// Refresh data
			const res = await apiRequest("/sponsor/ledger");

			setData({
				balance: res.balance || 0,
				transactions: res.transactions || [],
			});
		} catch (err) {
			setBuyError(err.message || "Failed to buy credits");
		}

		setBuyLoading(false);
	};

	/* -------------------------
	LOADING STATE
	------------------------- */
	if (loading) {
		return <div className={styles.dashboard}>Loading...</div>;
	}

	return (
		<div className={styles.dashboard}>
			<div className={styles.header}>
				<h2>Sponsor Dashboard</h2>
				<p className={styles.subtext}>Support meals & track impact</p>
			</div>

			<div className={styles.statsGrid}>
				<div className={styles.card}>
					<h4>Balance</h4>
					<h2>₦{data.balance}</h2>
				</div>

				<div className={styles.card}>
					<h4>Transactions</h4>
					<h2>{data.transactions.length}</h2>
				</div>
			</div>

			<div className={styles.section}>
				<h3>Recent Transactions</h3>

				{data.transactions.length === 0 ? (
					<div className={styles.empty}>No transactions yet</div>
				) : (
					<ul>
						{data.transactions.slice(0, 5).map((tx) => (
							<li key={tx.id}>
								₦{tx.amount} - {tx.type}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className={styles.section}>
				<h3>Support SME's Meals</h3>
			</div>

			<div className={styles.section}>
				<h3>Buy Credits</h3>

				<form onSubmit={handleBuyCredits} className={styles.form}>
					<input
						type="number"
						min="1"
						placeholder="Amount"
						value={buyAmount}
						onChange={(e) => setBuyAmount(e.target.value)}
						required
					/>

					<button type="submit" disabled={buyLoading}>
						{buyLoading ? "Processing..." : "Buy"}
					</button>
				</form>

				{buyError && <div className={styles.error}>{buyError}</div>}
			</div>
		</div>
	);
}
