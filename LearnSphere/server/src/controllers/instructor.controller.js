const instructorService = require("../services/instructor.service");

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

const getDashboard = respond(
  "Unable to load instructor dashboard",
  (req) => instructorService.getDashboard(req.user)
);

const listStudents = respond(
  "Unable to load course students",
  (req) => instructorService.listStudents(req.user, req.query)
);

module.exports = { getDashboard, listStudents };
