const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { getPrismaClient } = require("../config/prisma");
const { sendVerificationEmail } = require("./email.service");

const prisma = getPrismaClient();
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/api/auth/google/callback";
const GOOGLE_REDIRECT_URI = GOOGLE_CALLBACK_URL;

const getAuthIdentityModel = () => (prisma && prisma.authIdentity ? prisma.authIdentity : null);

const getGoogleClient = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return null;
  }
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  });
};

const ensureValidGoogleRole = (role) => {
  const normalizedRole = String(role || "INSTRUCTOR").toUpperCase();
  if (normalizedRole !== "INSTRUCTOR" && normalizedRole !== "ADMIN") {
    throw createAuthError("Google sign-in is available for teacher and administrator accounts only", 400);
  }
  return normalizedRole;
};

const buildGoogleState = (role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    nonce,
    state: jwt.sign({ role: ensureValidGoogleRole(role), nonce }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    }),
  };
};

const verifyGoogleState = (state) => {
  if (!state) {
    throw createAuthError("Google sign-in request is invalid or expired", 400);
  }

  try {
    const payload = jwt.verify(state, process.env.JWT_SECRET);
    const role = ensureValidGoogleRole(payload.role);
    return { role, nonce: payload.nonce };
  } catch (error) {
    throw createAuthError("Google sign-in request is invalid or expired", 400);
  }
};

const persistGoogleIdentity = async ({ userId, providerUserId, email }) => {
  const authIdentity = getAuthIdentityModel();
  if (!authIdentity) {
    return;
  }
  const provider = "GOOGLE";
  const existing = await authIdentity.findUnique({
    where: { provider_providerUserId: { provider, providerUserId } },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== userId) {
    throw createAuthError("This Google account is already linked to another LearnSphere account", 409);
  }

  if (!existing) {
    await authIdentity.create({
      data: { userId, provider, providerUserId, email },
    });
  } else if (existing.userId === userId && email) {
    await authIdentity.update({
      where: { id: existing.id },
      data: { email },
    });
  }
};

const getRolesForUser = async (user, instructorProfile) => {
  const roles = await getUserRoles(user, instructorProfile);
  return roles;
};

const buildGoogleUserPayload = async ({ name, email, providerUserId, role }) => {
  const normalizedRole = ensureValidGoogleRole(role);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.endsWith("@gmail.com")) {
    throw createAuthError("Google sign-in is only allowed for Google accounts with a valid @gmail.com address", 400);
  }

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (normalizedRole === "ADMIN") {
    if (!user || user.role !== "ADMIN") {
      throw createAuthError("This Google account is not linked to an authorized administrator account", 403);
    }
  } else if (!user) {
    user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: name || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          passwordHash: crypto.randomBytes(32).toString("hex"),
          role: "STUDENT",
          emailVerifiedAt: new Date(),
        },
      });

      await transaction.studentProfile.create({
        data: { userId: createdUser.id },
      });

      const profile = await transaction.instructorProfile.create({
        data: {
          userId: createdUser.id,
          applicationStatus: "PENDING",
          professionalBio: "Signed in with Google and awaiting teacher approval.",
        },
      });

      return { ...createdUser, instructorProfile: profile };
    });
  } else if (user.role === "ADMIN") {
    throw createAuthError("Use the administrator sign-in flow for admin accounts", 403);
  }

  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") {
    const existingProfile = await prisma.instructorProfile.findUnique({
      where: { userId: user.id },
      select: { applicationStatus: true },
    });

    if (!existingProfile) {
      await prisma.instructorProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          applicationStatus: "PENDING",
          professionalBio: "Signed in with Google and awaiting teacher approval.",
        },
        update: {
          applicationStatus: "PENDING",
          reviewerId: null,
          reviewedAt: null,
          rejectionReason: null,
        },
      });
    }
  }

  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
    user = await prisma.user.findUnique({ where: { id: user.id } });
  }

  await persistGoogleIdentity({ userId: user.id, providerUserId, email: normalizedEmail });
  return user;
};

const issueJwt = async (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const instructorProfile = await prisma.instructorProfile.findUnique({
    where: { userId: user.id },
    select: { applicationStatus: true },
  });
  const roles = await getRolesForUser(user, instructorProfile);

  return jwt.sign(
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
};

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

const getUserRoles = async (user, instructorProfile) => {
  if (user.role === "ADMIN") return ["ADMIN", "INSTRUCTOR"];
  if (user.role === "INSTRUCTOR") return ["STUDENT", "INSTRUCTOR"];

  const profile = instructorProfile === undefined
    ? await prisma.instructorProfile.findUnique({
      where: { userId: user.id },
      select: { applicationStatus: true },
    })
    : instructorProfile;
  return profile?.applicationStatus === "APPROVED"
    ? ["STUDENT", "INSTRUCTOR"]
    : ["STUDENT"];
};

const register = async (input) => {
  const { name, email, password } =
    input && typeof input === "object" ? input : {};
  if (input?.role !== undefined) {
    throw createAuthError(
      "Public registration does not accept a role. Submit a teacher application to request instructor access.",
      400
    );
  }

  if (typeof name !== "string" || !name.trim() || name.trim().length > 191) {
    throw createAuthError("Name is required and must be no longer than 191 characters", 400);
  }

  validateCredentials({ email, password });
  const normalizedEmail = normalizeEmail(email);

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "STUDENT",
          emailVerifiedAt: null,
        },
      });
      await transaction.studentProfile.create({
        data: { userId: createdUser.id },
      });
      return createdUser;
    });

    await issueEmailVerification(user, "STUDENT");
    return {
      ...toPublicUser(user, ["STUDENT"]),
      emailVerified: false,
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw createAuthError("An account with this email already exists", 409);
    }

    throw error;
  }
};

const readOptionalText = (value, field, maxLength = 4000) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw createAuthError(`${field} must be text no longer than ${maxLength} characters`, 400);
  }
  return value.trim() || null;
};

const registerTeacherApplication = async (input) => {
  const details = input && typeof input === "object" ? input : {};
  const { name, email, password } = details;
  if (details.role !== undefined) {
    throw createAuthError(
      "Teacher access is granted only after an administrator approves your application.",
      400
    );
  }
  if (typeof name !== "string" || !name.trim() || name.trim().length > 191) {
    throw createAuthError("Name is required and must be no longer than 191 characters", 400);
  }
  validateCredentials({ email, password });
  const normalizedEmail = normalizeEmail(email);
  const profileData = {
    professionalBio: readOptionalText(details.professionalBio, "Professional bio"),
    expertise: readOptionalText(details.expertise, "Expertise"),
    qualifications: readOptionalText(details.qualifications, "Qualifications"),
    teachingInterests: readOptionalText(details.teachingInterests, "Teaching interests"),
  };
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
      select: { id: true, applicationStatus: true },
    });
    if (
      existingUser.role === "INSTRUCTOR"
      || existingProfile?.applicationStatus === "APPROVED"
    ) {
      if (!existingUser.emailVerifiedAt) {
        await issueEmailVerification(existingUser, "INSTRUCTOR");
      }
      return {
        ...toPublicUser(existingUser, await getUserRoles(existingUser, existingProfile)),
        emailVerified: Boolean(existingUser.emailVerifiedAt),
        applicationStatus: "APPROVED",
        existingAccount: true,
      };
    }

    const profile = await prisma.$transaction(async (transaction) => {
      const studentProfile = await transaction.studentProfile.findUnique({
        where: { userId: existingUser.id },
        select: { id: true },
      });
      if (!studentProfile && existingUser.role === "STUDENT") {
        await transaction.studentProfile.create({
          data: { userId: existingUser.id },
        });
      }
      return transaction.instructorProfile.upsert({
        where: { userId: existingUser.id },
        create: {
          userId: existingUser.id,
          applicationStatus: "PENDING",
          ...profileData,
        },
        update: {
          applicationStatus: "PENDING",
          reviewerId: null,
          reviewedAt: null,
          rejectionReason: null,
          ...profileData,
        },
      });
    });

    if (!existingUser.emailVerifiedAt) {
      await issueEmailVerification(existingUser, "TEACHER_APPLICATION");
    }
    return {
      ...toPublicUser(existingUser, ["STUDENT"]),
      emailVerified: Boolean(existingUser.emailVerifiedAt),
      applicationStatus: profile.applicationStatus,
      existingAccount: true,
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { user, profile } = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "STUDENT",
          emailVerifiedAt: null,
        },
      });
      await transaction.studentProfile.create({
        data: { userId: createdUser.id },
      });
      const createdProfile = await transaction.instructorProfile.create({
        data: {
          userId: createdUser.id,
          applicationStatus: "PENDING",
          ...profileData,
        },
      });
      return { user: createdUser, profile: createdProfile };
    });

    await issueEmailVerification(user, "TEACHER_APPLICATION");
    return {
      ...toPublicUser(user, ["STUDENT"]),
      emailVerified: false,
      applicationStatus: profile.applicationStatus,
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

  if (expectedRole !== undefined && !["STUDENT", "INSTRUCTOR", "ADMIN"].includes(expectedRole)) {
    throw createAuthError("Choose Student, Teacher, or Administrator sign in", 400);
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
  if (user.role === "ADMIN") {
    throw createAuthError("Administrator accounts must sign in with Google", 403);
  }

  const instructorProfile = await prisma.instructorProfile.findUnique({
    where: { userId: user.id },
    select: { applicationStatus: true },
  });
  const isTeacherApplicant = Boolean(instructorProfile);
  const roles = await getUserRoles(user, instructorProfile);
  const roleMatches = expectedRole === undefined
    || (expectedRole === "ADMIN"
      ? user.role === "ADMIN"
      : roles.includes(expectedRole)
        || (expectedRole === "INSTRUCTOR" && isTeacherApplicant));
  if (!roleMatches) {
    throw createAuthError(
      expectedRole === "ADMIN"
        ? "This account is not an administrator account. Choose Student or Teacher sign in."
        : expectedRole === "INSTRUCTOR"
        ? "This account is not a teacher applicant. Submit a teacher application or use Student sign in."
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
    user: await getProfile(user.id),
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
    const instructorProfile = await prisma.instructorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, applicationStatus: true },
    });
    const isPendingTeacherApplication =
      instructorProfile?.applicationStatus === "PENDING";
    await issueEmailVerification(
      user,
      isPendingTeacherApplication
        ? "TEACHER_APPLICATION"
        : user.role === "ADMIN"
          ? "ADMIN"
        : user.role === "INSTRUCTOR" || instructorProfile
          ? "INSTRUCTOR"
          : "STUDENT"
    );
  }

  return { message: "If an unverified account exists, a verification email has been sent." };
};

const getProfile = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      studentProfile: {
        select: { learningGoals: true, preferredLearningCategories: true },
      },
      instructorProfile: {
        select: {
          applicationStatus: true,
          professionalBio: true,
          expertise: true,
          qualifications: true,
          profileImageUrl: true,
          teachingInterests: true,
          reviewedAt: true,
          rejectionReason: true,
        },
      },
    },
  });

  if (!user) return null;
  const profile = { ...user };
  delete profile.passwordHash;
  delete profile.emailVerificationTokenHash;
  delete profile.emailVerificationTokenExpiresAt;
  const { emailVerifiedAt, instructorProfile, ...publicProfile } = profile;
  return {
    ...publicProfile,
    roles: await getUserRoles(user, instructorProfile),
    instructorProfile,
    emailVerified: Boolean(emailVerifiedAt),
  };
};

const startGoogleAuth = async (query = {}) => {
  const role = ensureValidGoogleRole(query.role || "INSTRUCTOR");
  const googleClient = getGoogleClient();
  if (!googleClient) {
    throw createAuthError("Google OAuth is not configured on the server", 503);
  }

  const { nonce, state } = buildGoogleState(role);
  const authUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile"],
    include_granted_scopes: true,
    redirect_uri: GOOGLE_CALLBACK_URL,
    state,
    nonce,
  });

  return { authUrl, state };
};

const googleCallback = async (query = {}) => {
  const googleClient = getGoogleClient();
  if (!googleClient) {
    throw createAuthError("Google OAuth is not configured on the server", 503);
  }

  if (query.error) {
    throw createAuthError(`Google authorization failed: ${query.error}`, 400);
  }

  if (!query.code) {
    throw createAuthError("Google authorization response is missing the callback code", 400);
  }

  const { role, nonce } = verifyGoogleState(query.state);
  const { tokens } = await googleClient.getToken({
    code: query.code,
    redirect_uri: GOOGLE_CALLBACK_URL,
  });
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
    issuer: ["accounts.google.com", "https://accounts.google.com"],
  });
  const payload = ticket.getPayload();

  if (!payload || !payload.sub) {
    throw createAuthError("Google identity is missing required user information", 401);
  }

  if (!payload.nonce || payload.nonce !== nonce) {
    throw createAuthError("Google sign-in state could not be verified", 401);
  }

  if (payload.email_verified !== true) {
    throw createAuthError("Google email verification is required to continue", 401);
  }

  const user = await buildGoogleUserPayload({
    role,
    name: payload.name || payload.email,
    email: payload.email,
    providerUserId: payload.sub,
  });

  const token = await issueJwt(user);
  return {
    token,
    user: await getProfile(user.id),
  };
};

module.exports = {
  register,
  registerTeacherApplication,
  login,
  startGoogleAuth,
  googleCallback,
  verifyEmail,
  resendVerification,
  getProfile,
};
