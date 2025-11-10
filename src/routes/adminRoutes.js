const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

router
  .route("/users")
  .get(protect, authorize("ADMIN"), adminController.getUsers)
  .post(protect, authorize("ADMIN"), adminController.createUser);

router
  .route("/users/:id/role")
  .patch(protect, authorize("ADMIN"), adminController.updateUserRole);

router
  .route("/users/:id")
  .delete(protect, authorize("ADMIN"), adminController.deleteUser);

router
  .route("/courses")
  .get(protect, authorize("ADMIN"), adminController.getAllCourses)
  .post(protect, authorize("ADMIN"), adminController.createCourse);

router
  .route("/courses/:id")
  .get(protect, authorize("ADMIN"), adminController.getCourseById)
  .patch(protect, authorize("ADMIN"), adminController.updateCourse)
  .delete(protect, authorize("ADMIN"), adminController.deleteCourse);

router
  .route("/courses/:id/status")
  .patch(protect, authorize("ADMIN"), adminController.updateCourseStatus);

module.exports = router;
