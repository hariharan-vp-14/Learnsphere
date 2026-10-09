const express = require("express");
const {
  archiveCourse,
  createCourse,
  getPublishedCourse,
  listInstructorCourses,
  listPublishedCourses,
  publishCourse,
  recordCourseView,
  unpublishCourse,
  updateCourse,
} = require("../controllers/course.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");
const {
  enroll,
  getEnrollment,
} = require("../controllers/enrollment.controller");

const router = express.Router();
const instructorAccess = [protect, requireRoles("INSTRUCTOR", "ADMIN")];

router.get("/", listPublishedCourses);
router.get("/mine", ...instructorAccess, listInstructorCourses);
router.post("/", ...instructorAccess, createCourse);
router.get("/:slug/enrollment", protect, requireRoles("STUDENT"), getEnrollment);
router.post("/:slug/enroll", protect, requireRoles("STUDENT"), enroll);
router.post("/:slug/view", recordCourseView);
router.get("/:slug", getPublishedCourse);
router.put("/:id", ...instructorAccess, updateCourse);
router.post("/:id/publish", ...instructorAccess, publishCourse);
router.post("/:id/unpublish", ...instructorAccess, unpublishCourse);
router.post("/:id/archive", ...instructorAccess, archiveCourse);

module.exports = router;
