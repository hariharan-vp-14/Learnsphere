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

module.exports = { requireRoles };
