# LearnSphere

## Server authentication

The Express API provides cookie-based authentication under `/api/auth`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register with `name`, a valid `@gmail.com` email, and `password`; optional `role` may be `STUDENT` or `INSTRUCTOR` (defaults to `STUDENT`). |
| `POST` | `/api/auth/verify-email` | Verify the one-time token from the email link; send `{ "token": "..." }`. |
| `POST` | `/api/auth/resend-verification` | Send another verification link; send `{ "email": "you@gmail.com" }`. |
| `POST` | `/api/auth/login` | Verify credentials for a `@gmail.com` account and set an HTTP-only `token` cookie. |
| `GET` | `/api/auth/me` | Return the authenticated user's profile. |
| `POST` | `/api/auth/logout` | Clear the session cookie. |
| `GET` | `/api/auth/protected` | Example route requiring authentication. |

The authentication welcome page provides separate Student and Teacher choices
for sign-in and registration. A teacher can use an existing student account's
email and password to add instructor access; this creates a linked
`InstructorProfile` for the same `User`, rather than a duplicate email/account.
New teacher accounts also use the same one-time email verification flow as
student registration and cannot sign in until the email is verified.
After registration, the app opens a verification-pending page with the
registered email and a resend option. Verification links return to the app and
continue to the matching Student or Teacher sign-in screen.
Registration accepts only `STUDENT` and `INSTRUCTOR` requests and never permits
public `ADMIN`-role assignment. The login API accepts an optional
`expectedRole` (`STUDENT` or `INSTRUCTOR`); accounts with instructor profiles
can use either sign-in choice. Admin accounts may use the Teacher sign-in
option to access instructor tools.

The instructor-profile table is added by the additive migration at
`server/prisma/migrations/20261009183000_instructor_profiles/`. It is not
applied automatically; back up and review the existing database before
applying pending migrations with `npx prisma migrate deploy`.

Course-view tracking adds the `CourseView` table using the additive migration
at `server/prisma/migrations/20261009194500_course_views/`. Apply it to the
existing database with `npx prisma migrate deploy` after reviewing/backing up;
the migration does not modify or delete existing records.

## Course catalog and instructor management

The course API reuses the existing Prisma `Course` and `User` models and the
configured `learnsphere` database; it does not reset or recreate the database.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/courses` | List published courses for visitors and students. |
| `GET` | `/api/courses/:slug` | Get a published course by slug. |
| `POST` | `/api/courses/:slug/view` | Record one course detail view per browser session; body: `{ "visitorId": "<UUID>" }`. |
| `GET` | `/api/courses/mine` | List the signed-in instructor's courses (admins can list all). |
| `POST` | `/api/courses` | Create a draft course; instructor/admin only. |
| `PUT` | `/api/courses/:id` | Update course title, description, or price; owner/admin only. |
| `POST` | `/api/courses/:id/publish` | Publish a course to the public catalog; owner/admin only. |
| `POST` | `/api/courses/:id/unpublish` | Move a published course back to draft; owner/admin only. |
| `POST` | `/api/courses/:id/archive` | Archive a course; owner/admin only. |

## Instructor Studio and student learning

The Instructor Studio is available at `/instructor/courses`, with curriculum
editing at `/instructor/courses/:courseId/curriculum` and an enrollment list at
`/instructor/students`. Its dashboard counts courses and enrollment/progress
records from the database. Course detail views are counted as unique
browser-session visits since tracking was enabled.
The instructor dashboard reports payment amounts only from database `Payment`
records marked `SUCCESS` or `REFUNDED`, grouped by currency. This is a report
of recorded payment state—not proof of a live provider settlement—and paid
checkout is not enabled in the application yet.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/instructor/dashboard` | Instructor-owned course, enrollment, completion, and progress totals; instructor/admin only. |
| `GET` | `/api/instructor/students?page=1&courseId=<id>` | Paginated active/completed students for courses owned by the instructor; instructor/admin only. |
| `GET` | `/api/curriculum/courses/:courseId/manage` | Load owned course modules and lessons for editing; instructor/admin only. |
| `POST` | `/api/curriculum/courses/:courseId/modules` | Add a module to an owned course. |
| `PUT` | `/api/curriculum/courses/:courseId/modules/reorder` | Reorder all modules by sending `{ "moduleIds": [1, 2] }`. |
| `PUT` / `DELETE` | `/api/curriculum/modules/:moduleId` | Update or delete an owned module. |
| `POST` | `/api/curriculum/modules/:moduleId/lessons` | Add a lesson; video links must use HTTPS. |
| `PUT` | `/api/curriculum/modules/:moduleId/lessons/reorder` | Reorder all lessons in a module with `{ "lessonIds": [1, 2] }`. |
| `PUT` / `DELETE` | `/api/curriculum/lessons/:lessonId` | Update or delete an owned lesson. |
| `GET` | `/api/courses/:slug/enrollment` | Check the signed-in student's enrollment. |
| `POST` | `/api/courses/:slug/enroll` | Enroll a student in a published free course; repeated enrollment is idempotent. |
| `GET` | `/api/enrollments/mine` | List the signed-in student's active and completed courses. |
| `GET` | `/api/enrollments/:enrollmentId/lessons/:lessonId` | Read lesson content after verifying enrollment and course ownership. |
| `POST` | `/api/enrollments/:enrollmentId/lessons/:lessonId/complete` | Record lesson completion and update enrollment progress. |

Publishing requires at least one module and one lesson. Public course details
include the curriculum outline but do not expose lesson content. Paid-course
enrollment remains disabled until verified checkout is available. Student
progress reflects lessons explicitly marked complete. View metrics come from
`CourseView` records; no watch time or payouts are fabricated. Recorded payment
totals are database records, not provider-verified settlements.

Lesson completion uses the additive `LessonProgress` table in
`server/prisma/migrations/20261009170000_lesson_progress/`. The migration has
not been applied automatically. After backing up the existing database and
reviewing the additive SQL, apply pending migrations from `server/` with
`npx prisma migrate deploy`, then run `npx prisma generate`. Do not use
`migrate reset` or recreate the `learnsphere` database.

Public registration supports Student and Teacher account choices; unverified
accounts must verify their email before using protected APIs. For local
development, an instructor can also be provisioned without email delivery:
set `NODE_ENV=development`, `DEV_INSTRUCTOR_EMAIL`, `DEV_INSTRUCTOR_NAME`, and
`DEV_INSTRUCTOR_PASSWORD` in the untracked `server/.env`, then run
`npm run create:instructor` from `server/`. The script only creates a new
instructor account, marks its email verified for local use, hashes its password,
and refuses to modify an existing account. Never use development credentials
in production.

The server requires `DATABASE_URL` and `JWT_SECRET` in `server/.env`. Use a unique,
random JWT secret and keep `.env` out of source control. Registration and login
accept only addresses ending in `@gmail.com` (case-insensitive). This checks the
address format and domain; it does not prove that the user owns or can access the
mailbox. Registration sends a one-time verification link. The account cannot log
in until the user opens the link, and verification tokens are stored hashed and
expire after 24 hours. Unverified users can request a replacement link.

Configure SMTP in `server/.env` to enable delivery:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=LearnSphere <your-sender@gmail.com>
CLIENT_URL=http://localhost:5173
```

For Gmail, use a Google App Password (with 2-Step Verification enabled), not
your regular Google password. Keep these credentials private. For an existing
database, apply the email-verification migration from `server/` with
`npx prisma migrate deploy`, then regenerate the Prisma client with
`npx prisma generate`.

The login cookie contains a signed, one-day JWT session token. It is `HttpOnly`,
uses `SameSite=Lax`, and is marked `Secure` when `NODE_ENV=production`. Logout
clears the cookie. Frontend requests that need the session cookie must send
credentials.

Run the server from `server/` with `npm start` (or `npm run dev` for development).
Run the server tests with `npm test`. These tests use a mocked Prisma client,
so they verify API/session behavior and selected course/enrollment logic without
requiring a running MySQL instance; a configured database is still needed for
the actual application.
