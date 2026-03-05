import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Components/Layout/Layout";
import NgoDash from "./Components/NgoDash/NgoDash";
import HomePage from "./Pages/HomePage/HomePage";
import Signup from "./Pages/Signup/Signup";
import Login from "./Pages/Login/Login";
import VerifyEmail from "./Pages/VerifyEmail/VerifyEmail";
import "./Theme/Global.css";
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

function ProtectedRoute({ children, allowedRoles = [] }) {
	const token = localStorage.getItem("token");
	const role = (localStorage.getItem("role") || "").toLowerCase();

	if (!token) {
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
			</Route>
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
		</Routes>
	);
}

export default App;
