import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Components/Layout/Layout";
import NgoDash from "./Components/NgoDash/NgoDash";
import HomePage from "./Pages/HomePage/HomePage";
import Signup from "./Pages/Signup/Signup";
import Login from "./Pages/Login/Login";
import VerifyEmail from "./Pages/VerifyEmail/VerifyEmail";
import "./Theme/Global.css";
import { jwtDecode } from "jwt-decode";
// import SmeDash from "./Components/SmeDash/SmeDash";
import DashLayout from "./Components/DashLayout/DashLayout";
import Sponsor from "./Pages/Sponsor/Sponsor";

const getDefaultRouteByRole = (role) => {
	switch ((role || "").toLowerCase()) {
		case "sme":
			return "/sme";
		case "ngo":
			return "/ngo";
		case "sponsor":
			return "/sponsor";
		default:
			return "/dashboard";
	}
};

const clearAuthStorage = () => {
	localStorage.removeItem("token");
	localStorage.removeItem("role");
	localStorage.removeItem("orgName");
};

const isTokenActive = (token) => {
	if (!token) return false;
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return false;

		const payload = jwtDecode(token);
		if (!payload.exp) return true;
		return payload.exp * 1000 > Date.now();
	} catch {
		return false;
	}
};

function ProtectedRoute({ children, allowedRoles = [] }) {
	const token = localStorage.getItem("token");
	const role = (localStorage.getItem("role") || "").toLowerCase();

	if (!token || !isTokenActive(token)) {
		clearAuthStorage();
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
		return <Navigate to={getDefaultRouteByRole(role)} replace />;
	}

	return children;
}

function App() {
	return (
		<Routes>
			<Route path="/" element={<Layout />}>
				<Route index element={<HomePage />} />
				<Route path="/signup" element={<Signup />} />
				<Route path="/login" element={<Login />} />
				<Route path="/verify/:token" element={<VerifyEmail />} />
				<Route
					path="/ngo"
					element={
						<ProtectedRoute allowedRoles={["ngo"]}>
							<NgoDash />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/sponsor"
					element={
						<ProtectedRoute allowedRoles={["sponsor"]}>
							<Sponsor />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/sme"
					element={
						<ProtectedRoute allowedRoles={["sme"]}>
							<DashLayout />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<DashLayout />
						</ProtectedRoute>
					}
				/>
			</Route>
		</Routes>
	);
}

export default App;
