const assert = require("node:assert/strict");
const { test } = require("node:test");

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

test("only database-derived approved roles grant instructor access", async () => {
  const approvedInstructor = await runGuard({
    id: 10,
    role: "STUDENT",
    roles: ["STUDENT", "INSTRUCTOR"],
  });
  assert.equal(approvedInstructor.nextCalled, true);

  const ordinaryStudent = await runGuard({ id: 11, role: "STUDENT", roles: ["STUDENT"] });
  assert.equal(ordinaryStudent.nextCalled, false);
  assert.equal(ordinaryStudent.responseStatus, 403);
  assert.equal(ordinaryStudent.responseBody.success, false);

  const pendingTeacher = await runGuard({ id: 12, role: "STUDENT", roles: ["STUDENT"] });
  assert.equal(pendingTeacher.nextCalled, false, "Pending applicants do not gain teacher access");

  const admin = await runGuard({ id: 1, role: "ADMIN", roles: ["ADMIN"] });
  assert.equal(admin.nextCalled, false, "Administrator access must be explicitly allowed by each route");
  assert.equal(admin.responseStatus, 403);
});
