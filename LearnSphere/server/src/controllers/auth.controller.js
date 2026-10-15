const authService = require("../services/auth.service");

const COOKIE_NAME = "token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
const GOOGLE_STATE_COOKIE = "google_oauth_state";
const GOOGLE_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth/google",
};

const respondWithAuthError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode < 500 || statusCode === 503
        ? error.message
        : fallbackMessage,
  });
};

const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    return res.status(user.existingAccount ? 200 : 201).json({
      success: true,
      message: "Account created. Check your email to verify your account before signing in.",
      data: user,
    });
  } catch (error) {
    return respondWithAuthError(res, error, "Unable to register user");
  }
};

const registerTeacherApplication = async (req, res) => {
  try {
    const application = await authService.registerTeacherApplication(req.body);
    return res.status(application.existingAccount ? 200 : 201).json({
      success: true,
      message: application.applicationStatus === "APPROVED"
        ? "Teacher access is already enabled for this account."
        : application.emailVerified
          ? "Teacher application submitted. Administrator approval is required before you can teach."
          : "Teacher application submitted. Verify your email before it can be reviewed.",
      data: application,
    });
  } catch (error) {
    return respondWithAuthError(res, error, "Unable to submit teacher application");
  }
};

const verifyEmail = async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.body && req.body.token);
    return res.status(200).json({
      success: true,
      message: "Email verified. You can now sign in.",
      data: result,
    });
  } catch (error) {
    return respondWithAuthError(res, error, "Unable to verify email");
  }
};

const resendVerification = async (req, res) => {
  try {
    const result = await authService.resendVerification(req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return respondWithAuthError(res, error, "Unable to send verification email");
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    res.cookie(COOKIE_NAME, result.token, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result.user,
    });
  } catch (error) {
    return respondWithAuthError(res, error, "Unable to log in");
  }
};

const startGoogleAuth = async (req, res) => {
  try {
    const result = await authService.startGoogleAuth(req.query || {});
    res.cookie(GOOGLE_STATE_COOKIE, result.state, {
      ...GOOGLE_STATE_COOKIE_OPTIONS,
      maxAge: 10 * 60 * 1000,
    });
    return res.redirect(result.authUrl);
  } catch (error) {
    const message = error.message || "Google sign-in is unavailable";
    const target = `${process.env.CLIENT_URL || "http://localhost:5173"}/login?role=${encodeURIComponent(req.query?.role || "INSTRUCTOR")}&error=${encodeURIComponent(message)}`;
    return res.redirect(target);
  }
};

const googleCallback = async (req, res) => {
  try {
    const cookieState = req.cookies?.[GOOGLE_STATE_COOKIE];
    const callbackState = req.query?.state;
    if (!cookieState || !callbackState || cookieState !== callbackState) {
      throw Object.assign(new Error("Google sign-in request could not be verified"), {
        statusCode: 400,
      });
    }

    const result = await authService.googleCallback(req.query || {});
    res.cookie(COOKIE_NAME, result.token, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.clearCookie(GOOGLE_STATE_COOKIE, GOOGLE_STATE_COOKIE_OPTIONS);
    const user = result.user;
    const redirectPath = user.role === "ADMIN"
      ? "/admin/dashboard"
      : user.role === "INSTRUCTOR"
        || user.instructorProfile?.applicationStatus === "APPROVED"
          ? "/instructor/courses"
          : user.instructorProfile
            ? "/teacher/application"
            : "/dashboard";
    return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}${redirectPath}`);
  } catch (error) {
    res.clearCookie(GOOGLE_STATE_COOKIE, GOOGLE_STATE_COOKIE_OPTIONS);
    const message = encodeURIComponent(error.message || "Google sign-in failed");
    return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?role=INSTRUCTOR&error=${message}`);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return respondWithAuthError(res, error, "Unable to retrieve profile");
  }
};

const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  return res.status(200).json({ success: true, message: "Logged out" });
};

module.exports = {
  register,
  registerTeacherApplication,
  verifyEmail,
  resendVerification,
  login,
  startGoogleAuth,
  googleCallback,
  getMe,
  logout,
};
