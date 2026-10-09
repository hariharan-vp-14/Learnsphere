const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();
const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const getPublishedCourse = async (slug) => {
  const course = await prisma.course.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, price: true, instructorId: true },
  });
  if (!course) throw fail("Course not found", 404);
  return course;
};

const enrollInCourse = async (slug, studentId) => {
  const course = await getPublishedCourse(slug);
  if (Number(course.price) !== 0) {
    throw fail("Paid-course enrollment is unavailable until verified checkout is enabled", 409);
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: course.id } },
  });
  if (existing && existing.status !== "CANCELLED") return existing;

  if (existing) {
    return prisma.enrollment.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", completedAt: null },
    });
  }

  return prisma.enrollment.create({
    data: { studentId, courseId: course.id, status: "ACTIVE" },
  });
};

const getCourseEnrollment = async (slug, studentId) => {
  const course = await getPublishedCourse(slug);
  return prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: course.id } },
    select: {
      id: true,
      status: true,
      progressPercentage: true,
      enrolledAt: true,
      completedAt: true,
    },
  });
};

const getEnrollment = async (enrollmentId, studentId, tx = prisma) => {
  const enrollment = await tx.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { position: "asc" },
            include: {
              lessons: {
                orderBy: { position: "asc" },
                select: { id: true, title: true, position: true },
              },
            },
          },
        },
      },
    },
  });
  if (!enrollment || enrollment.studentId !== studentId) {
    throw fail("Enrollment not found", 404);
  }
  if (!["ACTIVE", "COMPLETED"].includes(enrollment.status)) {
    throw fail("This enrollment is not active", 403);
  }
  return enrollment;
};

const getLessonContent = async (enrollmentId, lessonId, studentId) => {
  const enrollment = await getEnrollment(enrollmentId, studentId);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });
  if (!lesson || lesson.module.courseId !== enrollment.courseId) {
    throw fail("Lesson not found", 404);
  }
  const progress = await prisma.lessonProgress.findUnique({
    where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
    select: { completedAt: true },
  });
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    completed: Boolean(progress),
    completedAt: progress?.completedAt || null,
  };
};

const completeLesson = async (enrollmentId, lessonId, studentId) =>
  prisma.$transaction(async (tx) => {
    const enrollment = await getEnrollment(enrollmentId, studentId, tx);
    const lesson = await tx.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson || lesson.module.courseId !== enrollment.courseId) {
      throw fail("Lesson not found", 404);
    }

    const progress = await tx.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, studentId },
      update: {},
    });
    const totalLessons = await tx.lesson.count({
      where: { module: { courseId: enrollment.courseId } },
    });
    if (totalLessons < 1) {
      throw fail("This course does not have any lessons yet", 409);
    }
    const completedLessons = await tx.lessonProgress.count({
      where: { enrollmentId },
    });
    const progressPercentage = Math.min(100, (completedLessons / totalLessons) * 100).toFixed(2);
    const completed = completedLessons >= totalLessons;
    const updatedEnrollment = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercentage,
        status: completed ? "COMPLETED" : "ACTIVE",
        completedAt: completed ? (enrollment.completedAt || new Date()) : null,
      },
      select: {
        id: true,
        status: true,
        progressPercentage: true,
        completedAt: true,
      },
    });

    return { lessonProgress: progress, enrollment: updatedEnrollment };
  });

const listStudentEnrollments = async (studentId) =>
  prisma.enrollment.findMany({
    where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: {
      id: true,
      status: true,
      progressPercentage: true,
      enrolledAt: true,
      completedAt: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          instructor: { select: { name: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

module.exports = {
  completeLesson,
  enrollInCourse,
  getCourseEnrollment,
  getLessonContent,
  listStudentEnrollments,
};
