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
  (req) => adminService.listTeacherApplications(req.query)
);

const getDashboard = respond(
  "Unable to load administrator dashboard",
  () => adminService.getAdminDashboard()
);

const getTeacherApplication = respond(
  "Unable to load teacher application",
  (req) => adminService.getTeacherApplication(req.params.id)
);

const getReviewHistory = respond(
  "Unable to load review history",
  (req) => adminService.getReviewHistory(req.params.id)
);

const approveTeacherApplication = respond(
  "Unable to approve teacher application",
  (req) => adminService.decideTeacherApplicationByProfileId(
    req.params.id,
    "APPROVED",
    req.user.id
  )
);

const rejectTeacherApplication = respond(
  "Unable to reject teacher application",
  (req) => adminService.decideTeacherApplicationByProfileId(
    req.params.id,
    "REJECTED",
    req.user.id,
    req.body?.reason
  )
);

const decideTeacherApplication = respond(
  "Unable to update teacher application",
  (req) => adminService.decideTeacherApplication(
    req.params.userId,
    req.body?.applicationStatus,
    req.user.id,
    req.body?.rejectionReason
  )
);

module.exports = {
  approveTeacherApplication,
  decideTeacherApplication,
  getDashboard,
  getReviewHistory,
  getTeacherApplication,
  listTeacherApplications,
  rejectTeacherApplication,
};
