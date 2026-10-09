const assert = require("node:assert/strict");
const { test } = require("node:test");

const courses = [
  { id: 1, slug: "free-course", status: "PUBLISHED", price: "0.00", instructorId: 10 },
  { id: 2, slug: "paid-course", status: "PUBLISHED", price: "25.00", instructorId: 10 },
];
const modules = [
  { id: 1, courseId: 1 },
  { id: 2, courseId: 2 },
];
const lessons = [
  { id: 1, moduleId: 1, title: "Lesson one", content: "Private content", videoUrl: null },
  { id: 2, moduleId: 1, title: "Lesson two", content: "More content", videoUrl: null },
  { id: 3, moduleId: 2, title: "Paid lesson", content: "Paid content", videoUrl: null },
];
const enrollments = [];
const progress = [];

const matchEnrollment = (where) => {
  if (where.id !== undefined) return enrollments.find((item) => item.id === where.id);
  return enrollments.find((item) =>
    item.studentId === where.studentId_courseId.studentId
    && item.courseId === where.studentId_courseId.courseId
  );
};

const prismaMock = {
  course: {
    findFirst: async ({ where }) =>
      courses.find((item) => item.slug === where.slug && item.status === where.status) || null,
  },
  enrollment: {
    findUnique: async ({ where }) => {
      const item = matchEnrollment(where);
      if (!item) return null;
      if (where.id !== undefined) {
        const course = courses.find((record) => record.id === item.courseId);
        return {
          ...item,
          course: {
            ...course,
            modules: modules.filter((module) => module.courseId === course.id).map((module) => ({
              ...module,
              lessons: lessons.filter((lesson) => lesson.moduleId === module.id),
            })),
          },
        };
      }
      return item;
    },
    create: async ({ data }) => {
      const item = {
        id: enrollments.length + 1,
        progressPercentage: "0.00",
        enrolledAt: new Date(),
        completedAt: null,
        ...data,
      };
      enrollments.push(item);
      return item;
    },
    update: async ({ where, data }) => {
      const item = matchEnrollment(where);
      Object.assign(item, data);
      return item;
    },
  },
  lesson: {
    findUnique: async ({ where }) => {
      const lesson = lessons.find((item) => item.id === where.id);
      if (!lesson) return null;
      const module = modules.find((item) => item.id === lesson.moduleId);
      return { ...lesson, module: { courseId: module.courseId } };
    },
    count: async ({ where }) => lessons.filter((lesson) =>
      modules.some((module) => module.id === lesson.moduleId && module.courseId === where.module.courseId)
    ).length,
  },
  lessonProgress: {
    findUnique: async ({ where }) => progress.find((item) =>
      item.enrollmentId === where.enrollmentId_lessonId.enrollmentId
      && item.lessonId === where.enrollmentId_lessonId.lessonId
    ) || null,
    upsert: async ({ where, create }) => {
      const existing = progress.find((item) =>
        item.enrollmentId === where.enrollmentId_lessonId.enrollmentId
        && item.lessonId === where.enrollmentId_lessonId.lessonId
      );
      if (existing) return existing;
      const item = { id: progress.length + 1, completedAt: new Date(), ...create };
      progress.push(item);
      return item;
    },
    count: async ({ where }) => progress.filter((item) => item.enrollmentId === where.enrollmentId).length,
  },
  $transaction: async (callback) => callback(prismaMock),
};

const prismaConfigPath = require.resolve("../src/config/prisma");
require.cache[prismaConfigPath] = {
  id: prismaConfigPath,
  filename: prismaConfigPath,
  loaded: true,
  exports: { getPrismaClient: () => prismaMock },
};
const enrollmentService = require("../src/services/enrollment.service");

test("free enrollment is idempotent and paid enrollment is rejected without verified checkout", async () => {
  const first = await enrollmentService.enrollInCourse("free-course", 21);
  const repeated = await enrollmentService.enrollInCourse("free-course", 21);
  assert.equal(first.id, repeated.id);
  assert.equal(enrollments.length, 1);
  await assert.rejects(
    enrollmentService.enrollInCourse("paid-course", 21),
    (error) => error.statusCode === 409
  );
  assert.equal(enrollments.length, 1);
});

test("lesson content requires the student's enrollment and progress remains idempotent", async () => {
  const enrollment = enrollments[0];
  await assert.rejects(
    enrollmentService.getLessonContent(enrollment.id, 1, 22),
    (error) => error.statusCode === 404
  );
  await assert.rejects(
    enrollmentService.getLessonContent(enrollment.id, 3, 21),
    (error) => error.statusCode === 404
  );

  const privateLesson = await enrollmentService.getLessonContent(enrollment.id, 1, 21);
  assert.equal(privateLesson.content, "Private content");
  assert.equal(privateLesson.completed, false);

  const firstCompletion = await enrollmentService.completeLesson(enrollment.id, 1, 21);
  const repeatedCompletion = await enrollmentService.completeLesson(enrollment.id, 1, 21);
  assert.equal(Number(firstCompletion.enrollment.progressPercentage), 50);
  assert.equal(Number(repeatedCompletion.enrollment.progressPercentage), 50);
  assert.equal(progress.length, 1);

  const completedCourse = await enrollmentService.completeLesson(enrollment.id, 2, 21);
  assert.equal(completedCourse.enrollment.status, "COMPLETED");
  assert.equal(Number(completedCourse.enrollment.progressPercentage), 100);
  assert.equal(progress.length, 2);
});
