const authService = require("../services/auth.service");

const COOKIE_NAME = "token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
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
    return res.status(201).json({
      success: true,
      message: "Account created. Check your email to verify your account before signing in.",
      data: user,
    });
  } catch (error) {
    return respondWithAuthError(res, error, "Unable to register user");
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
  verifyEmail,
  resendVerification,
  login,
  getMe,
  logout,
};
