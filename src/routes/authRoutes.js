const express = require("express");
const {
  register,
  login,
  createUserByAdmin,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/users", protect, authorize("ADMIN"), createUserByAdmin);

module.exports = router;
