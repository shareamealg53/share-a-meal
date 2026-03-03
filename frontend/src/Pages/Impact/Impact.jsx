import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import styles from "./Impact.module.css";

export default function Impact() {
  const [metrics, setMetrics] = useState({
    overall: null,
    status: null,
    smes: [],
    ngos: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [overallRes, statusRes, smesRes, ngosRes] = await Promise.all([
          apiRequest("/metrics"),
          apiRequest("/metrics/status"),
          apiRequest("/metrics/smes"),
          apiRequest("/metrics/ngos"),
        ]);

        setMetrics({
          overall: overallRes,
          status: statusRes.breakdown,
          smes: smesRes.smess || [],
          ngos: ngosRes.ngos || [],
        });
      } catch (err) {
        console.error("Error fetching metrics:", err);
        setError(err?.message || "Failed to load impact data");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) return <div style={{ padding: "20px" }}>Loading impact metrics...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>;

  const overall = metrics.overall || {};
  const status = metrics.status || {};

  return (
    <div style={{ padding: "40px 20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>Our Impact</h1>

      {/* Overall Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "40px",
      }}>
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Total Meals Shared</h3>
          <h2 style={{ fontSize: "2.5rem", color: "#2ecc71" }}>
            {overall.total_meals || 0}
          </h2>
        </div>
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Active SMEs</h3>
          <h2 style={{ fontSize: "2.5rem", color: "#3498db" }}>
            {overall.sme_count || 0}
          </h2>
        </div>
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Active NGOs</h3>
          <h2 style={{ fontSize: "2.5rem", color: "#e74c3c" }}>
            {overall.ngo_count || 0}
          </h2>
        </div>
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Active Sponsors</h3>
          <h2 style={{ fontSize: "2.5rem", color: "#f39c12" }}>
            {overall.sponsor_count || 0}
          </h2>
        </div>
      </div>

      {/* Meal Status Breakdown */}
      <div style={{ marginBottom: "40px" }}>
        <h2>Meal Status Breakdown</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "15px",
        }}>
          {Object.entries(status).map(([statusType, count]) => (
            <div key={statusType} style={{
              padding: "15px",
              background: "#f8f9fa",
              borderRadius: "6px",
              textAlign: "center",
            }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#666" }}>
                {statusType}
              </p>
              <h3 style={{ margin: "0", fontSize: "1.8rem" }}>{count}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Success Story Placeholder */}
      <div style={{ marginTop: "40px", padding: "20px", background: "#f0f8ff", borderRadius: "8px" }}>
        <h2>Success Stories</h2>
        <p>\ud83c\udf1f Join thousands making an impact. Every meal shared builds hope.</p>
      </div>
    </div>
  );
}
