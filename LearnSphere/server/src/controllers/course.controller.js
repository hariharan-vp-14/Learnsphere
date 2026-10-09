const courseService = require("../services/course.service");

const handleCourseRequest = (fallbackMessage, handler, successStatus = 200) => async (req, res) => {
  try {
    const result = await handler(req);
    return res.status(successStatus).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(`${fallbackMessage}:`, error);
    return res.status(statusCode).json({
      success: false,
      message: statusCode < 500 ? error.message : fallbackMessage,
    });
  }
};

const getCourseId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw Object.assign(new Error("Course ID must be a positive integer"), {
      statusCode: 400,
    });
  }
  return id;
};

const listPublishedCourses = handleCourseRequest(
  "Unable to retrieve courses",
  () => courseService.listPublishedCourses()
);

const getPublishedCourse = handleCourseRequest(
  "Unable to retrieve course",
  (req) => courseService.getPublishedCourse(req.params.slug)
);

const recordCourseView = handleCourseRequest(
  "Unable to record course view",
  (req) => courseService.recordCourseView(req.params.slug, req.body?.visitorId),
  201
);

const listInstructorCourses = handleCourseRequest(
  "Unable to retrieve your courses",
  (req) => courseService.listInstructorCourses(req.user)
);

const createCourse = handleCourseRequest(
  "Unable to create course",
  (req) => courseService.createCourse(req.body, req.user),
  201
);

const updateCourse = handleCourseRequest(
  "Unable to update course",
  (req) => courseService.updateCourse(getCourseId(req), req.body, req.user)
);

const publishCourse = handleCourseRequest(
  "Unable to publish course",
  (req) => courseService.setCourseStatus(getCourseId(req), "PUBLISHED", req.user)
);

const unpublishCourse = handleCourseRequest(
  "Unable to unpublish course",
  (req) => courseService.setCourseStatus(getCourseId(req), "DRAFT", req.user)
);

const archiveCourse = handleCourseRequest(
  "Unable to archive course",
  (req) => courseService.setCourseStatus(getCourseId(req), "ARCHIVED", req.user)
);

module.exports = {
  archiveCourse,
  createCourse,
  getPublishedCourse,
  listInstructorCourses,
  listPublishedCourses,
  publishCourse,
  recordCourseView,
  unpublishCourse,
  updateCourse,
};
