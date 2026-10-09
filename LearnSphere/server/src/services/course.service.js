const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();
const MAX_PRICE = 99999999.99;

const createCourseError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const toSlugBase = (title) =>
  title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "course";

const validateDetails = (input, { partial = false } = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw createCourseError("Course details are required", 400);
  }

  const details = {};
  if (!partial || Object.hasOwn(input, "title")) {
    if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 191) {
      throw createCourseError("Title is required and must be no longer than 191 characters", 400);
    }
    details.title = input.title.trim();
  }

  if (!partial || Object.hasOwn(input, "description")) {
    if (typeof input.description !== "string" || !input.description.trim()) {
      throw createCourseError("Description is required", 400);
    }
    details.description = input.description.trim();
  }

  if (!partial || Object.hasOwn(input, "price")) {
    const price = typeof input.price === "number" ? input.price : Number(input.price);
    if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
      throw createCourseError("Price must be between 0 and 99999999.99", 400);
    }
    details.price = price.toFixed(2);
  }

  if (partial && Object.keys(details).length === 0) {
    throw createCourseError("Provide at least one course field to update", 400);
  }

  return details;
};

const createUniqueSlug = async (title, excludeCourseId) => {
  const base = toSlugBase(title);
  let slug = base;
  let suffix = 2;

  while (await prisma.course.findFirst({
    where: {
      slug,
      ...(excludeCourseId ? { id: { not: excludeCourseId } } : {}),
    },
    select: { id: true },
  })) {
    const suffixText = `-${suffix}`;
    slug = `${base.slice(0, 191 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return slug;
};

const courseInclude = {
  instructor: { select: { id: true, name: true } },
  _count: { select: { modules: true, enrollments: true } },
};

const listPublishedCourses = () =>
  prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: courseInclude,
    orderBy: { createdAt: "desc" },
  });

const getPublishedCourse = async (slug) => {
  const course = await prisma.course.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      ...courseInclude,
      modules: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          position: true,
          lessons: {
            orderBy: { position: "asc" },
            select: { id: true, title: true, description: true, position: true },
          },
        },
      },
    },
  });

  if (!course) throw createCourseError("Course not found", 404);
  return course;
};

const recordCourseView = async (slug, visitorId) => {
  if (typeof visitorId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
    throw createCourseError("A valid visitor ID is required", 400);
  }
  const course = await prisma.course.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!course) throw createCourseError("Course not found", 404);

  await prisma.courseView.upsert({
    where: { courseId_visitorId: { courseId: course.id, visitorId } },
    create: { courseId: course.id, visitorId },
    update: {},
  });
  return { recorded: true };
};

const listInstructorCourses = async (user) =>
  prisma.course.findMany({
    where: user.role === "ADMIN" ? {} : { instructorId: user.id },
    include: courseInclude,
    orderBy: { updatedAt: "desc" },
  });

const createCourse = async (input, user) => {
  const details = validateDetails(input);
  const slug = await createUniqueSlug(details.title);

  try {
    return await prisma.course.create({
      data: { ...details, slug, instructorId: user.id },
      include: courseInclude,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw createCourseError("A course with this title already exists. Try another title.", 409);
    }
    throw error;
  }
};

const updateCourse = async (id, input, user) => {
  const details = validateDetails(input, { partial: true });
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing || (user.role !== "ADMIN" && existing.instructorId !== user.id)) {
    throw createCourseError("Course not found", 404);
  }

  if (details.title) {
    details.slug = await createUniqueSlug(details.title, id);
  }

  try {
    return await prisma.course.update({
      where: { id },
      data: details,
      include: courseInclude,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw createCourseError("A course with this title already exists. Try another title.", 409);
    }
    throw error;
  }
};

const setCourseStatus = async (id, status, user) => {
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing || (user.role !== "ADMIN" && existing.instructorId !== user.id)) {
    throw createCourseError("Course not found", 404);
  }

  if (status === "PUBLISHED") {
    const moduleCount = await prisma.module.count({ where: { courseId: id } });
    const lessonCount = await prisma.lesson.count({
      where: { module: { courseId: id } },
    });
    if (moduleCount < 1 || lessonCount < 1) {
      throw createCourseError(
        "Add at least one module and one lesson before publishing this course",
        400
      );
    }
  }

  return prisma.course.update({
    where: { id },
    data: { status },
    include: courseInclude,
  });
};

module.exports = {
  createCourse,
  createCourseError,
  getPublishedCourse,
  listInstructorCourses,
  listPublishedCourses,
  recordCourseView,
  setCourseStatus,
  updateCourse,
};
