const express = require("express");
const {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  logout,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/logout", logout);

// simple protected test route
router.get("/protected", protect, (req, res) => {
  res.json({ success: true, message: "You are authenticated", user: req.user });
});

module.exports = router;
