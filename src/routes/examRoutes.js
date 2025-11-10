const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { protect } = require("../middleware/auth");

router
  .route("/modules/:moduleId")
  .get(protect, examController.getExamsByModule)
  .post(protect, examController.createExam);

router
  .route("/:id")
  .get(protect, examController.getExamById)
  .patch(protect, examController.updateExam)
  .delete(protect, examController.deleteExam);

module.exports = router;
