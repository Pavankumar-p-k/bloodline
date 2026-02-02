const express = require("express");
const protect = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const controller = require("../controllers/emergencyController");

const router = express.Router();

// Create a new emergency request (any authenticated user)
router.post("/request", protect, authorize([]), controller.createRequest);

// Hospitals get nearby matching requests
router.get("/nearby", protect, authorize(["hospital"]), controller.findNearby);

// Hospital accepts a request
router.patch("/accept", protect, authorize(["hospital"]), controller.acceptRequest);

// Hospital fulfills a request
router.patch("/fulfill", protect, authorize(["hospital"]), controller.fulfillRequest);

// Get my requests (requester or accepting hospital)
router.get("/my-requests", protect, authorize([]), controller.myRequests);

module.exports = router;
// exported router