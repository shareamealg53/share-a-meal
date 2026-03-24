const express = require("express");

const {
	claimMeal,
	getMyClaims,
	cancelClaim,
	markPickupReady,
	confirmPickup,
	confirmCompletion,
} = require("../controllers/claimController");

const { authenticate, requireRole } = require("../middleware/auth");
const { validateIdParam } = require("../middleware/validate");

const router = express.Router();

router.post(
	"/meal/:mealId",
	validateIdParam("mealId"),
	authenticate,
	requireRole("ngo"),
	claimMeal,
);

router.get("/my", authenticate, requireRole("ngo"), getMyClaims);

router.patch(
	"/:claimId/cancel",
	validateIdParam("claimId"),
	authenticate,
	requireRole("ngo"),
	cancelClaim,
);

router.patch(
	"/meal/:mealId/ready",
	validateIdParam("mealId"),
	authenticate,
	requireRole("sme"),
	markPickupReady,
);

router.patch(
	"/:claimId/pickup",
	validateIdParam("claimId"),
	authenticate,
	requireRole("ngo"),
	confirmPickup,
);

router.patch(
	"/:claimId/complete",
	validateIdParam("claimId"),
	authenticate,
	requireRole("ngo"),
	confirmCompletion,
);

module.exports = router;
