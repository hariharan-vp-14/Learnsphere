const enrollmentService = require("../services/enrollment.service");

const respond = (fallbackMessage, handler, statusCode = 200) => async (req, res) => {
  try {
    return res.status(statusCode).json({ success: true, data: await handler(req) });
  } catch (error) {
    const code = error.statusCode || 500;
    if (code >= 500) console.error(`${fallbackMessage}:`, error);
    return res.status(code).json({
      success: false,
      message: code < 500 ? error.message : fallbackMessage,
    });
  }
};

const getParamId = (req, key) => {
  const id = Number(req.params[key]);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw Object.assign(new Error(`${key} must be a positive integer`), { statusCode: 400 });
  }
  return id;
};

const enroll = respond(
  "Unable to enroll in course",
  (req) => enrollmentService.enrollInCourse(req.params.slug, req.user.id),
  201
);
const getEnrollment = respond(
  "Unable to retrieve enrollment",
  (req) => enrollmentService.getCourseEnrollment(req.params.slug, req.user.id)
);
const listMine = respond(
  "Unable to retrieve enrollments",
  (req) => enrollmentService.listStudentEnrollments(req.user.id)
);
const getLesson = respond(
  "Unable to retrieve lesson",
  (req) => enrollmentService.getLessonContent(
    getParamId(req, "enrollmentId"),
    getParamId(req, "lessonId"),
    req.user.id
  )
);
const completeLesson = respond(
  "Unable to update lesson progress",
  (req) => enrollmentService.completeLesson(
    getParamId(req, "enrollmentId"),
    getParamId(req, "lessonId"),
    req.user.id
  )
);

module.exports = { completeLesson, enroll, getEnrollment, getLesson, listMine };
