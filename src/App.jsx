import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Components/Layout/Layout";
import NgoDash from "./Components/NgoDash/NgoDash";
import HomePage from "./Pages/HomePage/HomePage";
import Signup from "./Pages/Signup/Signup";
import Login from "./Pages/Login/Login";

import "./Theme/Global.css";
import SmeDash from "./Components/SmeDash/SmeDash";
import DashLayout from "./Components/DashLayout/DashLayout";



function App() {
	const user = { type: "ngo", name: "Hope Alive NGO" };
	return (
		<Routes>
			<Route path="/" element={<Layout />}>
				<Route index element={<HomePage />} />
				<Route path="/signup" element={<Signup />} />
				<Route path="/login" element={<Login />} />
				<Route path="/ngo" element={<NgoDash />} />
			</Route>
			<Route path="/dashboard" element={<DashLayout user={user} />} />
			<Route path="/sme" element={<SmeDash />} />
		</Routes>
	);


}



export default App;
