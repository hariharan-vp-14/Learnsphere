const express = require("express");
const {
  completeLesson,
  getLesson,
  getEnrollmentById,
  getProgress,
  enroll,
  listMine,
} = require("../controllers/enrollment.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireStudent } = require("../middleware/role.middleware");

const router = express.Router();
router.use(protect, requireStudent);
router.post("/", enroll);
router.get("/my", listMine);
router.get("/mine", listMine);
router.get("/:enrollmentId/progress", getProgress);
router.get("/:enrollmentId", getEnrollmentById);
router.get("/:enrollmentId/lessons/:lessonId", getLesson);
router.post("/:enrollmentId/lessons/:lessonId/complete", completeLesson);

module.exports = router;
