# LearnSphere

## Server authentication

The Express API provides cookie-based authentication under `/api/auth`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a student with `name`, a valid `@gmail.com` email, and `password`. Public registration does not accept a role. |
| `POST` | `/api/auth/teacher-applications` | Apply for teacher access using the shared account and email-verification system. |
| `POST` | `/api/auth/verify-email` | Verify the one-time token from the email link; send `{ "token": "..." }`. |
| `POST` | `/api/auth/resend-verification` | Send another verification link; send `{ "email": "you@gmail.com" }`. |
| `POST` | `/api/auth/login` | Verify credentials for a `@gmail.com` account and set an HTTP-only `token` cookie. |
| `GET` | `/api/auth/me` | Return the authenticated user's profile. |
| `POST` | `/api/auth/logout` | Clear the session cookie. |
| `GET` | `/api/auth/protected` | Example route requiring authentication. |

The public home page (`/`) is the animated LearnSphere AI introduction. Its
Get Started action opens role selection at `/choose-role`; the intro restores a
valid cookie session before offering the user's dashboard. Students register
and sign in with email/password, while teachers and administrators use backend
Google OAuth. The Google callback creates the existing HTTP-only session and
redirects approved teachers to `/instructor/courses`, pending/rejected teacher
applicants to `/teacher/application`, and administrators to `/admin/dashboard`.
The course catalog and course details at `/courses` require sign-in. The
visible admin entry on the intro remains, but does not replace server-side
authorization. Students and teachers use the same `User`, password hash,
HTTP-only session cookie, and email-verification system. Student signups create a linked
`StudentProfile`. Teacher signups submit an application and a linked
`InstructorProfile`; the account remains a student until an administrator
approves the application. Pending and rejected applications cannot use teacher
APIs or dashboards. Existing `INSTRUCTOR` users and course ownership remain
intact.

The database role enum remains `STUDENT`, `INSTRUCTOR`, and `ADMIN`;
`INSTRUCTOR` is the canonical approved teacher role. Applicants use the
existing `STUDENT` authentication role while their separate instructor-profile
application status is `PENDING` or `REJECTED`, which lets them sign in without
granting instructor privileges. Public student and teacher registrations
cannot assign roles. Administrator accounts are never created through a
public endpoint; use the locked `npm run provision:admin` process to
pre-provision them before Google sign-in.

`/admin/dashboard` is the admin-only application review UI. Its API includes
`GET /api/admin/dashboard`, paginated/searchable
`GET /api/admin/teacher-applications?page=1&status=PENDING&search=`,
`GET /api/admin/teacher-applications/:id`,
`GET /api/admin/teacher-applications/:id/reviews`,
`PATCH /api/admin/teacher-applications/:id/approve`, and
`PATCH /api/admin/teacher-applications/:id/reject` with optional
`{ "reason": "..." }`. Decisions are compare-and-set inside a transaction,
store reviewer/time and append to review history. `/api/auth/me` and login
return current database role and application status; protected APIs do not
trust JWT role claims.

At most five active (`User.role = ADMIN`) accounts may exist. Initial
administrator provisioning remains available through
`npm run provision:admin` using
`ADMIN_PROVISION_CONFIRM=CREATE_ADMIN`, `ADMIN_PROVISION_NAME`,
`ADMIN_PROVISION_EMAIL`, and `ADMIN_PROVISION_PASSWORD` from the private
`server/.env`. It refuses to promote existing accounts. All provisioners lock
the singleton `AdminCapacityLock` row inside a MySQL transaction before
counting/inserting, serializing concurrent attempts. This is a five-active-
admins limit, not a lifetime account count. Ordinary teacher-approval
endpoints cannot provision administrators.

The additive migration at
`server/prisma/migrations/20261013143000_remove_admin_invitations/` removes the
unused admin-invitation table. Apply pending migrations with
`npx prisma migrate deploy` and run `npx prisma generate` from `server/`.

The instructor-profile table is added by the additive migration at
`server/prisma/migrations/20261009183000_instructor_profiles/`. It is not
applied automatically; back up and review the existing database before
applying pending migrations with `npx prisma migrate deploy`.

The additive migration at
`server/prisma/migrations/20261010150000_role_profiles_and_teacher_applications/`
creates `StudentProfile`, backfills profiles for existing student users, and
adds teacher application/profile fields. Existing instructor profiles default
to `APPROVED`; the migration does not change or delete existing users, roles,
courses, enrollments, or course ownership. Review and back up the database,
then run `npx prisma migrate deploy` and `npx prisma generate` from `server/`
before starting the updated application.

The additive migration at
`server/prisma/migrations/20261011150000_admin_capacity_and_teacher_reviews/`
adds review metadata/history and the singleton administrator-capacity lock.
It also promotes existing approved instructor profiles from `STUDENT` to
`INSTRUCTOR`, preserving account IDs and course ownership. Review and back up
the database, then apply pending migrations with `npx prisma migrate deploy`
and run `npx prisma generate`. The capacity lock must exist before admin
provisioning; do not bypass it with manual role changes.

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
| `POST` | `/api/courses` | Create a draft course; approved instructor/admin only. |
| `PUT` | `/api/courses/:id` | Update course title, description, or price; owner/admin only, approved instructor. |
| `POST` | `/api/courses/:id/publish` | Publish a course to the public catalog; approved instructor/admin only. |
| `POST` | `/api/courses/:id/unpublish` | Move a published course back to draft; owner/admin only. |
| `POST` | `/api/courses/:id/archive` | Archive a course; owner/admin only. |

## Instructor Studio and student learning

The Instructor Studio is available at `/instructor/courses`, with curriculum
editing at `/instructor/courses/:courseId/curriculum` and an enrollment list at
`/instructor/students`. Its dashboard counts courses and enrollment/progress
records from the database. Course detail views are counted as unique
browser-session visits since tracking was enabled.
Pending and rejected teacher applicants sign in and see their approval state at
`/teacher/application`; instructor, curriculum, publishing, and student-list
endpoints require the current `INSTRUCTOR` role with `APPROVED` profile status
(or `ADMIN`). Pending teachers can neither create drafts nor publish through
direct API calls. The intro-page checkmark links administrators to
`/admin/dashboard`; for other visitors it opens administrator sign-in.
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
| `POST` | `/api/enrollments` | Enroll in a published course; paid courses require a successful order and payment; send `{ "courseId": 1 }` or `{ "courseSlug": "course-slug" }`. |
| `POST` | `/api/courses/:slug/enroll` | Backward-compatible alias for free-course enrollment. |
| `GET` | `/api/enrollments/my` | List the signed-in student's published, active and completed courses with curriculum-based progress and next lesson. |
| `GET` | `/api/enrollments/mine` | Backward-compatible alias for the student's enrollment list. |
| `GET` | `/api/enrollments/:enrollmentId` | Retrieve an enrollment and curriculum metadata belonging to the signed-in student. |
| `GET` | `/api/enrollments/:enrollmentId/progress` | Retrieve the student's completed lesson IDs and course progress. |
| `GET` | `/api/enrollments/:enrollmentId/lessons/:lessonId` | Read lesson content after verifying enrollment and course ownership. |
| `POST` | `/api/enrollments/:enrollmentId/lessons/:lessonId/complete` | Record lesson completion and update enrollment progress. |

The student dashboard is available at `/dashboard`; the learning view at
`/learning` resumes the first incomplete lesson when opened with an
`enrollmentId` query parameter. These routes require an authenticated account
whose database role is `STUDENT`; teacher and administrator role aliases do not
grant student enrollment access. Lesson content and progress endpoints also
verify ownership and require the course to remain published.

Publishing requires at least one module and one lesson. Public course details
include the curriculum outline but do not expose lesson content. Paid-course
enrollment requires both a successful order and a successful payment record;
there is no checkout UI or payment-provider integration yet. Student progress is
calculated from completed lessons and the current published curriculum. Recent
lesson access is not tracked, and duration, difficulty, outcomes, and
prerequisites are not fields in the current course schema. View metrics come from
`CourseView` records; no watch time or payouts are fabricated. Recorded payment
totals are database records, not provider-verified settlements.

Lesson completion uses the additive `LessonProgress` table in
`server/prisma/migrations/20261009170000_lesson_progress/`. The migration has
not been applied automatically. After backing up the existing database and
reviewing the additive SQL, apply pending migrations from `server/` with
`npx prisma migrate deploy`, then run `npx prisma generate`. Do not use
`migrate reset` or recreate the `learnsphere` database.

Public registration supports Student accounts and Teacher applications;
unverified accounts must verify their email before using protected APIs, and
teacher applications also require administrator approval. For local
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

## Google OAuth setup

Google OAuth is server-side only. The frontend sends the user to
`/api/auth/google/start?role=<INSTRUCTOR|ADMIN>` on the backend, then the
backend completes the code exchange and sets the usual LearnSphere session
cookie after server-side verification. The Google redirect URI must match the
configured callback URL exactly:

`http://localhost:4000/api/auth/google/callback`

Add that exact value to the Google Cloud Console under Authorized redirect URIs
for the OAuth client. The app reads the values from environment variables and
never exposes the client secret in browser code.

```dotenv
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=replace_with_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
```

Google sign-in does not grant teacher or administrator privileges by itself.
The callback validates the Google identity and then checks the existing
LearnSphere account state: approved teachers must already be authorized in the
application, and administrators must already be pre-provisioned as `ADMIN`
users. Pending teacher applicants can sign in to view their application status,
but they do not receive instructor dashboard access until an administrator
approves the application.

Troubleshooting:

- If Google sign-in returns a redirect error, confirm the exact backend URL in
  `GOOGLE_CALLBACK_URL` and in Google Cloud Console match exactly.
- If `/api/auth/me` returns `401` immediately after the page loads, that is
  expected for an unauthenticated visitor; a successful sign-in should set the
  `token` cookie and then `/api/auth/me` should return the signed-in user.
- If the browser is redirected back to the login page with a Google error, check
  the `JWT_SECRET`, `CLIENT_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`
  values in `server/.env`.
- If the app says the account is not authorized, verify that the Google email is
  connected to an approved teacher or pre-provisioned administrator account in
  the database; Google login alone does not elevate roles.

The login cookie contains a signed, one-day JWT session token. It is `HttpOnly`,
uses `SameSite=Lax`, and is marked `Secure` when `NODE_ENV=production`. Logout
clears the cookie. Frontend requests that need the session cookie must send
credentials.

Run the server from `server/` with `npm start` (or `npm run dev` for development).
Run the server tests with `npm test`. These tests use a mocked Prisma client,
so they verify API/session behavior and selected course/enrollment logic without
requiring a running MySQL instance; a configured database is still needed for
the actual application.
