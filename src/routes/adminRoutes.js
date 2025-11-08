const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getUsers,
  updateUserRole,
  deleteUser,
  getAllCourses,
  updateCourseStatus,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/users", protect, authorize("ADMIN"), getUsers);
router.patch("/users/:id/role", protect, authorize("ADMIN"), updateUserRole);
router.delete("/users/:id", protect, authorize("ADMIN"), deleteUser);

router.get("/courses", protect, authorize("ADMIN"), getAllCourses);
router.patch(
  "/courses/:id/status",
  protect,
  authorize("ADMIN"),
  updateCourseStatus
);

module.exports = router;
