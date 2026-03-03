// src/api.js
// Centralized API service for backend communication

const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(endpoint, options = {}) {
	const url = `${API_URL}${endpoint}`;
	
	// Auto-include Authorization header if token exists
	const token = localStorage.getItem("token");
	const defaultHeaders = {
		"Content-Type": "application/json",
		...(token && { Authorization: `Bearer ${token}` }),
		...options.headers,
	};
	
	const config = {
		...options,
		headers: defaultHeaders,
	};
	
	const response = await fetch(url, config);
	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw { status: response.status, ...error };
	}
	return response.json();
}
