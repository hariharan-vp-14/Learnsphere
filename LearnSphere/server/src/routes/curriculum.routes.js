const express = require("express");
const {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  getManageCourse,
  reorderLessons,
  reorderModules,
  updateLesson,
  updateModule,
} = require("../controllers/curriculum.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");

const router = express.Router();
router.use(protect, requireRoles("INSTRUCTOR", "ADMIN"));
router.get("/courses/:courseId/manage", getManageCourse);
router.post("/courses/:courseId/modules", createModule);
router.put("/courses/:courseId/modules/reorder", reorderModules);
router.put("/modules/:moduleId", updateModule);
router.delete("/modules/:moduleId", deleteModule);
router.post("/modules/:moduleId/lessons", createLesson);
router.put("/modules/:moduleId/lessons/reorder", reorderLessons);
router.put("/lessons/:lessonId", updateLesson);
router.delete("/lessons/:lessonId", deleteLesson);

module.exports = router;
