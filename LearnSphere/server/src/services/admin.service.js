const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();

const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const listTeacherApplications = async () =>
  prisma.instructorProfile.findMany({
    where: {
      applicationStatus: "PENDING",
      user: { is: { emailVerifiedAt: { not: null } } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      applicationStatus: true,
      professionalBio: true,
      expertise: true,
      qualifications: true,
      teachingInterests: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

const decideTeacherApplication = async (userId, applicationStatus) => {
  const parsedUserId = Number(userId);
  if (!Number.isSafeInteger(parsedUserId) || parsedUserId < 1) {
    throw fail("User ID must be a positive integer", 400);
  }
  if (!["APPROVED", "REJECTED"].includes(applicationStatus)) {
    throw fail("Decision must be APPROVED or REJECTED", 400);
  }

  const profile = await prisma.instructorProfile.findUnique({
    where: { userId: parsedUserId },
    select: {
      userId: true,
      applicationStatus: true,
      user: { select: { emailVerifiedAt: true } },
    },
  });
  if (!profile) throw fail("Teacher application not found", 404);
  if (applicationStatus === "APPROVED" && !profile.user.emailVerifiedAt) {
    throw fail("Verify the applicant's email before approving teacher access", 409);
  }
  if (profile.applicationStatus !== "PENDING") {
    throw fail("Only pending teacher applications can be decided", 409);
  }

  return prisma.instructorProfile.update({
    where: { userId: parsedUserId },
    data: { applicationStatus },
    select: {
      userId: true,
      applicationStatus: true,
      updatedAt: true,
    },
  });
};

module.exports = { listTeacherApplications, decideTeacherApplication };
