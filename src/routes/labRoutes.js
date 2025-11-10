const express = require("express");
const router = express.Router();
const labController = require("../controllers/labController");
const { protect } = require("../middleware/auth");

router
  .route("/modules/:moduleId")
  .get(protect, labController.getLabsByModule)
  .post(protect, labController.createLab);

router
  .route("/:id")
  .get(protect, labController.getLabById)
  .patch(protect, labController.updateLab)
  .delete(protect, labController.deleteLab);

router.route("/simulate").post(protect, labController.runSimulation);

router.route("/student-labs").post(protect, labController.saveStudentLab);

module.exports = router;
