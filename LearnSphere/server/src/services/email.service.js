const nodemailer = require("nodemailer");

const sendVerificationEmail = async ({ email, token, accountType }) => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, CLIENT_URL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CLIENT_URL) {
    throw new Error("SMTP_HOST, SMTP_USER, SMTP_PASS, and CLIENT_URL must be configured");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const verificationUrl = new URL("/verify-email", CLIENT_URL);
  verificationUrl.searchParams.set("token", token);
  if (accountType === "TEACHER_APPLICATION") {
    verificationUrl.searchParams.set("role", "INSTRUCTOR");
    verificationUrl.searchParams.set("flow", "teacher-application");
  } else if (accountType === "STUDENT" || accountType === "INSTRUCTOR" || accountType === "ADMIN") {
    verificationUrl.searchParams.set("role", accountType);
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    to: email,
    subject: "Verify your LearnSphere email",
    text: `Verify your email address by opening this link: ${verificationUrl.toString()}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`,
    html: `<p>Verify your email address to activate your LearnSphere account.</p><p><a href="${verificationUrl.toString()}">Verify email address</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`,
  });
};

module.exports = { sendVerificationEmail };
