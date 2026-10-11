const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action",
    });
  }

  const userRoles = req.user.roles || [req.user.role];
  if (allowedRoles.some((role) => userRoles.includes(role))) return next();

  return res.status(403).json({
    success: false,
    message: "You do not have permission to perform this action",
  });
};

const requireStudent = (req, res, next) => {
  if (req.user?.role === "STUDENT") return next();
  return res.status(403).json({
    success: false,
    message: "Only student accounts can access this resource",
  });
};

const requireApprovedInstructor = (req, res, next) => {
  if (req.user?.role === "ADMIN") return next();
  if (req.user?.role === "INSTRUCTOR"
      && req.user.instructorProfile?.applicationStatus === "APPROVED") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "An approved teacher application is required for instructor tools",
  });
};

module.exports = { requireApprovedInstructor, requireRoles, requireStudent };
