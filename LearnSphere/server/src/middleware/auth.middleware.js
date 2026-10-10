const jwt = require("jsonwebtoken");
const authService = require("../services/auth.service");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
  const token = bearerToken || (req.cookies && req.cookies.token);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Authentication is not configured",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!Number.isSafeInteger(decoded.id) || decoded.id < 1) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  const user = await authService.getProfile(decoded.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: "Email verification is required",
    });
  }

  req.user = user;
  return next();
};

module.exports = {
  protect,
};
