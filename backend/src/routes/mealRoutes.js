const express = require("express");
const {
	createMeal,
	getAllMeals,
	getMealById,
	getMyMeals,
	updateMeal,
	deleteMeal,
	getMealsByStatus,
} = require("../controllers/mealController");

const {
	authenticate,
	requireRole,
	// ...existing code...
} = require("../middleware/auth");

const { validateIdParam } = require("../middleware/validate");

const router = express.Router();

/**
 * CREATE MEAL (SME ONLY)
 */
router.post("/", authenticate, requireRole("sme"), createMeal);

/**
 * GET CURRENT USER'S MEALS (SME)
 * ✅ MUST COME BEFORE /:mealId
 */
router.get("/my", authenticate, requireRole("sme"), getMyMeals);

/**
 * GET MEALS BY STATUS
 */
router.get("/status/:status", getMealsByStatus);

/**
 * GET ALL MEALS
 */
router.get("/", getAllMeals);

/**
 * GET SINGLE MEAL
 */
router.get("/:mealId", validateIdParam("mealId"), getMealById);

/**
 * UPDATE MEAL
 */
router.patch(
	"/:mealId",
	validateIdParam("mealId"),
	authenticate,
	requireRole("sme"),
	updateMeal,
);

/**
 * DELETE MEAL
 */
router.delete(
	"/:mealId",
	validateIdParam("mealId"),
	authenticate,
	requireRole("sme"),
	deleteMeal,
);

module.exports = router;
