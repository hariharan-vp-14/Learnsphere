const express = require("express");
const { getDashboard, listStudents } = require("../controllers/instructor.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireRoles } = require("../middleware/role.middleware");

const router = express.Router();
router.use(protect, requireRoles("INSTRUCTOR", "ADMIN"));
router.get("/dashboard", getDashboard);
router.get("/students", listStudents);

module.exports = router;
