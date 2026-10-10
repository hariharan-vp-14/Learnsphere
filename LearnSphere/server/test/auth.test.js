const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = [];
const studentProfiles = new Set();
const instructorProfiles = new Map();
const verificationEmails = [];
let failEmailDelivery = false;
const prismaMock = {
  user: {
    findUnique: async ({ where }) => {
      const user = users.find((candidate) =>
        where.email ? candidate.email === where.email : candidate.id === where.id
      );
      if (!user) return null;
      const instructorProfile = instructorProfiles.get(user.id);
      return {
        ...user,
        studentProfile: studentProfiles.has(user.id)
          ? { id: user.id, userId: user.id }
          : null,
        instructorProfile: instructorProfile
          ? { id: user.id, userId: user.id, ...instructorProfile }
          : null,
      };
    },
    create: async ({ data }) => {
      if (users.some((user) => user.email === data.email)) {
        throw Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
        });
      }

      const user = { id: users.length + 1, ...data };
      users.push(user);
      return user;
    },
    update: async ({ where, data }) => {
      const user = users.find((candidate) => candidate.id === where.id);
      Object.assign(user, data);
      return user;
    },
    updateMany: async ({ where, data }) => {
      const user = users.find(
        (candidate) =>
          candidate.emailVerificationTokenHash ===
            where.emailVerificationTokenHash &&
          candidate.emailVerificationTokenExpiresAt > where.emailVerificationTokenExpiresAt.gt &&
          candidate.emailVerifiedAt === where.emailVerifiedAt
      );
      if (!user) return { count: 0 };
      Object.assign(user, data);
      return { count: 1 };
    },
  },
  studentProfile: {
    findUnique: async ({ where }) =>
      studentProfiles.has(where.userId) ? { id: where.userId, userId: where.userId } : null,
    create: async ({ data }) => {
      studentProfiles.add(data.userId);
      return { id: data.userId, ...data };
    },
  },
  instructorProfile: {
    findUnique: async ({ where }) => {
      if (!instructorProfiles.has(where.userId)) return null;
      const user = users.find((candidate) => candidate.id === where.userId);
      return {
        id: where.userId,
        userId: where.userId,
        ...instructorProfiles.get(where.userId),
        user: { emailVerifiedAt: user?.emailVerifiedAt || null },
      };
    },
    create: async ({ data }) => {
      instructorProfiles.set(data.userId, data);
      return { id: data.userId, ...data };
    },
    upsert: async ({ where, create, update }) => {
      const profile = { ...instructorProfiles.get(where.userId), ...create, ...update };
      instructorProfiles.set(where.userId, profile);
      return { id: where.userId, ...profile };
    },
    findMany: async ({ where }) =>
      [...instructorProfiles].flatMap(([userId, profile]) => {
        const user = users.find((candidate) => candidate.id === userId);
        if (
          profile.applicationStatus !== where.applicationStatus
          || !user
          || !user.emailVerifiedAt
        ) return [];
        return [{
          id: userId,
          userId,
          ...profile,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerifiedAt: user.emailVerifiedAt,
          },
        }];
      }),
    update: async ({ where, data }) => {
      const profile = { ...instructorProfiles.get(where.userId), ...data };
      instructorProfiles.set(where.userId, profile);
      return { userId: where.userId, ...profile, updatedAt: new Date() };
    },
  },
  $transaction: async (callback) => callback(prismaMock),
};

process.env.JWT_SECRET = "auth-tests-use-a-private-local-secret";
const prismaConfigPath = require.resolve("../src/config/prisma");
require.cache[prismaConfigPath] = {
  id: prismaConfigPath,
  filename: prismaConfigPath,
  loaded: true,
  exports: { getPrismaClient: () => prismaMock },
};

const emailServicePath = require.resolve("../src/services/email.service");
require.cache[emailServicePath] = {
  id: emailServicePath,
  filename: emailServicePath,
  loaded: true,
  exports: {
    sendVerificationEmail: async ({ email, token, accountType }) => {
      if (failEmailDelivery) throw new Error("SMTP credentials are unavailable");
      verificationEmails.push({ email, token, accountType });
    },
  },
};

const app = require("../src/app");
const server = app.listen(0);
const baseUrl = new Promise((resolve) => {
  server.once("listening", () => {
    resolve(`http://127.0.0.1:${server.address().port}`);
  });
});

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
);

const request = async (path, options = {}) =>
  fetch(`${await baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

test("auth routes satisfy the registration and session checklist", async () => {
  const registerResponse = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Student",
      email: "Student@Gmail.com",
      password: "Correct-Horse-42",
    }),
  });
  assert.equal(registerResponse.status, 201, "Register works");
  const registration = await registerResponse.json();
  assert.equal(registration.data.role, "STUDENT", "Student role is assigned");
  assert.equal(registration.data.emailVerified, false);
  assert.equal("passwordHash" in registration.data, false);
  assert.equal(studentProfiles.has(1), true, "StudentProfile is created with the user");
  assert.equal(verificationEmails.length, 1, "Verification email is sent");
  assert.equal(verificationEmails[0].email, "student@gmail.com");
  assert.equal(verificationEmails[0].accountType, "STUDENT");

  const adminRoleRegistration = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Attempted Admin",
      email: "attemptedadmin@gmail.com",
      password: "Correct-Horse-42",
      role: "ADMIN",
    }),
  });
  assert.equal(adminRoleRegistration.status, 400, "Public registration cannot request admin role");

  const publicTeacherRoleRegistration = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Attempted Teacher",
      email: "attemptedteacher@gmail.com",
      password: "Correct-Horse-42",
      role: "INSTRUCTOR",
    }),
  });
  assert.equal(publicTeacherRoleRegistration.status, 400, "Public registration cannot assign teacher access");

  const storedUser = users[0];
  assert.ok(
    storedUser.passwordHash.startsWith("$2"),
    "Password is stored as a bcrypt hash"
  );
  assert.equal(
    await bcrypt.compare("Correct-Horse-42", storedUser.passwordHash),
    true
  );
  assert.notEqual(storedUser.passwordHash, "Correct-Horse-42");
  assert.notEqual(
    storedUser.emailVerificationTokenHash,
    verificationEmails[0].token,
    "Only a hash of the verification token is stored"
  );

  const unverifiedLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "student@gmail.com",
      password: "Correct-Horse-42",
    }),
  });
  assert.equal(unverifiedLogin.status, 403, "Unverified users cannot log in");
  assert.equal(unverifiedLogin.headers.get("set-cookie"), null);

  const resendResponse = await request("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email: "student@gmail.com" }),
  });
  assert.equal(resendResponse.status, 200, "Verification email can be resent");
  assert.equal(verificationEmails.length, 2);

  const staleTokenResponse = await request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verificationEmails[0].token }),
  });
  assert.equal(staleTokenResponse.status, 400, "Resending invalidates the previous link");

  const verificationResponse = await request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verificationEmails[1].token }),
  });
  assert.equal(verificationResponse.status, 200, "Email verification succeeds");
  assert.ok(storedUser.emailVerifiedAt);
  assert.equal(storedUser.emailVerificationTokenHash, null);

  const reusedVerificationResponse = await request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verificationEmails[0].token }),
  });
  assert.equal(reusedVerificationResponse.status, 400, "Verification link is single-use");

  const incorrectExistingPasswordRegistration = await request("/api/auth/teacher-applications", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Student",
      email: "student@gmail.com",
      password: "Incorrect-Horse-42",
    }),
  });
  assert.equal(incorrectExistingPasswordRegistration.status, 401);
  assert.equal(instructorProfiles.has(storedUser.id), false, "Wrong password cannot submit a teacher application");

  const teacherRegistrationResponse = await request("/api/auth/teacher-applications", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Student",
      email: "Student@Gmail.com",
      password: "Correct-Horse-42",
      professionalBio: "Experienced instructor",
      expertise: "Science",
    }),
  });
  assert.equal(teacherRegistrationResponse.status, 200, "A verified student can apply on the same account");
  const teacherRegistration = await teacherRegistrationResponse.json();
  assert.equal(teacherRegistration.data.id, storedUser.id, "Teacher application uses the existing account");
  assert.equal(teacherRegistration.data.role, "STUDENT", "Application does not change the primary role");
  assert.deepEqual(teacherRegistration.data.roles, ["STUDENT"]);
  assert.equal(teacherRegistration.data.emailVerified, true, "Existing verified email remains verified");
  assert.equal(teacherRegistration.data.applicationStatus, "PENDING");
  assert.equal(instructorProfiles.get(storedUser.id).professionalBio, "Experienced instructor");
  assert.equal(instructorProfiles.get(storedUser.id).applicationStatus, "PENDING");

  const registeredTeacherLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "student@gmail.com",
      password: "Correct-Horse-42",
      expectedRole: "INSTRUCTOR",
    }),
  });
  assert.equal(registeredTeacherLogin.status, 403, "Pending applicants cannot sign in as teachers");
  const dualRoleLogin = await registeredTeacherLogin.json();
  assert.match(dualRoleLogin.message, /awaiting administrator approval/i);

  const newTeacherRegistrationResponse = await request("/api/auth/teacher-applications", {
    method: "POST",
    body: JSON.stringify({
      name: "New Teacher",
      email: "newteacher@gmail.com",
      password: "New-Teacher-42",
    }),
  });
  assert.equal(newTeacherRegistrationResponse.status, 201);
  const newTeacherRegistration = await newTeacherRegistrationResponse.json();
  assert.equal(newTeacherRegistration.data.role, "STUDENT");
  assert.deepEqual(newTeacherRegistration.data.roles, ["STUDENT"]);
  assert.equal(newTeacherRegistration.data.emailVerified, false);
  const newTeacher = users.find((user) => user.email === "newteacher@gmail.com");
  assert.equal(studentProfiles.has(newTeacher.id), true);
  assert.equal(instructorProfiles.get(newTeacher.id).applicationStatus, "PENDING");
  assert.equal(verificationEmails.at(-1).accountType, "TEACHER_APPLICATION");
  const teacherResendResponse = await request("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email: "newteacher@gmail.com" }),
  });
  assert.equal(teacherResendResponse.status, 200);
  assert.equal(verificationEmails.at(-1).accountType, "TEACHER_APPLICATION");

  const unverifiedNewTeacherLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "newteacher@gmail.com",
      password: "New-Teacher-42",
      expectedRole: "INSTRUCTOR",
    }),
  });
  assert.equal(unverifiedNewTeacherLogin.status, 403);

  const verifyNewTeacherResponse = await request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verificationEmails.at(-1).token }),
  });
  assert.equal(verifyNewTeacherResponse.status, 200);
  assert.ok(newTeacher.emailVerifiedAt);

  const verifiedNewTeacherLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "newteacher@gmail.com",
      password: "New-Teacher-42",
      expectedRole: "INSTRUCTOR",
    }),
  });
  assert.equal(verifiedNewTeacherLogin.status, 403, "Email verification does not bypass teacher approval");

  const admin = {
    id: users.length + 1,
    name: "Test Admin",
    email: "admin@gmail.com",
    passwordHash: await bcrypt.hash("Admin-Password-42", 4),
    role: "ADMIN",
    emailVerifiedAt: new Date(),
  };
  users.push(admin);
  const adminLoginResponse = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: admin.email, password: "Admin-Password-42" }),
  });
  assert.equal(adminLoginResponse.status, 200);
  const adminCookie = adminLoginResponse.headers.get("set-cookie").split(";", 1)[0];
  const unverifiedApplicant = {
    id: users.length + 1,
    name: "Unverified Applicant",
    email: "unverifiedteacher@gmail.com",
    passwordHash: await bcrypt.hash("Unverified-Teacher-42", 4),
    role: "STUDENT",
    emailVerifiedAt: null,
  };
  users.push(unverifiedApplicant);
  studentProfiles.add(unverifiedApplicant.id);
  instructorProfiles.set(unverifiedApplicant.id, {
    applicationStatus: "PENDING",
  });
  const unverifiedApprovalResponse = await request(
    `/api/admin/teacher-applications/${unverifiedApplicant.id}`,
    {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ applicationStatus: "APPROVED" }),
    }
  );
  assert.equal(unverifiedApprovalResponse.status, 409, "Admins cannot approve unverified applications");

  const pendingApplicationsResponse = await request("/api/admin/teacher-applications", {
    headers: { Cookie: adminCookie },
  });
  assert.equal(pendingApplicationsResponse.status, 200, "Admins can review verified teacher applications");
  const pendingApplications = await pendingApplicationsResponse.json();
  assert.ok(pendingApplications.data.some((application) => application.userId === newTeacher.id));
  const approvalResponse = await request(`/api/admin/teacher-applications/${newTeacher.id}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ applicationStatus: "APPROVED" }),
  });
  assert.equal(approvalResponse.status, 200, "An admin can approve an application");
  const repeatedDecisionResponse = await request(
    `/api/admin/teacher-applications/${newTeacher.id}`,
    {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ applicationStatus: "REJECTED" }),
    }
  );
  assert.equal(
    repeatedDecisionResponse.status,
    409,
    "An approval cannot later alter an existing instructor profile"
  );

  const approvedTeacherLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "newteacher@gmail.com",
      password: "New-Teacher-42",
      expectedRole: "INSTRUCTOR",
    }),
  });
  assert.equal(approvedTeacherLogin.status, 200);
  const approvedTeacher = await approvedTeacherLogin.json();
  assert.ok(approvedTeacher.data.roles.includes("INSTRUCTOR"));
  assert.equal(approvedTeacher.data.instructorProfile.applicationStatus, "APPROVED");

  const nonGmailRegisterResponse = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Non Gmail User",
      email: "student@example.com",
      password: "Correct-Horse-42",
    }),
  });
  assert.equal(nonGmailRegisterResponse.status, 400, "Only Gmail addresses register");

  const nonGmailLoginResponse = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "student@example.com",
      password: "Correct-Horse-42",
    }),
  });
  assert.equal(nonGmailLoginResponse.status, 400, "Only Gmail addresses can log in");

  const duplicateResponse = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Another Student",
      email: "student@gmail.com",
      password: "Correct-Horse-42",
    }),
  });
  assert.equal(duplicateResponse.status, 409, "Duplicate email is rejected");

  const invalidLoginResponse = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "student@gmail.com",
      password: "Incorrect-Horse-42",
    }),
  });
  assert.equal(invalidLoginResponse.status, 401, "Invalid password is rejected");

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "student@gmail.com",
      password: "Correct-Horse-42",
    }),
  });
  assert.equal(loginResponse.status, 200, "Login works");
  const cookie = loginResponse.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i, "HTTP-only cookie is created");
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Max-Age=86400/i, "Cookie session expires after one day");
  const sessionCookie = cookie.split(";", 1)[0];
  const login = await loginResponse.json();
  assert.equal("token" in login.data, false);
  assert.equal(login.data.role, "STUDENT");

  assert.equal(
    (await request("/api/admin/teacher-applications")).status,
    401,
    "Teacher-application administration requires authentication"
  );
  assert.equal(
    (await request("/api/admin/teacher-applications", {
      headers: { Cookie: sessionCookie },
    })).status,
    403,
    "Students cannot administer teacher applications"
  );

  const teacher = {
    id: users.length + 1,
    name: "Second Teacher",
    email: "secondteacher@gmail.com",
    passwordHash: await bcrypt.hash("Second-Teacher-42", 4),
    role: "INSTRUCTOR",
    emailVerifiedAt: new Date(),
  };
  users.push(teacher);

  const existingTeacherStudentLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: teacher.email,
      password: "Second-Teacher-42",
      expectedRole: "STUDENT",
    }),
  });
  assert.equal(existingTeacherStudentLogin.status, 200, "Teacher accounts can also use student sign-in");

  const teacherLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: teacher.email,
      password: "Second-Teacher-42",
      expectedRole: "INSTRUCTOR",
    }),
  });
  assert.equal(teacherLogin.status, 200, "Provisioned instructor can use teacher sign-in");
  assert.ok((await teacherLogin.json()).data.roles.includes("INSTRUCTOR"));

  const protectedWithCookie = await request("/api/auth/protected", {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(protectedWithCookie.status, 200);

  const legacyUnverifiedToken = jwt.sign(
    {
      id: storedUser.id,
      email: storedUser.email,
      role: "ADMIN",
      roles: ["ADMIN"],
      emailVerified: false,
    },
    process.env.JWT_SECRET
  );
  const legacyProtectedResponse = await request("/api/auth/protected", {
    headers: { Authorization: `Bearer ${legacyUnverifiedToken}` },
  });
  assert.equal(legacyProtectedResponse.status, 200, "Current verified account state accepts legacy tokens");
  const protectedUser = (await legacyProtectedResponse.json()).user;
  assert.equal(protectedUser.role, "STUDENT");
  assert.deepEqual(protectedUser.roles, ["STUDENT"], "Role claims are refreshed from the database");

  const meResponse = await request("/api/auth/me", {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(meResponse.status, 200, "/api/auth/me works");
  const currentProfile = (await meResponse.json()).data;
  assert.equal(currentProfile.email, "student@gmail.com");
  assert.equal(currentProfile.role, "STUDENT");
  assert.deepEqual(currentProfile.roles, ["STUDENT"]);
  assert.equal("passwordHash" in currentProfile, false);
  assert.equal(storedUser.emailVerifiedAt instanceof Date, true);

  const unauthorizedProfileResponse = await request("/api/auth/me");
  assert.equal(unauthorizedProfileResponse.status, 401);
  const protectedResponse = await request("/api/auth/protected");
  assert.equal(
    protectedResponse.status,
    401,
    "Protected route rejects unauthenticated user"
  );

  const logoutResponse = await request("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  assert.equal(logoutResponse.status, 200);
  assert.match(
    logoutResponse.headers.get("set-cookie"),
    /token=;.*Expires=/i,
    "Logout clears cookie"
  );
  const loggedOutResponse = await request("/api/auth/protected", {
    headers: { Cookie: logoutResponse.headers.get("set-cookie").split(";", 1)[0] },
  });
  assert.equal(loggedOutResponse.status, 401, "The cleared browser session cannot access protected routes");

  failEmailDelivery = true;
  const emailDeliveryFailure = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Mail Setup Test",
      email: "mailsetup@gmail.com",
      password: "Correct-Horse-42",
    }),
  });
  assert.equal(emailDeliveryFailure.status, 503);
  assert.equal(
    (await emailDeliveryFailure.json()).message,
    "Verification email could not be sent. Check SMTP settings in server/.env and try again."
  );
});
