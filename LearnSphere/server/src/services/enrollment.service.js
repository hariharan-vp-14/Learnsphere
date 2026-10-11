const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();
const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const getPublishedCourse = async (identifier) => {
  const where = Number.isSafeInteger(identifier)
    ? { id: identifier }
    : { slug: identifier };
  const course = await prisma.course.findFirst({
    where: { ...where, status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, price: true, instructorId: true },
  });
  if (!course) throw fail("Course not found", 404);
  return course;
};

const enrollInCourse = async (identifier, studentId) => {
  const course = await getPublishedCourse(identifier);
  if (Number(course.price) !== 0 && !(await hasVerifiedPayment(studentId, course.id))) {
    throw fail("A successful verified payment is required to enroll in this paid course", 409);
  }

  const activateExisting = async (existing) => {
    if (existing.status !== "CANCELLED") return existing;

    return prisma.enrollment.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", completedAt: null },
    });
  };

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: course.id } },
  });
  if (existing) return activateExisting(existing);

  try {
    return await prisma.enrollment.create({
      data: { studentId, courseId: course.id, status: "ACTIVE" },
    });
  } catch (error) {
    if (error.code !== "P2002") throw error;

    const concurrentEnrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: course.id } },
    });
    if (!concurrentEnrollment) throw error;
    return activateExisting(concurrentEnrollment);
  }
};

const getCourseEnrollment = async (slug, studentId) => {
  const course = await getPublishedCourse(slug);
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: course.id } },
    select: {
      id: true,
      status: true,
      progressPercentage: true,
      enrolledAt: true,
      completedAt: true,
    },
  });
  if (!enrollment || enrollment.status === "CANCELLED") return null;
  if (Number(course.price) > 0 && !(await hasVerifiedPayment(studentId, course.id))) return null;
  return enrollment;
};

const hasVerifiedPayment = async (studentId, courseId, tx = prisma) => {
  const successfulOrder = await tx.order.findFirst({
    where: {
      userId: studentId,
      courseId,
      status: "SUCCESS",
      payments: { some: { status: "SUCCESS" } },
    },
    select: { id: true },
  });
  return Boolean(successfulOrder);
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
  if (enrollment.course.status !== "PUBLISHED") {
    throw fail("Course content is not currently available", 404);
  }
  if (Number(enrollment.course.price) > 0 && !(await hasVerifiedPayment(studentId, enrollment.courseId, tx))) {
    throw fail("Verified payment is required to access this course", 403);
  }
  return enrollment;
};

const getStudentEnrollment = async (enrollmentId, studentId) => {
  const enrollment = await getEnrollment(enrollmentId, studentId);
  const completedLessonIds = await prisma.lessonProgress.findMany({
    where: { enrollmentId },
    select: { lessonId: true },
  });
  const completedIds = new Set(completedLessonIds.map(({ lessonId }) => lessonId));
  const lessons = enrollment.course.modules.flatMap((module) => module.lessons);
  const completedLessons = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
  const completed = lessons.length > 0 && completedLessons === lessons.length;

  return {
    id: enrollment.id,
    status: completed ? "COMPLETED" : "ACTIVE",
    enrolledAt: enrollment.enrolledAt,
    completedAt: completed ? enrollment.completedAt : null,
    progressPercentage: lessons.length
      ? ((completedLessons / lessons.length) * 100).toFixed(2)
      : "0.00",
    course: {
      id: enrollment.course.id,
      title: enrollment.course.title,
      slug: enrollment.course.slug,
      modules: enrollment.course.modules,
    },
  };
};

const getEnrollmentProgress = async (enrollmentId, studentId) => {
  const enrollment = await getEnrollment(enrollmentId, studentId);
  const completedRows = await prisma.lessonProgress.findMany({
    where: { enrollmentId },
    select: { lessonId: true, completedAt: true },
    orderBy: { completedAt: "desc" },
  });
  const lessonIds = new Set(
    enrollment.course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id))
  );
  const completedLessonIds = [...new Set(
    completedRows
      .filter(({ lessonId }) => lessonIds.has(lessonId))
      .map(({ lessonId }) => lessonId)
  )];
  const totalLessons = lessonIds.size;
  const completed = totalLessons > 0 && completedLessonIds.length === totalLessons;

  return {
    enrollmentId: enrollment.id,
    status: completed ? "COMPLETED" : "ACTIVE",
    progressPercentage: totalLessons
      ? Number(((completedLessonIds.length / totalLessons) * 100).toFixed(2))
      : 0,
    completedLessonIds,
    completedLessons: completedLessonIds.length,
    totalLessons,
  };
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

    const totalLessons = await tx.lesson.count({
      where: { module: { courseId: enrollment.courseId } },
    });
    if (totalLessons < 1) {
      throw fail("This course does not have any lessons yet", 409);
    }

    const progress = await tx.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, studentId },
      update: {},
    });
    const completedLessons = await tx.lessonProgress.count({
      where: {
        enrollmentId,
        lesson: { module: { courseId: enrollment.courseId } },
      },
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
  (async () => {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { in: ["ACTIVE", "COMPLETED"] },
        course: { status: "PUBLISHED" },
      },
      select: {
        id: true,
        status: true,
        enrolledAt: true,
        completedAt: true,
        lessonProgress: { select: { lessonId: true, completedAt: true } },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            instructor: { select: { name: true } },
            modules: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                title: true,
                position: true,
                lessons: {
                  orderBy: { position: "asc" },
                  select: { id: true, title: true, position: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return Promise.all(enrollments.map(async (enrollment) => {
      if (Number(enrollment.course.price) > 0
          && !(await hasVerifiedPayment(studentId, enrollment.course.id))) {
        return null;
      }
      const completedIds = new Set(enrollment.lessonProgress.map(({ lessonId }) => lessonId));
      const lessons = enrollment.course.modules.flatMap((module) => module.lessons);
      const completedLessons = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
      const nextLesson = lessons.find((lesson) => !completedIds.has(lesson.id)) || null;
      const { lessonProgress, ...enrollmentData } = enrollment;
      const completed = lessons.length > 0 && completedLessons === lessons.length;

      return {
        ...enrollmentData,
        status: completed ? "COMPLETED" : "ACTIVE",
        completedAt: completed ? enrollment.completedAt : null,
        progressPercentage: lessons.length
          ? ((completedLessons / lessons.length) * 100).toFixed(2)
          : "0.00",
        completedLessonIds: [...completedIds].filter((id) => lessons.some((lesson) => lesson.id === id)),
        nextLesson,
      };
    })).then((results) => results.filter(Boolean));
  })();

module.exports = {
  completeLesson,
  enrollInCourse,
  getCourseEnrollment,
  getEnrollmentProgress,
  getLessonContent,
  getStudentEnrollment,
  listStudentEnrollments,
};
