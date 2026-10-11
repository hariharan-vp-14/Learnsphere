const bcrypt = require("bcryptjs");
const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();
const MAX_ADMINISTRATORS = 5;

const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const provisionAdmin = async ({ name, email, password }) => {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 191) {
    throw fail("Name is required and must be no longer than 191 characters", 400);
  }
  if (typeof email !== "string" || !/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
    throw fail("A valid @gmail.com administrator email is required", 400);
  }
  if (typeof password !== "string"
      || Buffer.byteLength(password, "utf8") < 8
      || Buffer.byteLength(password, "utf8") > 72) {
    throw fail("Password must be between 8 and 72 bytes", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    return await prisma.$transaction(async (tx) => {
      // Updating the seeded singleton obtains a MySQL row lock shared by every provisioner.
      await tx.adminCapacityLock.update({
        where: { id: 1 },
        data: { updatedAt: new Date() },
      });
      const administratorCount = await tx.user.count({ where: { role: "ADMIN" } });
      if (administratorCount >= MAX_ADMINISTRATORS) {
        throw fail("The maximum of five administrator accounts has been reached", 409);
      }

      const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) {
        throw fail("An account with this email already exists; admin provisioning never changes existing accounts", 409);
      }

      return tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "ADMIN",
          emailVerifiedAt: new Date(),
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw fail("An account with this email already exists", 409);
    }
    throw error;
  }
};

module.exports = { MAX_ADMINISTRATORS, provisionAdmin };
