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
const {
  requireApprovedInstructor,
  requireStudent,
} = require("../middleware/role.middleware");
const {
  enroll,
  getCourseEnrollment,
} = require("../controllers/enrollment.controller");

const router = express.Router();
const instructorAccess = [protect, requireApprovedInstructor];

router.get("/", listPublishedCourses);
router.get("/mine", ...instructorAccess, listInstructorCourses);
router.post("/", ...instructorAccess, createCourse);
router.get("/:slug/enrollment", protect, requireStudent, getCourseEnrollment);
router.post("/:slug/enroll", protect, requireStudent, enroll);
router.post("/:slug/view", recordCourseView);
router.get("/:slug", getPublishedCourse);
router.put("/:id", ...instructorAccess, updateCourse);
router.post("/:id/publish", ...instructorAccess, publishCourse);
router.post("/:id/unpublish", ...instructorAccess, unpublishCourse);
router.post("/:id/archive", ...instructorAccess, archiveCourse);

module.exports = router;
