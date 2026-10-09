# LearnSphere

## Server authentication

The Express API provides cookie-based authentication under `/api/auth`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register with `name`, a valid `@gmail.com` email, and `password`; new accounts always receive the `STUDENT` role. |
| `POST` | `/api/auth/verify-email` | Verify the one-time token from the email link; send `{ "token": "..." }`. |
| `POST` | `/api/auth/resend-verification` | Send another verification link; send `{ "email": "you@gmail.com" }`. |
| `POST` | `/api/auth/login` | Verify credentials for a `@gmail.com` account and set an HTTP-only `token` cookie. |
| `GET` | `/api/auth/me` | Return the authenticated user's profile. |
| `POST` | `/api/auth/logout` | Clear the session cookie. |
| `GET` | `/api/auth/protected` | Example route requiring authentication. |

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
Run the auth checklist tests with `npm test`. These tests use a mocked Prisma
client, so they verify the API/session behavior and bcrypt hashing without
requiring a running MySQL instance; a configured database is still needed for
the actual application.
