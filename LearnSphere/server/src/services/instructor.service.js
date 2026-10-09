const { getPrismaClient } = require("../config/prisma");

const prisma = getPrismaClient();
const PAGE_SIZE = 25;

const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const courseScope = (user) =>
  user.role === "ADMIN" ? {} : { instructorId: user.id };

const getDashboard = async (user) => {
  const where = courseScope(user);
  const [
    courses,
    topCourses,
    totalCourses,
    publishedCourses,
    completedEnrollments,
    enrollmentAggregate,
    courseViewAggregate,
    paymentGroups,
  ] = await Promise.all([
    prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { enrollments: true, modules: true, views: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { enrollments: true, modules: true, views: true } },
      },
      orderBy: { enrollments: { _count: "desc" } },
      take: 5,
    }),
    prisma.course.count({ where }),
    prisma.course.count({ where: { ...where, status: "PUBLISHED" } }),
    prisma.enrollment.count({
      where: {
        status: "COMPLETED",
        course: where,
      },
    }),
    prisma.enrollment.aggregate({
      where: {
        status: { in: ["ACTIVE", "COMPLETED"] },
        course: where,
      },
      _count: { _all: true },
      _avg: { progressPercentage: true },
    }),
    prisma.courseView.aggregate({
      where: { course: where },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["currency", "status"],
      where: {
        status: { in: ["SUCCESS", "REFUNDED"] },
        order: { course: where },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const enrollmentCount = enrollmentAggregate._count._all;
  const earningsByCurrency = new Map();
  for (const group of paymentGroups) {
    const amounts = earningsByCurrency.get(group.currency) || {
      currency: group.currency,
      grossSuccessfulPayments: 0,
      refunds: 0,
      netRecordedPayments: 0,
      successfulPaymentCount: 0,
      refundCount: 0,
    };
    const amount = Number(group._sum.amount || 0);
    if (group.status === "SUCCESS") {
      amounts.grossSuccessfulPayments += amount;
      amounts.successfulPaymentCount += group._count._all;
    } else {
      amounts.refunds += amount;
      amounts.refundCount += group._count._all;
    }
    amounts.netRecordedPayments =
      amounts.grossSuccessfulPayments - amounts.refunds;
    earningsByCurrency.set(group.currency, amounts);
  }

  return {
    metrics: {
      totalCourses,
      publishedCourses,
      totalEnrollments: enrollmentCount,
      completedEnrollments,
      averageCompletionPercentage: enrollmentCount
        ? Number(enrollmentAggregate._avg.progressPercentage)
        : null,
      courseViews: {
        available: true,
        total: courseViewAggregate._count._all,
        basis: "Unique browser sessions that opened a published course since tracking was enabled.",
      },
      earnings: {
        available: true,
        amountsByCurrency: [...earningsByCurrency.values()],
        basis: "Successful and refunded payment records currently stored in the database.",
        checkoutEnabled: false,
      },
    },
    topCourses,
    recentlyUpdatedCourses: courses.slice(0, 5),
  };
};

const listStudents = async (user, { page = 1, courseId } = {}) => {
  const parsedPage = Number(page);
  if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 || parsedPage > 100000) {
    throw fail("Page must be a positive integer", 400);
  }
  const parsedCourseId = courseId === undefined ? undefined : Number(courseId);
  if (parsedCourseId !== undefined
      && (!Number.isSafeInteger(parsedCourseId) || parsedCourseId < 1)) {
    throw fail("Course ID must be a positive integer", 400);
  }

  const where = {
    status: { in: ["ACTIVE", "COMPLETED"] },
    course: {
      ...courseScope(user),
      ...(parsedCourseId ? { id: parsedCourseId } : {}),
    },
  };
  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip: (parsedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { enrolledAt: "desc" },
      select: {
        id: true,
        status: true,
        progressPercentage: true,
        enrolledAt: true,
        completedAt: true,
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
  ]);

  return {
    data: enrollments,
    pagination: {
      page: parsedPage,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
};

module.exports = { getDashboard, listStudents };
