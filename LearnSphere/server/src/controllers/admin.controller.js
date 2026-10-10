const adminService = require("../services/admin.service");

const respond = (fallbackMessage, handler) => async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await handler(req) });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(`${fallbackMessage}:`, error);
    return res.status(statusCode).json({
      success: false,
      message: statusCode < 500 ? error.message : fallbackMessage,
    });
  }
};

const listTeacherApplications = respond(
  "Unable to load teacher applications",
  () => adminService.listTeacherApplications()
);

const decideTeacherApplication = respond(
  "Unable to update teacher application",
  (req) => adminService.decideTeacherApplication(
    req.params.userId,
    req.body?.applicationStatus
  )
);

module.exports = { listTeacherApplications, decideTeacherApplication };
