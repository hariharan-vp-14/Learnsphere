const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { getPrismaClient } = require("../config/prisma");
const { sendVerificationEmail } = require("./email.service");

const prisma = getPrismaClient();
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const createAuthError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const normalizeEmail = (email) => email.trim().toLowerCase();
const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const validateEmail = (email) => {
  if (typeof email !== "string") {
    throw createAuthError("A valid Gmail address is required", 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    !normalizedEmail.endsWith("@gmail.com") ||
    normalizedEmail.length > 191
  ) {
    throw createAuthError("A valid @gmail.com address is required", 400);
  }
};

const issueEmailVerification = async (user, accountType = "STUDENT") => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationTokenHash: hashVerificationToken(token),
      emailVerificationTokenExpiresAt: expiresAt,
    },
  });

  try {
    await sendVerificationEmail({ email: user.email, token, accountType });
  } catch (error) {
    console.error("Verification email delivery failed:", error.message);
    throw createAuthError(
      "Verification email could not be sent. Check SMTP settings in server/.env and try again.",
      503
    );
  }
};

const validateCredentials = ({ email, password }) => {
  validateEmail(email);

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw createAuthError("Password must be at least 8 characters and no more than 72 bytes", 400);
  }
};

const toPublicUser = ({ id, name, email, role }, roles = [role]) => ({
  id,
  name,
  email,
  role,
  roles,
});

const getUserRoles = async (user) => {
  if (user.role === "ADMIN") return ["ADMIN", "INSTRUCTOR"];
  if (user.role === "INSTRUCTOR") return ["STUDENT", "INSTRUCTOR"];

  const instructorProfile = await prisma.instructorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return instructorProfile ? ["STUDENT", "INSTRUCTOR"] : ["STUDENT"];
};

const register = async (input) => {
  const { name, email, password, role } =
    input && typeof input === "object" ? input : {};

  if (role !== undefined && !["STUDENT", "INSTRUCTOR"].includes(role)) {
    throw createAuthError("Account type must be STUDENT or INSTRUCTOR", 400);
  }

  if (typeof name !== "string" || !name.trim() || name.trim().length > 191) {
    throw createAuthError("Name is required and must be no longer than 191 characters", 400);
  }

  validateCredentials({ email, password });
  const normalizedEmail = normalizeEmail(email);

  const passwordHash = await bcrypt.hash(password, 12);

  if (role === "INSTRUCTOR") {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (!(await bcrypt.compare(password, existingUser.passwordHash))) {
        throw createAuthError("Invalid email or password for the existing account", 401);
      }

      if (existingUser.role === "ADMIN") {
        throw createAuthError("This account already has administrator access", 409);
      }

      const existingProfile = await prisma.instructorProfile.findUnique({
        where: { userId: existingUser.id },
        select: { id: true },
      });
      await prisma.instructorProfile.upsert({
        where: { userId: existingUser.id },
        create: { userId: existingUser.id },
        update: {},
      });
      if (!existingUser.emailVerifiedAt) await issueEmailVerification(existingUser, "INSTRUCTOR");

      return {
        ...toPublicUser(existingUser, ["STUDENT", "INSTRUCTOR"]),
        emailVerified: Boolean(existingUser.emailVerifiedAt),
        teacherAccessAdded: !existingProfile,
        existingAccount: true,
      };
    }
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "STUDENT",
        emailVerifiedAt: null,
        ...(role === "INSTRUCTOR" ? { instructorProfile: { create: {} } } : {}),
      },
    });

    await issueEmailVerification(user, role || "STUDENT");
    return {
      ...toPublicUser(
        user,
        role === "INSTRUCTOR" ? ["STUDENT", "INSTRUCTOR"] : ["STUDENT"]
      ),
      emailVerified: false,
      ...(role === "INSTRUCTOR" ? { teacherAccessAdded: true } : {}),
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw createAuthError("An account with this email already exists", 409);
    }

    throw error;
  }
};

const login = async (input) => {
  const { email, password, expectedRole } =
    input && typeof input === "object" ? input : {};

  if (expectedRole !== undefined && !["STUDENT", "INSTRUCTOR"].includes(expectedRole)) {
    throw createAuthError("Choose Student or Teacher sign in", 400);
  }

  validateCredentials({ email, password });
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!user) {
    throw createAuthError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw createAuthError("Invalid email or password", 401);
  }

  if (!user.emailVerifiedAt) {
    throw createAuthError("Verify your email before signing in", 403);
  }

  const roles = await getUserRoles(user);
  const roleMatches = expectedRole === undefined || roles.includes(expectedRole);
  if (!roleMatches) {
    throw createAuthError(
      expectedRole === "INSTRUCTOR"
        ? "This account is not a teacher account. Choose Student sign in or use a provisioned teacher account."
        : "This account is not a student account. Choose Teacher sign in.",
      403
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      roles,
      emailVerified: true,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: toPublicUser(user, roles),
  };
};

const verifyEmail = async (token) => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    throw createAuthError("Verification link is invalid or expired", 400);
  }

  const result = await prisma.user.updateMany({
    where: {
      emailVerificationTokenHash: hashVerificationToken(token),
      emailVerificationTokenExpiresAt: { gt: new Date() },
      emailVerifiedAt: null,
    },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationTokenExpiresAt: null,
    },
  });

  if (result.count !== 1) {
    throw createAuthError("Verification link is invalid or expired", 400);
  }

  return { emailVerified: true };
};

const resendVerification = async (input) => {
  const email = input && typeof input.email === "string" ? input.email : "";
  validateEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (user && !user.emailVerifiedAt) {
    await issueEmailVerification(user);
  }

  return { message: "If an unverified account exists, a verification email has been sent." };
};

const getProfile = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true },
  });

  if (!user) return null;
  const { emailVerifiedAt, ...profile } = user;
  return {
    ...profile,
    roles: await getUserRoles(user),
    emailVerified: Boolean(emailVerifiedAt),
  };
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  getProfile,
};
