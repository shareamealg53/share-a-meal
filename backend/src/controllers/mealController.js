const pool = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

const createMeal = async (req, res, next) => {
	try {
		const {
			title,
			description,
			quantity,
			unit,
			prepared_at,
			storage_type,
			food_type,
			food_status,
		} = req.body;

		if (!title || !quantity || !unit || !prepared_at) {
			throw new AppError("Missing required fields", 400, "VALIDATION_ERROR", {
				fields: ["title", "quantity", "unit", "prepared_at"],
			});
		}

		const numericQuantity = Number(quantity);
		if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
			throw new AppError("Invalid quantity", 400, "VALIDATION_ERROR", {
				field: "quantity",
				value: quantity,
			});
		}

		if (
			![
				"kg",
				"servings",
				"packs",
				"loaves",
				"pieces",
				"boxes",
				"trays",
				"bags",
			].includes(unit)
		) {
			throw new AppError("Invalid unit", 400, "INVALID_PARAM", {
				field: "unit",
				value: unit,
			});
		}

		if (
			storage_type &&
			!["Room Temperature", "Refrigerated"].includes(storage_type)
		) {
			throw new AppError("Invalid storage_type", 400, "INVALID_PARAM", {
				field: "storage_type",
				value: storage_type,
			});
		}

		if (
			food_type &&
			!["Bread", "Rice", "Pastries", "Soup", "Beans", "Others"].includes(
				food_type,
			)
		) {
			throw new AppError("Invalid food_type", 400, "INVALID_PARAM", {
				field: "food_type",
				value: food_type,
			});
		}

		if (
			food_status &&
			!["Fresh", "Moderate", "Spoiled"].includes(food_status)
		) {
			throw new AppError("Invalid food_status", 400, "INVALID_PARAM", {
				field: "food_status",
				value: food_status,
			});
		}

		const restaurant_id = req.user.id;

		const [result] = await pool.query(
			"INSERT INTO meals (restaurant_id, title, description, quantity, unit, storage_type, food_type, food_status, prepared_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[
				restaurant_id,
				title,
				description,
				quantity,
				unit,
				storage_type || null,
				food_type || null,
				food_status || null,
				prepared_at,
			],
		);

		res.status(201).json({
			message: "Meal created successfully",
			mealId: result.insertId,
			meal: {
				id: result.insertId,
				restaurant_id,
				title,
				quantity,
				unit,
				food_type: food_type || null,
				status: "AVAILABLE",
			},
		});
	} catch (error) {
		next(error);
	}
};

const getAllMeals = async (req, res, next) => {
	try {
		const [meals] = await pool.query(
			`SELECT m.*, u.organization_name as restaurant_name, rp.business_type
         FROM meals m 
         LEFT JOIN users u ON m.restaurant_id = u.id 
         LEFT JOIN restaurant_profiles rp ON m.restaurant_id = rp.user_id
         ORDER BY m.created_at DESC`,
		);

		res.json({
			message: "All meals retrieved",
			count: meals.length,
			meals,
		});
	} catch (error) {
		next(error);
	}
};

const getMealsByStatus = async (req, res, next) => {
	try {
		const { status } = req.params;

		const validStatuses = [
			"AVAILABLE",
			"CLAIMED",
			"PICKUP_READY",
			"PICKED_UP",
			"COMPLETED",
			"EXPIRED",
			"CANCELLED",
		];

		if (!validStatuses.includes(status)) {
			throw new AppError("Invalid status", 400, "INVALID_PARAM", {
				field: "status",
				value: status,
				allowed: validStatuses,
			});
		}

		const [meals] = await pool.query(
			`SELECT m.*, u.organization_name as restaurant_name, rp.business_type
         FROM meals m 
         LEFT JOIN users u ON m.restaurant_id = u.id 
         LEFT JOIN restaurant_profiles rp ON m.restaurant_id = rp.user_id
         WHERE m.status = ? 
         ORDER BY m.created_at DESC`,
			[status],
		);

		res.json({
			message: `Meals with status ${status} retrieved`,
			count: meals.length,
			meals,
		});
	} catch (error) {
		next(error);
	}
};

const getMealById = async (req, res, next) => {
	try {
		const { mealId } = req.params;

		const [meals] = await pool.query(
			`SELECT m.*, u.organization_name as restaurant_name, u.email as restaurant_email, rp.business_type
         FROM meals m 
         LEFT JOIN users u ON m.restaurant_id = u.id 
         LEFT JOIN restaurant_profiles rp ON m.restaurant_id = rp.user_id
         WHERE m.id = ?`,
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		res.json({
			message: "Meal retrieved",
			meal: meals[0],
		});
	} catch (error) {
		next(error);
	}
};

const getMyMeals = async (req, res, next) => {
	try {
		const restaurant_id = req.user.id;

		const [meals] = await pool.query(
			`SELECT m.*, rp.business_type FROM meals m 
         LEFT JOIN restaurant_profiles rp ON m.restaurant_id = rp.user_id
         WHERE m.restaurant_id = ? 
         ORDER BY m.created_at DESC`,
			[restaurant_id],
		);

		res.json({
			message: "Your meals retrieved",
			count: meals.length,
			meals,
		});
	} catch (error) {
		next(error);
	}
};

const allowedFields = {
	title: "title",
	description: "description",
	quantity: "quantity",
	unit: "unit",
	status: "status",
};

const updateMeal = async (req, res, next) => {
	try {
		const { mealId } = req.params;
		const updates = req.body;

		// Add this block for quantity validation
		if (updates.quantity !== undefined) {
			const numericQuantity = Number(updates.quantity);
			if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
				throw new AppError("Invalid quantity", 400, "VALIDATION_ERROR", {
					field: "quantity",
					value: updates.quantity,
				});
			}
		}

		// Validate fields
		const fields = [];
		const values = [];

		for (const key of Object.keys(updates)) {
			if (allowedFields[key] !== undefined && updates[key] !== undefined) {
				fields.push(`${allowedFields[key]} = ?`);
				values.push(updates[key]);
			}
		}

		if (fields.length === 0) {
			throw new AppError("No fields to update", 400, "VALIDATION_ERROR");
		}

		const [meals] = await pool.query(
			"SELECT restaurant_id FROM meals WHERE id = ?",
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		const meal = meals[0];

		if (meal.restaurant_id !== req.user.id) {
			throw new AppError("Forbidden", 403, "FORBIDDEN");
		}

		values.push(mealId);

		await pool.query(
			`UPDATE meals SET ${fields.join(", ")} WHERE id = ?`,
			values,
		);

		res.json({ message: "Meal updated successfully" });
	} catch (error) {
		next(error);
	}
};

const deleteMeal = async (req, res, next) => {
	try {
		const { mealId } = req.params;

		const [meals] = await pool.query(
			"SELECT restaurant_id, status FROM meals WHERE id = ?",
			[mealId],
		);

		if (meals.length === 0) {
			throw new AppError("Meal not found", 404, "NOT_FOUND", {
				resource: "meal",
				id: mealId,
			});
		}

		const meal = meals[0];

		if (meal.restaurant_id !== req.user.id) {
			throw new AppError(
				"You can only delete your own meals",
				403,
				"FORBIDDEN",
				{ reason: "not_owner" },
			);
		}

		const deletableStatus = ["AVAILABLE", "EXPIRED", "CANCELLED"];
		if (!deletableStatus.includes(meal.status)) {
			throw new AppError(
				`Cannot delete meal with status ${meal.status}`,
				400,
				"INVALID_STATE",
				{ current_status: meal.status, allowed: deletableStatus },
			);
		}

		await pool.query("DELETE FROM meals WHERE id = ?", [mealId]);

		res.json({
			message: "Meal deleted successfully",
			mealId,
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createMeal,
	getAllMeals,
	getMealsByStatus,
	getMealById,
	getMyMeals,
	updateMeal,
	deleteMeal,
};
