const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();

const requireRoles = (...allowedRoles) => (req, res, next) => {
  const userRoles = req.user?.roles || [req.user?.role];
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action",
    });
  }

  if (allowedRoles.some((role) => userRoles.includes(role))) return next();

  if (allowedRoles.includes("INSTRUCTOR") && req.user.role !== "ADMIN") {
    return prisma.instructorProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    }).then((profile) => {
      if (profile) return next();
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }).catch((error) => next(error));
  }

  return res.status(403).json({
    success: false,
    message: "You do not have permission to perform this action",
  });
};

module.exports = { requireRoles };
