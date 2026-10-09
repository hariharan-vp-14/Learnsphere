const curriculumService = require("../services/curriculum.service");

const respond = (fallbackMessage, handler, successStatus = 200) => async (req, res) => {
  try {
    return res.status(successStatus).json({
      success: true,
      data: await handler(req),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(`${fallbackMessage}:`, error);
    return res.status(statusCode).json({
      success: false,
      message: statusCode < 500 ? error.message : fallbackMessage,
    });
  }
};

const idParam = (req, key) => {
  const id = Number(req.params[key]);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw Object.assign(new Error(`${key} must be a positive integer`), { statusCode: 400 });
  }
  return id;
};

const getManageCourse = respond(
  "Unable to load course curriculum",
  (req) => curriculumService.getManageCourse(idParam(req, "courseId"), req.user)
);
const createModule = respond(
  "Unable to create module",
  (req) => curriculumService.createModule(idParam(req, "courseId"), req.body, req.user),
  201
);
const updateModule = respond(
  "Unable to update module",
  (req) => curriculumService.updateModule(idParam(req, "moduleId"), req.body, req.user)
);
const deleteModule = respond(
  "Unable to delete module",
  (req) => curriculumService.deleteModule(idParam(req, "moduleId"), req.user)
);
const reorderModules = respond(
  "Unable to reorder modules",
  (req) => curriculumService.reorderModules(idParam(req, "courseId"), req.body?.moduleIds, req.user)
);
const createLesson = respond(
  "Unable to create lesson",
  (req) => curriculumService.createLesson(idParam(req, "moduleId"), req.body, req.user),
  201
);
const updateLesson = respond(
  "Unable to update lesson",
  (req) => curriculumService.updateLesson(idParam(req, "lessonId"), req.body, req.user)
);
const deleteLesson = respond(
  "Unable to delete lesson",
  (req) => curriculumService.deleteLesson(idParam(req, "lessonId"), req.user)
);
const reorderLessons = respond(
  "Unable to reorder lessons",
  (req) => curriculumService.reorderLessons(idParam(req, "moduleId"), req.body?.lessonIds, req.user)
);

module.exports = {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  getManageCourse,
  reorderLessons,
  reorderModules,
  updateLesson,
  updateModule,
};
