const express = require("express");
const {
  register,
  registerTeacherApplication,
  verifyEmail,
  resendVerification,
  login,
  startGoogleAuth,
  googleCallback,
  getMe,
  logout,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/teacher-applications", registerTeacherApplication);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.get("/google/start", startGoogleAuth);
router.get("/google/callback", googleCallback);
router.get("/me", protect, getMe);
router.post("/logout", logout);

// simple protected test route
router.get("/protected", protect, (req, res) => {
  res.json({ success: true, message: "You are authenticated", user: req.user });
});

module.exports = router;
