require("dotenv").config();

const main = async () => {
  if (process.env.ADMIN_PROVISION_CONFIRM !== "CREATE_ADMIN") {
    throw new Error("Set ADMIN_PROVISION_CONFIRM=CREATE_ADMIN to run controlled administrator provisioning");
  }

  const { ADMIN_PROVISION_EMAIL, ADMIN_PROVISION_NAME, ADMIN_PROVISION_PASSWORD } = process.env;
  if (!ADMIN_PROVISION_EMAIL || !ADMIN_PROVISION_NAME || !ADMIN_PROVISION_PASSWORD) {
    throw new Error(
      "Set ADMIN_PROVISION_EMAIL, ADMIN_PROVISION_NAME, and ADMIN_PROVISION_PASSWORD in server/.env"
    );
  }

  const { getPrismaClient } = require("../src/config/prisma");
  const { provisionAdmin } = require("../src/services/admin-provisioning.service");
  const prisma = getPrismaClient();
  try {
    const admin = await provisionAdmin({
      email: ADMIN_PROVISION_EMAIL,
      name: ADMIN_PROVISION_NAME,
      password: ADMIN_PROVISION_PASSWORD,
    });
    console.info(`Administrator account provisioned: ${admin.email} (ID ${admin.id}).`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
