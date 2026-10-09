const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const jwt = require("jsonwebtoken");

const courses = [
  {
    id: 1,
    instructorId: 10,
    title: "Owned published course",
    slug: "owned-published",
    status: "PUBLISHED",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-02T00:00:00Z"),
    _count: { enrollments: 2, modules: 3 },
  },
  {
    id: 2,
    instructorId: 20,
    title: "Another instructor course",
    slug: "other-course",
    status: "DRAFT",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-03T00:00:00Z"),
    _count: { enrollments: 1, modules: 0 },
  },
];
const enrollments = [
  {
    id: 1,
    studentId: 31,
    status: "ACTIVE",
    progressPercentage: 50,
    enrolledAt: new Date("2026-10-04T00:00:00Z"),
    completedAt: null,
    courseId: 1,
    student: { id: 31, name: "Student One", email: "one@example.com" },
    course: { id: 1, title: courses[0].title, slug: courses[0].slug, instructorId: 10 },
  },
  {
    id: 2,
    studentId: 32,
    status: "COMPLETED",
    progressPercentage: 100,
    enrolledAt: new Date("2026-10-03T00:00:00Z"),
    completedAt: new Date("2026-10-05T00:00:00Z"),
    courseId: 1,
    student: { id: 32, name: "Student Two", email: "two@example.com" },
    course: { id: 1, title: courses[0].title, slug: courses[0].slug, instructorId: 10 },
  },
  {
    id: 3,
    studentId: 33,
    status: "ACTIVE",
    progressPercentage: 10,
    enrolledAt: new Date("2026-10-06T00:00:00Z"),
    completedAt: null,
    courseId: 2,
    student: { id: 33, name: "Other Student", email: "other@example.com" },
    course: { id: 2, title: courses[1].title, slug: courses[1].slug, instructorId: 20 },
  },
];

const prismaMock = {
  courseView: {
    aggregate: async () => ({ _count: { _all: 7 } }),
  },
  payment: {
    groupBy: async () => [
      {
        currency: "INR",
        status: "SUCCESS",
        _sum: { amount: "1500.00" },
        _count: { _all: 2 },
      },
      {
        currency: "INR",
        status: "REFUNDED",
        _sum: { amount: "500.00" },
        _count: { _all: 1 },
      },
    ],
  },
  instructorProfile: {
    findUnique: async () => null,
  },
  course: {
    findMany: async ({ where = {}, orderBy, take }) => {
      const data = courses.filter((course) =>
        Object.entries(where).every(([key, value]) => course[key] === value)
      );
      if (orderBy?.updatedAt === "desc") data.sort((a, b) => b.updatedAt - a.updatedAt);
      if (orderBy?.enrollments?._count === "desc") {
        data.sort((a, b) => b._count.enrollments - a._count.enrollments);
      }
      return data.slice(0, take);
    },
    count: async ({ where = {} }) => courses.filter((course) =>
      Object.entries(where).every(([key, value]) => course[key] === value)
    ).length,
  },
  enrollment: {
    aggregate: async ({ where }) => {
      const matches = enrollments.filter((item) =>
        ["ACTIVE", "COMPLETED"].includes(item.status)
        && (!where.course.instructorId || item.course.instructorId === where.course.instructorId)
      );
      return {
        _count: { _all: matches.length },
        _avg: {
          progressPercentage: matches.length
            ? matches.reduce((sum, item) => sum + item.progressPercentage, 0) / matches.length
            : null,
        },
      };
    },
    count: async ({ where }) => enrollments.filter((item) =>
      (Array.isArray(where.status.in)
        ? where.status.in.includes(item.status)
        : where.status === item.status)
      && (!where.course.instructorId || item.course.instructorId === where.course.instructorId)
      && (!where.course.id || item.courseId === where.course.id)
    ).length,
    findMany: async ({ where, skip, take }) => enrollments
      .filter((item) =>
        where.status.in.includes(item.status)
        && (!where.course.instructorId || item.course.instructorId === where.course.instructorId)
        && (!where.course.id || item.courseId === where.course.id)
      )
      .sort((a, b) => b.enrolledAt - a.enrolledAt)
      .slice(skip, skip + take),
  },
};

process.env.JWT_SECRET = "instructor-tests-use-a-private-local-secret";
const prismaConfigPath = require.resolve("../src/config/prisma");
require.cache[prismaConfigPath] = {
  id: prismaConfigPath,
  filename: prismaConfigPath,
  loaded: true,
  exports: { getPrismaClient: () => prismaMock },
};

const app = require("../src/app");
const server = app.listen(0);
const baseUrl = new Promise((resolve) => {
  server.once("listening", () => resolve(`http://127.0.0.1:${server.address().port}`));
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
}));

const tokenFor = (id, role) =>
  jwt.sign({ id, role, email: `${role.toLowerCase()}@example.com`, emailVerified: true }, process.env.JWT_SECRET);

const request = async (path, { id = 10, role = "INSTRUCTOR" } = {}) =>
  fetch(`${await baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${tokenFor(id, role)}` },
  });

test("instructor dashboard and student list only include owned course records", async () => {
  assert.equal((await request("/api/instructor/dashboard", { role: "STUDENT" })).status, 403);

  const dashboardResponse = await request("/api/instructor/dashboard");
  assert.equal(dashboardResponse.status, 200);
  const dashboard = (await dashboardResponse.json()).data;
  assert.equal(dashboard.metrics.totalCourses, 1);
  assert.equal(dashboard.metrics.publishedCourses, 1);
  assert.equal(dashboard.metrics.totalEnrollments, 2);
  assert.equal(dashboard.metrics.completedEnrollments, 1);
  assert.equal(dashboard.metrics.averageCompletionPercentage, 75);
  assert.equal(dashboard.metrics.courseViews.available, true);
  assert.equal(dashboard.metrics.courseViews.total, 7);
  assert.equal(dashboard.metrics.earnings.available, true);
  assert.equal(dashboard.metrics.earnings.amountsByCurrency[0].grossSuccessfulPayments, 1500);
  assert.equal(dashboard.metrics.earnings.amountsByCurrency[0].refunds, 500);
  assert.equal(dashboard.metrics.earnings.amountsByCurrency[0].netRecordedPayments, 1000);
  assert.equal(dashboard.metrics.earnings.checkoutEnabled, false);
  assert.equal(dashboard.recentlyUpdatedCourses.length, 1);
  assert.equal(dashboard.topCourses[0].id, 1);

  const studentsResponse = await request("/api/instructor/students");
  assert.equal(studentsResponse.status, 200);
  const students = (await studentsResponse.json()).data;
  assert.equal(students.pagination.total, 2);
  assert.deepEqual(students.data.map((item) => item.student.id), [31, 32]);
  assert.ok(students.data.every((item) => item.course.id === 1));

  const otherCourseResponse = await request("/api/instructor/students?courseId=2");
  assert.equal(otherCourseResponse.status, 200);
  assert.equal((await otherCourseResponse.json()).data.pagination.total, 0);
  assert.equal((await request("/api/instructor/students?page=0")).status, 400);
});
