const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const jwt = require("jsonwebtoken");

const courses = [];
const modules = [];
const lessons = [];
const courseViews = new Map();
let nextCourseId = 1;

const prismaMock = {
  course: {
    findMany: async ({ where = {}, orderBy }) => {
      const matches = courses.filter((course) =>
        Object.entries(where).every(([key, value]) => course[key] === value)
      );
      if (orderBy?.createdAt === "desc") {
        matches.sort((a, b) => b.createdAt - a.createdAt);
      }
      if (orderBy?.updatedAt === "desc") {
        matches.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return matches.map(withRelations);
    },
    findFirst: async ({ where }) =>
      courses.find((course) =>
        Object.entries(where).every(([key, value]) => {
          if (key === "id" && value && typeof value === "object" && "not" in value) {
            return course.id !== value.not;
          }
          return course[key] === value;
        })
      ) || null,
    findUnique: async ({ where }) =>
      courses.find((course) => course.id === where.id) || null,
    create: async ({ data }) => {
      const course = {
        id: nextCourseId++,
        status: "DRAFT",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      courses.push(course);
      return withRelations(course);
    },
    update: async ({ where, data }) => {
      const course = courses.find((item) => item.id === where.id);
      Object.assign(course, data, { updatedAt: new Date() });
      return withRelations(course);
    },
  },
  module: {
    count: async ({ where }) => modules.filter((module) => module.courseId === where.courseId).length,
  },
  lesson: {
    count: async ({ where }) => lessons.filter((lesson) =>
      modules.some((module) => module.id === lesson.moduleId && module.courseId === where.module.courseId)
    ).length,
  },
  courseView: {
    upsert: async ({ where, create }) => {
      const key = `${where.courseId_visitorId.courseId}:${where.courseId_visitorId.visitorId}`;
      if (!courseViews.has(key)) courseViews.set(key, { id: courseViews.size + 1, ...create });
      return courseViews.get(key);
    },
  },
  instructorProfile: {
    findUnique: async () => null,
  },
};

function withRelations(course) {
  return {
    ...course,
    instructor: { id: course.instructorId, name: `Instructor ${course.instructorId}` },
    _count: { modules: 0, enrollments: 0 },
  };
}

process.env.JWT_SECRET = "course-tests-use-a-private-local-secret";
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
  server.once("listening", () => {
    resolve(`http://127.0.0.1:${server.address().port}`);
  });
});

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
);

const tokenFor = (id, role) =>
  jwt.sign({ id, role, email: `${role.toLowerCase()}@example.com`, emailVerified: true }, process.env.JWT_SECRET);

const request = async (path, { role, id = 1, ...options } = {}) =>
  fetch(`${await baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(role ? { Authorization: `Bearer ${tokenFor(id, role)}` } : {}),
      ...options.headers,
    },
  });

test("public catalog only exposes published courses and instructor actions are role/owner protected", async () => {
  const anonymousCreate = await request("/api/courses", {
    method: "POST",
    body: JSON.stringify({ title: "Intro to AI", description: "Learn AI", price: 0 }),
  });
  assert.equal(anonymousCreate.status, 401);

  const studentCreate = await request("/api/courses", {
    role: "STUDENT",
    method: "POST",
    body: JSON.stringify({ title: "Intro to AI", description: "Learn AI", price: 0 }),
  });
  assert.equal(studentCreate.status, 403);
  const studentCourseManagement = await request("/api/courses/mine", {
    role: "STUDENT",
  });
  assert.equal(studentCourseManagement.status, 403);

  const invalidInstructorCreate = await request("/api/courses", {
    role: "INSTRUCTOR",
    method: "POST",
    body: JSON.stringify({ title: "  ", description: "Learn AI", price: -1 }),
  });
  assert.equal(invalidInstructorCreate.status, 400);

  const createResponse = await request("/api/courses", {
    role: "INSTRUCTOR",
    id: 10,
    method: "POST",
    body: JSON.stringify({
      title: "  Intro to AI  ",
      description: "Start learning artificial intelligence.",
      price: 0,
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()).data;
  assert.equal(created.slug, "intro-to-ai");
  assert.equal(created.status, "DRAFT");
  assert.equal(created.instructorId, 10);

  const hiddenDetail = await request(`/api/courses/${created.slug}`);
  assert.equal(hiddenDetail.status, 404, "Draft course is not public");
  const emptyCatalog = await request("/api/courses");
  assert.deepEqual((await emptyCatalog.json()).data, []);

  const otherInstructorEdit = await request(`/api/courses/${created.id}`, {
    role: "INSTRUCTOR",
    id: 11,
    method: "PUT",
    body: JSON.stringify({ title: "Changed title" }),
  });
  assert.equal(otherInstructorEdit.status, 404);

  const updateResponse = await request(`/api/courses/${created.id}`, {
    role: "INSTRUCTOR",
    id: 10,
    method: "PUT",
    body: JSON.stringify({ title: "Intro to Practical AI" }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = (await updateResponse.json()).data;
  assert.equal(updated.slug, "intro-to-practical-ai");
  assert.equal(updated.description, "Start learning artificial intelligence.");

  const publishResponse = await request(`/api/courses/${created.id}/publish`, {
    role: "INSTRUCTOR",
    id: 10,
    method: "POST",
  });
  assert.equal(publishResponse.status, 400, "A course without curriculum cannot be published");
  modules.push({ id: 1, courseId: created.id });
  lessons.push({ id: 1, moduleId: 1 });
  const publishWithCurriculum = await request(`/api/courses/${created.id}/publish`, {
    role: "INSTRUCTOR",
    id: 10,
    method: "POST",
  });
  assert.equal(publishWithCurriculum.status, 200);
  assert.equal((await publishWithCurriculum.json()).data.status, "PUBLISHED");

  const catalogResponse = await request("/api/courses");
  const catalog = (await catalogResponse.json()).data;
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].instructor.name, "Instructor 10");

  const detailResponse = await request(`/api/courses/${updated.slug}`);
  assert.equal(detailResponse.status, 200);

  const visitorId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const viewResponse = await request(`/api/courses/${updated.slug}/view`, {
    method: "POST",
    body: JSON.stringify({ visitorId }),
  });
  assert.equal(viewResponse.status, 201);
  assert.deepEqual((await viewResponse.json()).data, { recorded: true });
  const repeatedViewResponse = await request(`/api/courses/${updated.slug}/view`, {
    method: "POST",
    body: JSON.stringify({ visitorId }),
  });
  assert.equal(repeatedViewResponse.status, 201);
  assert.equal(courseViews.size, 1, "Repeated page views in the same browser session are deduplicated");

  const invalidViewResponse = await request(`/api/courses/${updated.slug}/view`, {
    method: "POST",
    body: JSON.stringify({ visitorId: "not-a-uuid" }),
  });
  assert.equal(invalidViewResponse.status, 400);

  const instructorCourses = await request("/api/courses/mine", {
    role: "INSTRUCTOR",
    id: 10,
  });
  assert.equal((await instructorCourses.json()).data.length, 1);

  const unpublishResponse = await request(`/api/courses/${created.id}/unpublish`, {
    role: "INSTRUCTOR",
    id: 10,
    method: "POST",
  });
  assert.equal((await unpublishResponse.json()).data.status, "DRAFT");
  assert.equal((await request(`/api/courses/${updated.slug}`)).status, 404);

  const archiveResponse = await request(`/api/courses/${created.id}/archive`, {
    role: "INSTRUCTOR",
    id: 10,
    method: "POST",
  });
  assert.equal((await archiveResponse.json()).data.status, "ARCHIVED");
  assert.equal((await request("/api/courses")).status, 200);

  const invalidIdResponse = await request("/api/courses/not-an-id/publish", {
    role: "INSTRUCTOR",
    id: 10,
    method: "POST",
  });
  assert.equal(invalidIdResponse.status, 400);
});
