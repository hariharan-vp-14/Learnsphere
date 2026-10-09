const express = require("express");
const {
  completeLesson,
  getLesson,
  listMine,
} = require("../controllers/enrollment.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");

const router = express.Router();
router.use(protect, requireRoles("STUDENT"));
router.get("/mine", listMine);
router.get("/:enrollmentId/lessons/:lessonId", getLesson);
router.post("/:enrollmentId/lessons/:lessonId/complete", completeLesson);

module.exports = router;
