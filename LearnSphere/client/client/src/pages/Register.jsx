import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { getDashboardPath } from '../utils/userRoutes'

const inputClassName = 'h-[50px] w-full rounded-xl border border-slate-300 bg-slate-50/70 px-4 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]'
const buttonClassName = 'inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#465820] to-[#617832] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(63,77,36,0.24)] transition hover:-translate-y-0.5 hover:from-[#354418] hover:to-[#4f6125] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7] disabled:cursor-wait disabled:opacity-60'

function Register() {
  const { register, loginWithGoogle, isLoading, user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const requestedRole = searchParams.get('role')
  const selectedRole = ['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(requestedRole) ? requestedRole : 'STUDENT'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (selectedRole === 'ADMIN') {
    return <Navigate to="/login?role=ADMIN" replace />
  }
  if (user && !isLoading) {
    return <Navigate to={getDashboardPath(user, selectedRole)} replace />
  }

  async function submitStudentRegistration(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await register({ name, email, password })
      navigate('/verification-pending?role=STUDENT', {
        replace: true,
        state: { email: result.data.email },
      })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create your account'))
    } finally {
      setBusy(false)
    }
  }

  const isStudent = selectedRole === 'STUDENT'

  return (
    <AuthLayout mode="register">
      <section
        className="rounded-[26px] border border-white/90 bg-white/95 p-6 shadow-[0_28px_80px_rgba(55,66,35,0.14)] backdrop-blur sm:p-9"
        aria-labelledby="auth-title"
      >
        <p className="mb-2 mt-0 text-[10px] font-extrabold tracking-[1.7px] text-[#445523]">
          {isStudent ? 'STUDENT REGISTRATION' : 'TEACH ON LEARNSPHERE'}
        </p>
        <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.8px] text-[#27301e]" id="auth-title">
          {isStudent ? 'Create your account' : 'Continue as a teacher'}
        </h2>
        <p className="mb-6 mt-2 text-[13px] leading-[1.6] text-slate-500">
          {isStudent
            ? 'Create a student account with your email and password. Verify your email before signing in.'
            : 'Sign in with Google to submit or check your teacher application. Teaching tools unlock after approval.'}
        </p>

        {error && (
          <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs text-rose-800" role="alert">
            {error}
          </p>
        )}

        {isStudent ? (
          <form className="grid gap-4" onSubmit={submitStudentRegistration}>
            <label className="grid gap-2 text-xs font-bold text-slate-700">
              Name
              <input
                autoComplete="name"
                className={inputClassName}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-700">
              Email
              <input
                autoComplete="email"
                className={inputClassName}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@gmail.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-700">
              Password
              <input
                autoComplete="new-password"
                className={inputClassName}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button className={buttonClassName} disabled={busy} type="submit">
              {busy ? 'Creating account…' : 'Create student account'}
            </button>
            <p className="mb-0 mt-1 text-center text-xs text-slate-600">
              Already registered?{' '}
              <Link className="font-bold text-[#4f6125] underline" to="/login?role=STUDENT">Sign in</Link>
            </p>
          </form>
        ) : (
          <button className={buttonClassName} onClick={() => loginWithGoogle('INSTRUCTOR')} type="button">
            Continue with Google
          </button>
        )}

        <Link className="mt-5 inline-flex text-sm font-bold text-[#4f6125] underline" to="/choose-role">
          Choose a different role
        </Link>
      </section>
    </AuthLayout>
  )
}

export default Register
