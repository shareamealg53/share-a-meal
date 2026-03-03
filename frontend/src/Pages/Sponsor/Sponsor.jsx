import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Sponsor.module.css";
import Header from "../../Components/Header/Header"
import Sidebar from "../../Components/SideBar/SideBar"
import { apiRequest } from "../../api";

export default function Dashboard() {
  const [sponsorships, setSponsorships] = useState({ my: [], impact: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSponsorData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const [myRes, impactRes] = await Promise.all([
          apiRequest("/sponsorships/my", { headers: { Authorization: `Bearer ${token}` } }),
          apiRequest("/sponsorships/impact", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setSponsorships({
          my: myRes.sponsorships || [],
          impact: impactRes.metrics || {},
        });
      } catch (err) {
        console.error("Error fetching sponsor data:", err);
        setError(err?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchSponsorData();
  }, [navigate]);

  if (loading) return <div style={{ padding: "20px" }}>Loading sponsor dashboard...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>;
  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.main}>
        <Header />

        <div className={styles.content}>
          {/* Welcome Section */}
          <div className={styles.welcome}>
            <h2>Hello, Welcome Back</h2>
            <p>Make an impact by sponsoring food for those in need</p>
          </div>

          {/* Top Cards */}
          <div className={styles.topCards}>
            <div className={styles.tokenCard}>
              <h3>Token Balance</h3>
              <h1>1,250</h1>
              <p>+125 meals equivalent</p>
              <button>Buy Tokens</button>
            </div>

            <div className={styles.sponsorCard}>
              <h3>Sponsor a Meal Instantly</h3>
              <div className={styles.mealButtons}>
                <button>1 Meal</button>
                <button>5 Meals</button>
                <button>10 Meals</button>
                <button>Custom</button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <div>
              <h4>Active Campaigns</h4>
              <h2>{sponsorships.my?.length || 0}</h2>
            </div>

            <div>
              <h4>Meals Funded</h4>
              <h2>{sponsorships.impact?.mealsSponored || 0}</h2>
            </div>

            <div>
              <h4>Total Impact</h4>
              <h2>${sponsorships.impact?.totalAmountSponsored || 0}</h2>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className={styles.aiSection}>
            <h3>AI Match Suggestions</h3>
            <div className={styles.suggestion}>
              Emergency Food Relief needs urgent support for 200 displaced families
            </div>
            <div className={styles.suggestion}>
              School Lunch Program is 27% funded — help reach 150 students
            </div>
            <div className={styles.suggestion}>
              Your tokens can make an immediate impact during peak meal distribution hours
            </div>
          </div>

          {/* Recommended Campaigns */}
          <div className={styles.recommended}>
            <h3>Recommended Campaigns</h3>

            <div className={styles.campaignGrid}>
              <div className={styles.campaignCard}>
                <h4>Emergency Food Relief - Yaba</h4>
                <p>Support urgent distribution to 200 families affected by flooding</p>
                <progress value="40" max="100"></progress>
              </div>

              <div className={styles.campaignCard}>
                <h4>School Lunch Program - Surulere</h4>
                <p>Fund daily lunch for 150 students</p>
                <progress value="42" max="100"></progress>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className={styles.bottomSection}>
            <div className={styles.recentImpact}>
              <h3>Recent Impact</h3>
              <div className={styles.impactCard}>
                <strong>10 Meals</strong>
                <p>Hope Alive NGO | Yaba, Lagos</p>
              </div>
              <div className={styles.impactCard}>
                <strong>5 Meals</strong>
                <p>Community Kitchen | Ikeja, Lagos</p>
              </div>
            </div>

            <div className={styles.monthImpact}>
              <h3>Your Impact This Month</h3>
              <p>Meals Sponsored: <strong>248</strong></p>
              <p>People Helped: <strong>187</strong></p>
              <p>Campaigns Supported: <strong>8</strong></p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}