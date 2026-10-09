const assert = require("node:assert/strict");
const { test } = require("node:test");

const instructorProfiles = new Set([10]);
const prismaMock = {
  instructorProfile: {
    findUnique: async ({ where }) =>
      instructorProfiles.has(where.userId) ? { id: where.userId } : null,
  },
};

const prismaConfigPath = require.resolve("../src/config/prisma");
require.cache[prismaConfigPath] = {
  id: prismaConfigPath,
  filename: prismaConfigPath,
  loaded: true,
  exports: { getPrismaClient: () => prismaMock },
};

const { requireRoles } = require("../src/middleware/role.middleware");

const runGuard = async (user) => {
  let nextCalled = false;
  let responseStatus;
  let responseBody;
  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };
  await requireRoles("INSTRUCTOR")({ user }, res, () => {
    nextCalled = true;
  });
  return { nextCalled, responseStatus, responseBody };
};

test("existing student tokens gain instructor access only when a profile exists", async () => {
  const upgradedStudent = await runGuard({ id: 10, role: "STUDENT", roles: ["STUDENT"] });
  assert.equal(upgradedStudent.nextCalled, true);

  const ordinaryStudent = await runGuard({ id: 11, role: "STUDENT", roles: ["STUDENT"] });
  assert.equal(ordinaryStudent.nextCalled, false);
  assert.equal(ordinaryStudent.responseStatus, 403);
  assert.equal(ordinaryStudent.responseBody.success, false);

  const admin = await runGuard({ id: 1, role: "ADMIN", roles: ["ADMIN"] });
  assert.equal(admin.nextCalled, false, "Administrator is not silently elevated unless route allows ADMIN");
  assert.equal(admin.responseStatus, 403);
});
