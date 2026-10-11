const assert = require("node:assert/strict");
const { test } = require("node:test");

const administrators = [];
let transactionQueue = Promise.resolve();

const prismaMock = {
  adminCapacityLock: {
    update: async ({ where }) => {
      assert.equal(where.id, 1);
      return { id: 1 };
    },
  },
  user: {
    count: async ({ where }) => administrators.filter((user) => user.role === where.role).length,
    findUnique: async ({ where }) => administrators.find((user) => user.email === where.email) || null,
    create: async ({ data, select }) => {
      const user = {
        id: administrators.length + 1,
        createdAt: new Date(),
        ...data,
      };
      administrators.push(user);
      return Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]));
    },
  },
  $transaction: async (callback) => {
    const prior = transactionQueue;
    let release;
    transactionQueue = new Promise((resolve) => { release = resolve; });
    await prior;
    try {
      return await callback(prismaMock);
    } finally {
      release();
    }
  },
};

const prismaConfigPath = require.resolve("../src/config/prisma");
require.cache[prismaConfigPath] = {
  id: prismaConfigPath,
  filename: prismaConfigPath,
  loaded: true,
  exports: { getPrismaClient: () => prismaMock },
};
const { provisionAdmin } = require("../src/services/admin-provisioning.service");

const details = (number) => ({
  name: `Administrator ${number}`,
  email: `admin${number}@gmail.com`,
  password: `Admin-Pass-${number}`,
});

test("administrator provisioning hashes passwords and enforces the five-account limit", async () => {
  for (let index = 1; index <= 5; index += 1) {
    const admin = await provisionAdmin(details(index));
    assert.equal(admin.role, "ADMIN");
    assert.equal("passwordHash" in admin, false);
  }
  assert.equal(administrators.length, 5);
  assert.match(administrators[0].passwordHash, /^\$2/);
  await assert.rejects(
    provisionAdmin(details(6)),
    (error) => error.statusCode === 409
  );
  assert.equal(administrators.length, 5);
});

test("concurrent administrator provisioning cannot exceed five accounts", async () => {
  administrators.splice(0);
  for (let index = 1; index <= 4; index += 1) {
    await provisionAdmin(details(index));
  }
  const results = await Promise.allSettled([
    provisionAdmin(details(5)),
    provisionAdmin(details(6)),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(administrators.length, 5);
});

test("provisioning refuses to promote an existing account", async () => {
  const countBefore = administrators.length;
  await assert.rejects(
    provisionAdmin({ ...details(1), name: "Changed Existing Admin" }),
    (error) => error.statusCode === 409
  );
  assert.equal(administrators.length, countBefore);
});
