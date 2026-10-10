require("dotenv").config();

const bcrypt = require("bcryptjs");

const main = async () => {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Instructor provisioning is available only when NODE_ENV=development");
  }

  const { DEV_INSTRUCTOR_EMAIL, DEV_INSTRUCTOR_NAME, DEV_INSTRUCTOR_PASSWORD } =
    process.env;
  if (!DEV_INSTRUCTOR_EMAIL || !DEV_INSTRUCTOR_NAME || !DEV_INSTRUCTOR_PASSWORD) {
    throw new Error(
      "Set DEV_INSTRUCTOR_EMAIL, DEV_INSTRUCTOR_NAME, and DEV_INSTRUCTOR_PASSWORD in server/.env"
    );
  }

  const email = DEV_INSTRUCTOR_EMAIL.trim().toLowerCase();
  const name = DEV_INSTRUCTOR_NAME.trim();
  const password = DEV_INSTRUCTOR_PASSWORD;
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
    throw new Error("DEV_INSTRUCTOR_EMAIL must be a valid @gmail.com address");
  }
  if (!name || name.length > 191) {
    throw new Error("DEV_INSTRUCTOR_NAME must be between 1 and 191 characters");
  }
  if (Buffer.byteLength(password, "utf8") < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("DEV_INSTRUCTOR_PASSWORD must be between 8 and 72 bytes");
  }

  const { getPrismaClient } = require("../src/config/prisma");
  const prisma = getPrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error(
        "An account already uses DEV_INSTRUCTOR_EMAIL; this script will not change an existing account"
      );
    }

    await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: "INSTRUCTOR",
          emailVerifiedAt: new Date(),
        },
      });
      await transaction.instructorProfile.create({
        data: { userId: user.id, applicationStatus: "APPROVED" },
      });
    });
    console.info("Development instructor account created and email-verified.");
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
