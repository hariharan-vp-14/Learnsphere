const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();

const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const requireText = (value, field, maxLength = 191) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw fail(`${field} is required and must be no longer than ${maxLength} characters`, 400);
  }
  return value.trim();
};

const optionalText = (value, field, maxLength) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return requireText(value, field, maxLength);
};

const requireId = (id, label = "ID") => {
  if (!Number.isSafeInteger(id) || id < 1) throw fail(`${label} must be a positive integer`, 400);
  return id;
};

const assertOwner = (course, user) => {
  if (!course || (user.role !== "ADMIN" && course.instructorId !== user.id)) {
    throw fail("Course not found", 404);
  }
  return course;
};

const getOwnedCourse = async (courseId, user, tx = prisma) => {
  requireId(courseId, "Course ID");
  return assertOwner(await tx.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" } } },
      },
    },
  }), user);
};

const getManageCourse = (courseId, user) => getOwnedCourse(courseId, user);

const createModule = async (courseId, input, user) => {
  const title = requireText(input?.title, "Module title");
  const description = optionalText(input?.description, "Module description", 5000);

  return prisma.$transaction(async (tx) => {
    const course = await getOwnedCourse(courseId, user, tx);
    const lastModule = await tx.module.findFirst({
      where: { courseId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (lastModule?.position ?? -1) + 1;
    return tx.module.create({
      data: { courseId, title, description: description ?? null, position },
      include: { lessons: { orderBy: { position: "asc" } } },
    });
  });
};

const updateModule = async (moduleId, input, user) => {
  requireId(moduleId, "Module ID");
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw fail("Module details are required", 400);
  }
  const data = {};
  if (Object.hasOwn(input, "title")) data.title = requireText(input.title, "Module title");
  if (Object.hasOwn(input, "description")) {
    data.description = optionalText(input.description, "Module description", 5000);
  }
  if (!Object.keys(data).length) throw fail("Provide module details to update", 400);

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  assertOwner(module?.course, user);
  return prisma.module.update({
    where: { id: moduleId },
    data,
    include: { lessons: { orderBy: { position: "asc" } } },
  });
};

const deleteModule = async (moduleId, user) => {
  requireId(moduleId, "Module ID");
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  assertOwner(module?.course, user);
  await prisma.module.delete({ where: { id: moduleId } });
  return { deleted: true };
};

const reorderModules = async (courseId, moduleIds, user) => {
  requireId(courseId, "Course ID");
  if (!Array.isArray(moduleIds) || moduleIds.some((id) => !Number.isSafeInteger(id) || id < 1)
      || new Set(moduleIds).size !== moduleIds.length) {
    throw fail("moduleIds must be an array of unique positive integers", 400);
  }

  return prisma.$transaction(async (tx) => {
    const course = await getOwnedCourse(courseId, user, tx);
    const currentIds = course.modules.map((module) => module.id).sort((a, b) => a - b);
    const requestedIds = [...moduleIds].sort((a, b) => a - b);
    if (currentIds.length !== requestedIds.length
        || currentIds.some((id, index) => id !== requestedIds[index])) {
      throw fail("moduleIds must contain every module in this course exactly once", 400);
    }
    for (const [position, id] of moduleIds.entries()) {
      await tx.module.update({ where: { id }, data: { position } });
    }
    return tx.module.findMany({
      where: { courseId },
      orderBy: { position: "asc" },
      include: { lessons: { orderBy: { position: "asc" } } },
    });
  });
};

const createLesson = async (moduleId, input, user) => {
  requireId(moduleId, "Module ID");
  const title = requireText(input?.title, "Lesson title");
  const description = optionalText(input?.description, "Lesson description", 5000);
  const content = optionalText(input?.content, "Lesson content", 100000);
  const videoUrl = optionalText(input?.videoUrl, "Video URL", 2048);
  if (videoUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(videoUrl);
    } catch {
      throw fail("Video URL must be a valid HTTPS URL", 400);
    }
    if (parsedUrl.protocol !== "https:") throw fail("Video URL must use HTTPS", 400);
  }

  return prisma.$transaction(async (tx) => {
    const module = await tx.module.findUnique({ where: { id: moduleId }, include: { course: true } });
    assertOwner(module?.course, user);
    const lastLesson = await tx.lesson.findFirst({
      where: { moduleId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (lastLesson?.position ?? -1) + 1;
    return tx.lesson.create({
      data: {
        moduleId,
        title,
        description: description ?? null,
        content: content ?? null,
        videoUrl: videoUrl ?? null,
        position,
      },
    });
  });
};

const updateLesson = async (lessonId, input, user) => {
  requireId(lessonId, "Lesson ID");
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw fail("Lesson details are required", 400);
  }
  const data = {};
  if (Object.hasOwn(input, "title")) data.title = requireText(input.title, "Lesson title");
  if (Object.hasOwn(input, "description")) {
    data.description = optionalText(input.description, "Lesson description", 5000);
  }
  if (Object.hasOwn(input, "content")) data.content = optionalText(input.content, "Lesson content", 100000);
  if (Object.hasOwn(input, "videoUrl")) {
    data.videoUrl = optionalText(input.videoUrl, "Video URL", 2048);
    if (data.videoUrl) {
      let parsedUrl;
      try {
        parsedUrl = new URL(data.videoUrl);
      } catch {
        throw fail("Video URL must be a valid HTTPS URL", 400);
      }
      if (parsedUrl.protocol !== "https:") throw fail("Video URL must use HTTPS", 400);
    }
  }
  if (!Object.keys(data).length) throw fail("Provide lesson details to update", 400);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  assertOwner(lesson?.module?.course, user);
  return prisma.lesson.update({ where: { id: lessonId }, data });
};

const deleteLesson = async (lessonId, user) => {
  requireId(lessonId, "Lesson ID");
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  assertOwner(lesson?.module?.course, user);
  await prisma.lesson.delete({ where: { id: lessonId } });
  return { deleted: true };
};

const reorderLessons = async (moduleId, lessonIds, user) => {
  requireId(moduleId, "Module ID");
  if (!Array.isArray(lessonIds) || lessonIds.some((id) => !Number.isSafeInteger(id) || id < 1)
      || new Set(lessonIds).size !== lessonIds.length) {
    throw fail("lessonIds must be an array of unique positive integers", 400);
  }

  return prisma.$transaction(async (tx) => {
    const module = await tx.module.findUnique({ where: { id: moduleId }, include: { course: true } });
    assertOwner(module?.course, user);
    const lessons = await tx.lesson.findMany({ where: { moduleId } });
    const currentIds = lessons.map((lesson) => lesson.id).sort((a, b) => a - b);
    const requestedIds = [...lessonIds].sort((a, b) => a - b);
    if (currentIds.length !== requestedIds.length
        || currentIds.some((id, index) => id !== requestedIds[index])) {
      throw fail("lessonIds must contain every lesson in this module exactly once", 400);
    }
    for (const [position, id] of lessonIds.entries()) {
      await tx.lesson.update({ where: { id }, data: { position } });
    }
    return tx.lesson.findMany({ where: { moduleId }, orderBy: { position: "asc" } });
  });
};

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
