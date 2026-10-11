const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const jwt = require("jsonwebtoken");

const courses = [
  { id: 1, slug: "free-course", status: "PUBLISHED", price: "0.00", instructorId: 10 },
  { id: 2, slug: "paid-course", status: "PUBLISHED", price: "25.00", instructorId: 10 },
  { id: 3, slug: "draft-course", status: "DRAFT", price: "0.00", instructorId: 10 },
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
const verifiedPayments = new Set();

const matchEnrollment = (where) => {
  if (where.id !== undefined) return enrollments.find((item) => item.id === where.id);
  return enrollments.find((item) =>
    item.studentId === where.studentId_courseId.studentId
    && item.courseId === where.studentId_courseId.courseId
  );
};

const prismaMock = {
  course: {
    findFirst: async ({ where }) => courses.find((item) =>
      item.status === where.status
      && (where.id !== undefined ? item.id === where.id : item.slug === where.slug)
    ) || null,
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
      if (matchEnrollment({
        studentId_courseId: { studentId: data.studentId, courseId: data.courseId },
      })) {
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      }
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
    findMany: async ({ where }) => enrollments
      .filter((item) => item.studentId === where.studentId
        && where.status.in.includes(item.status)
        && courses.find((course) => course.id === item.courseId)?.status === where.course.status)
      .map((item) => {
        const course = courses.find((record) => record.id === item.courseId);
        return {
          id: item.id,
          status: item.status,
          enrolledAt: item.enrolledAt,
          completedAt: item.completedAt,
          lessonProgress: progress.filter((row) => row.enrollmentId === item.id),
          course: {
            id: course.id,
            title: course.title || course.slug,
            slug: course.slug,
            price: course.price,
            instructor: { name: "Instructor" },
            modules: modules.filter((module) => module.courseId === course.id).map((module) => ({
              id: module.id,
              title: "Module",
              position: 1,
              lessons: lessons.filter((lesson) => lesson.moduleId === module.id).map((lesson, index) => ({
                id: lesson.id,
                title: lesson.title,
                position: index + 1,
              })),
            })),
          },
        };
      }),
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
    findMany: async ({ where }) => progress.filter((item) => item.enrollmentId === where.enrollmentId),
  },
  order: {
    findFirst: async ({ where }) => verifiedPayments.has(`${where.userId}:${where.courseId}`)
      ? { id: 1 }
      : null,
  },
  user: {
    findUnique: async ({ where }) => ({
      id: where.id,
      name: `User ${where.id}`,
      email: `user${where.id}@gmail.com`,
      role: where.id === 10 ? "INSTRUCTOR" : "STUDENT",
      emailVerifiedAt: new Date(),
      instructorProfile: where.id === 10 ? { applicationStatus: "APPROVED" } : null,
    }),
  },
  instructorProfile: { findUnique: async () => ({ applicationStatus: "APPROVED" }) },
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
process.env.JWT_SECRET = "enrollment-tests-use-a-private-local-secret";
const app = require("../src/app");
const server = app.listen(0);
const baseUrl = new Promise((resolve) => {
  server.once("listening", () => resolve(`http://127.0.0.1:${server.address().port}`));
});
const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const request = async (path, { id, ...options } = {}) =>
  fetch(`${await baseUrl}${path}`, {
    ...options,
    headers: {
      ...(id ? { Cookie: `token=${tokenFor(id)}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

after(() => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
}));

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

test("student enrollment APIs enforce authentication, student role, publication, and ownership", async () => {
  const anonymous = await request("/api/enrollments", {
    method: "POST",
    body: JSON.stringify({ courseId: 1 }),
  });
  assert.equal(anonymous.status, 401);

  const teacher = await request("/api/enrollments", {
    id: 10,
    method: "POST",
    body: JSON.stringify({ courseId: 1 }),
  });
  assert.equal(teacher.status, 403);

  const draft = await request("/api/enrollments", {
    id: 31,
    method: "POST",
    body: JSON.stringify({ courseId: 3 }),
  });
  assert.equal(draft.status, 404);

  const first = await request("/api/enrollments", {
    id: 31,
    method: "POST",
    body: JSON.stringify({ courseId: 1 }),
  });
  const firstBody = await first.json();
  assert.equal(first.status, 201);

  const duplicate = await request("/api/enrollments", {
    id: 31,
    method: "POST",
    body: JSON.stringify({ courseId: 1 }),
  });
  const duplicateBody = await duplicate.json();
  assert.equal(duplicate.status, 201);
  assert.equal(duplicateBody.data.id, firstBody.data.id);

  const simultaneous = await Promise.all([1, 2].map(() => request("/api/enrollments", {
    id: 35,
    method: "POST",
    body: JSON.stringify({ courseId: 1 }),
  })));
  const simultaneousBodies = await Promise.all(simultaneous.map((response) => response.json()));
  assert.equal(simultaneous[0].status, 201);
  assert.equal(simultaneous[1].status, 201);
  assert.equal(simultaneousBodies[0].data.id, simultaneousBodies[1].data.id);

  const paid = await request("/api/enrollments", {
    id: 31,
    method: "POST",
    body: JSON.stringify({ courseId: 2 }),
  });
  assert.equal(paid.status, 409);
  const unpaidEnrollment = await prismaMock.enrollment.create({
    data: { studentId: 41, courseId: 2, status: "ACTIVE" },
  });
  await assert.rejects(
    enrollmentService.getLessonContent(unpaidEnrollment.id, 3, 41),
    (error) => error.statusCode === 403
  );

  const owned = await request(`/api/enrollments/${firstBody.data.id}`, { id: 31 });
  assert.equal(owned.status, 200);
  const otherStudent = await request(`/api/enrollments/${firstBody.data.id}`, { id: 32 });
  assert.equal(otherStudent.status, 404);

  const dashboard = await request("/api/enrollments/my", { id: 31 });
  assert.equal(dashboard.status, 200);
  const dashboardBody = await dashboard.json();
  assert.equal(dashboardBody.data.length, 1);
  assert.equal(dashboardBody.data[0].course.slug, "free-course");

  const complete = await request(`/api/enrollments/${firstBody.data.id}/lessons/1/complete`, {
    id: 31,
    method: "POST",
  });
  assert.equal(complete.status, 200);
  const progressResponse = await request(`/api/enrollments/${firstBody.data.id}/progress`, { id: 31 });
  assert.equal(progressResponse.status, 200);
  assert.equal((await progressResponse.json()).data.progressPercentage, 50);
  const otherProgress = await request(`/api/enrollments/${firstBody.data.id}/progress`, { id: 32 });
  assert.equal(otherProgress.status, 404);
  const savedLesson = await request(`/api/enrollments/${firstBody.data.id}/lessons/1`, { id: 31 });
  assert.equal((await savedLesson.json()).data.completed, true);
  const refreshedDashboard = await request("/api/enrollments/my", { id: 31 });
  const refreshedData = (await refreshedDashboard.json()).data[0];
  assert.equal(Number(refreshedData.progressPercentage), 50);
  assert.equal(refreshedData.nextLesson.id, 2);
  const emptyDashboard = await request("/api/enrollments/my", { id: 50 });
  assert.deepEqual((await emptyDashboard.json()).data, []);
});

test("unpublished courses stop serving lesson content to prior enrollees", async () => {
  const enrollment = enrollments[0];
  courses[0].status = "DRAFT";
  await assert.rejects(
    enrollmentService.getLessonContent(enrollment.id, 1, 21),
    (error) => error.statusCode === 404
  );
  courses[0].status = "PUBLISHED";
});

test("paid enrollment and lesson access require successful order and payment records", async () => {
  await assert.rejects(
    enrollmentService.enrollInCourse("paid-course", 42),
    (error) => error.statusCode === 409
  );
  verifiedPayments.add("42:2");
  const enrollment = await enrollmentService.enrollInCourse("paid-course", 42);
  const lesson = await enrollmentService.getLessonContent(enrollment.id, 3, 42);
  assert.equal(lesson.content, "Paid content");
});
