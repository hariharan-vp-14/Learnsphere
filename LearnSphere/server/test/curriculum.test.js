const assert = require("node:assert/strict");
const { test } = require("node:test");

const course = { id: 1, instructorId: 10, title: "Owned course" };
const otherCourse = { id: 2, instructorId: 20, title: "Other course" };
const modules = [
  { id: 1, courseId: 1, title: "Existing module", description: null, position: 2 },
];
const lessons = [];

const prismaMock = {
  course: {
    findUnique: async ({ where }) => {
      const selectedCourse = [course, otherCourse].find((item) => item.id === where.id);
      if (!selectedCourse) return null;
      return {
        ...selectedCourse,
        modules: modules.filter((module) => module.courseId === selectedCourse.id)
          .sort((a, b) => a.position - b.position)
          .map((module) => ({
            ...module,
            lessons: lessons.filter((lesson) => lesson.moduleId === module.id),
          })),
      };
    },
  },
  module: {
    findFirst: async ({ where }) => modules
      .filter((item) => item.courseId === where.courseId)
      .sort((a, b) => b.position - a.position)
      .map(({ position }) => ({ position }))[0] || null,
    create: async ({ data }) => {
      const created = { id: modules.length + 1, ...data, lessons: [] };
      modules.push(created);
      return created;
    },
    findUnique: async ({ where, include }) => {
      const selected = modules.find((item) => item.id === where.id);
      if (!selected) return null;
      return {
        ...selected,
        ...(include?.course ? { course: [course, otherCourse].find((item) => item.id === selected.courseId) } : {}),
      };
    },
  },
  lesson: {
    findFirst: async ({ where }) => lessons
      .filter((item) => item.moduleId === where.moduleId)
      .sort((a, b) => b.position - a.position)
      .map(({ position }) => ({ position }))[0] || null,
    create: async ({ data }) => {
      const created = { id: lessons.length + 1, ...data };
      lessons.push(created);
      return created;
    },
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
const curriculumService = require("../src/services/curriculum.service");

test("curriculum changes enforce course ownership and append after the current position", async () => {
  const instructor = { id: 10, role: "INSTRUCTOR" };
  await assert.rejects(
    curriculumService.getManageCourse(2, instructor),
    (error) => error.statusCode === 404
  );

  const addedModule = await curriculumService.createModule(
    1,
    { title: "Next module", description: "Module summary" },
    instructor
  );
  assert.equal(addedModule.position, 3);
  assert.equal(addedModule.courseId, 1);

  await assert.rejects(
    curriculumService.createLesson(addedModule.id, {
      title: "Bad link",
      videoUrl: "http://video.example/test",
    }, instructor),
    (error) => error.statusCode === 400
  );

  const addedLesson = await curriculumService.createLesson(addedModule.id, {
    title: "Secure lesson",
    content: "Lesson content",
    videoUrl: "https://video.example/test",
  }, instructor);
  assert.equal(addedLesson.position, 0);
  assert.equal(addedLesson.content, "Lesson content");
});
