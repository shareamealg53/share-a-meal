const pool = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const logMealStatusChange = async (mealId, fromStatus, toStatus, note) => {
	try {
		await pool.query(
			"INSERT INTO meal_logs (meal_id, changed_by_id, from_status, to_status, note) VALUES (?, ?, ?, ?, ?)",
			[mealId, null, fromStatus, toStatus, note],
		);
	} catch (error) {
		console.error("Error logging meal status:", error);
	}
};

const getMealForAI = async (req, res, next) => {
	try {
		const { mealId } = req.params;

		const [meals] = await pool.query(
			`SELECT id, title, description, quantity, unit, prepared_at, expiry_at, status 
             FROM meals 
             WHERE id = ?`,
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		const meal = meals[0];

		res.json({
			message: "Meal data retrieved for AI processing",
			meal,
		});
	} catch (error) {
		next(error);
	}
};

const getMealsForAI = async (req, res, next) => {
	try {
		const { status } = req.query;

		let query = `SELECT id, title, description, quantity, unit, prepared_at, expiry_at, status 
                     FROM meals WHERE expiry_at IS NULL`;
		const params = [];

		if (status) {
			query += ` AND status = ?`;
			params.push(status);
		}

		query += ` ORDER BY prepared_at ASC LIMIT 50`;

		const [meals] = await pool.query(query, params);

		res.json({
			message: "Meals retrieved for batch AI processing",
			count: meals.length,
			meals,
		});
	} catch (error) {
		next(error);
	}
};

const setMealExpiry = async (req, res, next) => {
	try {
		const { mealId } = req.params;

		const { expiry_at } = req.body;

		if (!expiry_at) {
			throw new AppError("expiry_at is required", 400, "VALIDATION_ERROR", {
				field: "expiry_at",
			});
		}

		const expiryDate = new Date(expiry_at);
		if (isNaN(expiryDate.getTime())) {
			throw new AppError("Invalid expiry_at format", 400, "INVALID_FORMAT", {
				field: "expiry_at",
				expected: "ISO 8601 datetime",
			});
		}

		const [meals] = await pool.query(
			"SELECT id, status, expiry_at FROM meals WHERE id = ?",
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		const meal = meals[0];

		if (meal.expiry_at) {
			throw new AppError(
				"Expiry time already set for this meal",
				409,
				"CONFLICT",
				{ current_expiry: meal.expiry_at },
			);
		}

		await pool.query("UPDATE meals SET expiry_at = ? WHERE id = ?", [
			expiry_at,
			mealId,
		]);

		await logMealStatusChange(
			mealId,
			meal.status,
			meal.status,
			`Expiry timestamp set by AI: ${expiry_at}`,
		);

		res.json({
			message: "Meal expiry timestamp set successfully",
			mealId,
			expiry_at,
		});
	} catch (error) {
		next(error);
	}
};

const updateMealExpiry = async (req, res, next) => {
	try {
		const { mealId } = req.params;

		const { expiry_at } = req.body;

		if (!expiry_at) {
			throw new AppError("expiry_at is required", 400, "VALIDATION_ERROR", {
				field: "expiry_at",
			});
		}

		const expiryDate = new Date(expiry_at);
		if (isNaN(expiryDate.getTime())) {
			throw new AppError("Invalid expiry_at format", 400, "INVALID_FORMAT", {
				field: "expiry_at",
				expected: "ISO 8601 datetime",
			});
		}

		const [meals] = await pool.query(
			"SELECT id, status, expiry_at FROM meals WHERE id = ?",
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		const meal = meals[0];
		const oldExpiry = meal.expiry_at;

		await pool.query("UPDATE meals SET expiry_at = ? WHERE id = ?", [
			expiry_at,
			mealId,
		]);

		await logMealStatusChange(
			mealId,
			meal.status,
			meal.status,
			`Expiry timestamp updated by AI: ${oldExpiry} → ${expiry_at}`,
		);

		res.json({
			message: "Meal expiry timestamp updated successfully",
			mealId,
			old_expiry: oldExpiry,
			new_expiry: expiry_at,
		});
	} catch (error) {
		next(error);
	}
};

const updateMealFoodStatus = async (req, res, next) => {
	try {
		const { mealId } = req.params;
		const { food_status } = req.body;

		if (!food_status) {
			throw new AppError("food_status is required", 400, "VALIDATION_ERROR", {
				field: "food_status",
			});
		}

		if (!["Fresh", "Moderate", "Spoiled"].includes(food_status)) {
			throw new AppError("Invalid food_status", 400, "INVALID_PARAM", {
				field: "food_status",
				value: food_status,
				allowed: ["Fresh", "Moderate", "Spoiled"],
			});
		}

		const [meals] = await pool.query(
			"SELECT id, food_status as old_status FROM meals WHERE id = ?",
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		const meal = meals[0];

		await pool.query("UPDATE meals SET food_status = ? WHERE id = ?", [
			food_status,
			mealId,
		]);

		await logMealStatusChange(
			mealId,
			"",
			"",
			`Food status updated by AI: ${meal.old_status} → ${food_status}`,
		);

		res.json({
			message: "Meal food status updated successfully",
			mealId,
			old_status: meal.old_status,
			new_status: food_status,
		});
	} catch (error) {
		next(error);
	}
};

const predictMealFoodStatus = async (req, res, next) => {
	try {
		const { mealId } = req.params;
		const { features } = req.body;

		if (!features || !Array.isArray(features)) {
			throw new AppError(
				"features array is required",
				400,
				"VALIDATION_ERROR",
				{ field: "features", expected: "number[]" },
			);
		}

		const [meals] = await pool.query(
			"SELECT id, title, status FROM meals WHERE id = ?",
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		// Try to call ML service
		try {
			const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ features }),
			});

			if (!mlResponse.ok) {
				throw new Error(`ML service error: ${mlResponse.status}`);
			}

			const prediction = await mlResponse.json();

			res.json({
				message: "Food status prediction generated",
				mealId,
				prediction: prediction.predictions[0],
				features,
			});
		} catch (mlError) {
			console.error("ML Service error:", mlError);
			throw new AppError(
				"ML prediction service unavailable",
				503,
				"SERVICE_ERROR",
				{ service: "ml-model-service" },
			);
		}
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getMealForAI,
	getMealsForAI,
	setMealExpiry,
	updateMealExpiry,
	updateMealFoodStatus,
	predictMealFoodStatus,
};
