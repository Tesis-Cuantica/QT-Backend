const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const { protect, authorize } = require("../middleware/auth");

router.post(
  "/exams/:examId",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  questionController.createQuestion
);

router.get("/exams/:examId", protect, questionController.getQuestionsByExam);

router.patch(
  "/:id",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  questionController.updateQuestion
);

router.delete(
  "/:id",
  protect,
  authorize("ADMIN", "PROFESSOR"),
  questionController.deleteQuestion
);

module.exports = router;
