const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();
const PAGE_SIZE = 10;

const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const parsePositiveInt = (value, label, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw fail(`${label} must be a positive integer`, 400);
  }
  return parsed;
};

const getApplicationWhere = ({ status, search } = {}) => {
  const where = {};
  if (status && status !== "ALL") {
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      throw fail("Status must be PENDING, APPROVED, REJECTED, or ALL", 400);
    }
    where.applicationStatus = status;
  }
  if (search) {
    if (typeof search !== "string" || search.trim().length > 191) {
      throw fail("Search must be no longer than 191 characters", 400);
    }
    const term = search.trim();
    where.user = {
      is: {
        OR: [
          { name: { contains: term } },
          { email: { contains: term } },
        ],
      },
    };
  }
  return where;
};

const applicationSelect = {
  id: true,
  userId: true,
  applicationStatus: true,
  professionalBio: true,
  expertise: true,
  qualifications: true,
  teachingInterests: true,
  createdAt: true,
  reviewedAt: true,
  rejectionReason: true,
  reviewer: { select: { id: true, name: true, email: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  },
};

const getApplicationStats = async () => {
  const [totalApplications, pendingApplications, approvedTeachers, rejectedApplications] =
    await Promise.all([
      prisma.instructorProfile.count(),
      prisma.instructorProfile.count({ where: { applicationStatus: "PENDING" } }),
      prisma.instructorProfile.count({ where: { applicationStatus: "APPROVED" } }),
      prisma.instructorProfile.count({ where: { applicationStatus: "REJECTED" } }),
    ]);
  return { totalApplications, pendingApplications, approvedTeachers, rejectedApplications };
};

const getAdminDashboard = async () => {
  const [stats, recentApplications] = await Promise.all([
    getApplicationStats(),
    prisma.instructorProfile.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: applicationSelect,
    }),
  ]);
  return { stats, recentApplications };
};

const listTeacherApplications = async ({ page = 1, status = "ALL", search = "" } = {}) => {
  const parsedPage = parsePositiveInt(page, "Page", 100000);
  const where = getApplicationWhere({ status, search });
  const [total, applications] = await Promise.all([
    prisma.instructorProfile.count({ where }),
    prisma.instructorProfile.findMany({
      where,
      skip: (parsedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: applicationSelect,
    }),
  ]);

  return {
    data: applications,
    pagination: {
      page: parsedPage,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
    stats: await getApplicationStats(),
  };
};

const getTeacherApplication = async (profileId) => {
  const id = parsePositiveInt(profileId, "Application ID");
  const application = await prisma.instructorProfile.findUnique({
    where: { id },
    select: {
      ...applicationSelect,
      reviews: {
        orderBy: { reviewedAt: "desc" },
        select: {
          id: true,
          applicationStatus: true,
          rejectionReason: true,
          reviewedAt: true,
          reviewer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!application) throw fail("Teacher application not found", 404);
  return application;
};

const getReviewHistory = async (profileId) => {
  const id = parsePositiveInt(profileId, "Application ID");
  const profile = await prisma.instructorProfile.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!profile) throw fail("Teacher application not found", 404);
  return prisma.instructorApplicationReview.findMany({
    where: { instructorProfileId: id },
    orderBy: { reviewedAt: "desc" },
    select: {
      id: true,
      applicationStatus: true,
      rejectionReason: true,
      reviewedAt: true,
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });
};

const decideTeacherApplicationByProfileId = async (
  profileId,
  applicationStatus,
  reviewerId,
  rejectionReason
) => {
  const id = parsePositiveInt(profileId, "Application ID");
  if (!["APPROVED", "REJECTED"].includes(applicationStatus)) {
    throw fail("Decision must be APPROVED or REJECTED", 400);
  }

  let reason = null;
  if (applicationStatus === "REJECTED" && rejectionReason !== undefined) {
    if (typeof rejectionReason !== "string" || rejectionReason.trim().length > 1000) {
      throw fail("Rejection reason must be text no longer than 1000 characters", 400);
    }
    reason = rejectionReason.trim() || null;
  } else if (applicationStatus === "APPROVED" && rejectionReason !== undefined) {
    throw fail("A rejection reason is only valid when rejecting an application", 400);
  }

  const profile = await prisma.instructorProfile.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      applicationStatus: true,
      user: { select: { emailVerifiedAt: true } },
    },
  });
  if (!profile) throw fail("Teacher application not found", 404);
  if (applicationStatus === "APPROVED" && !profile.user.emailVerifiedAt) {
    throw fail("Verify the applicant's email before approving teacher access", 409);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.instructorProfile.updateMany({
      where: { id, applicationStatus: "PENDING" },
      data: {
        applicationStatus,
        reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
    if (updated.count !== 1) {
      throw fail("Only pending teacher applications can be decided", 409);
    }
    await tx.user.update({
      where: { id: profile.userId },
      data: { role: applicationStatus === "APPROVED" ? "INSTRUCTOR" : "STUDENT" },
    });
    await tx.instructorApplicationReview.create({
      data: {
        instructorProfileId: id,
        reviewerId,
        applicationStatus,
        rejectionReason: reason,
      },
    });
    return tx.instructorProfile.findUnique({
      where: { id },
      select: applicationSelect,
    });
  });
};

const decideTeacherApplication = async (userId, applicationStatus, reviewerId, reason) => {
  const parsedUserId = parsePositiveInt(userId, "User ID");
  const profile = await prisma.instructorProfile.findUnique({
    where: { userId: parsedUserId },
    select: { id: true },
  });
  if (!profile) throw fail("Teacher application not found", 404);
  return decideTeacherApplicationByProfileId(
    profile.id,
    applicationStatus,
    reviewerId,
    reason
  );
};

module.exports = {
  decideTeacherApplication,
  decideTeacherApplicationByProfileId,
  getAdminDashboard,
  getReviewHistory,
  getTeacherApplication,
  listTeacherApplications,
};
