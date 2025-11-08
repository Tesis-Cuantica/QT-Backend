const express = require("express");
const authController = require("../controllers/authController");
const labController = require("../controllers/labController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Auth
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);

// Labs
router.post("/labs/run", protect, labController.runLab);
router.post("/labs/submit", protect, labController.submitLab);

module.exports = router;
