const express = require("express");
const {
  listTeacherApplications,
  decideTeacherApplication,
} = require("../controllers/admin.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");

const router = express.Router();
router.use(protect, requireRoles("ADMIN"));
router.get("/teacher-applications", listTeacherApplications);
router.patch("/teacher-applications/:userId", decideTeacherApplication);

module.exports = router;
