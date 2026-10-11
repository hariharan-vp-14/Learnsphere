const express = require("express");
const {
  approveTeacherApplication,
  listTeacherApplications,
  decideTeacherApplication,
  getDashboard,
  getReviewHistory,
  getTeacherApplication,
  rejectTeacherApplication,
} = require("../controllers/admin.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");

const router = express.Router();
router.use(protect, requireRoles("ADMIN"));
router.get("/dashboard", getDashboard);
router.get("/teacher-applications", listTeacherApplications);
router.get("/teacher-applications/:id/reviews", getReviewHistory);
router.get("/teacher-applications/:id", getTeacherApplication);
router.patch("/teacher-applications/:id/approve", approveTeacherApplication);
router.patch("/teacher-applications/:id/reject", rejectTeacherApplication);
router.patch("/teacher-applications/:userId", decideTeacherApplication);

module.exports = router;
