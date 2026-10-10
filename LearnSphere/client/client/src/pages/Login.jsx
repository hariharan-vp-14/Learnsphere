import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import AccountTypeChooser from '../components/AccountTypeChooser'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { getDashboardPath } from '../utils/userRoutes'

function Login() {
  const { login, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const requestedRole = searchParams.get('role')
  const selectedRole = ['STUDENT', 'INSTRUCTOR'].includes(requestedRole) ? requestedRole : null
  const [form, setForm] = useState({ email: '', password: '' })
  const [pendingEmail, setPendingEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submitForm(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    setPendingEmail('')

    try {
      const result = await login({ ...form, expectedRole: selectedRole })
      navigate(getDashboardPath(result.data), { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      if (
        requestError.response?.status === 403
        && requestError.response?.data?.message === 'Verify your email before signing in'
      ) {
        setPendingEmail(form.email)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout mode="login">
      {!selectedRole ? (
        <AccountTypeChooser mode="login" />
      ) : (
        <section
          className="rounded-[26px] border border-white/90 bg-white/95 p-6 shadow-[0_28px_80px_rgba(55,66,35,0.14)] backdrop-blur sm:p-9"
          aria-labelledby="auth-title"
        >
          <div className="mb-7 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/90 p-1.5" aria-label="Authentication options">
            <Link className="grid min-h-11 place-items-center rounded-[9px] bg-white text-[13px] font-bold text-[#29331d] no-underline shadow-sm" to={`/login?role=${selectedRole}`} aria-current="page">
              Sign in
            </Link>
            <Link className="grid min-h-11 place-items-center rounded-[9px] text-[13px] font-semibold text-slate-600 no-underline transition hover:text-[#445523]" to={`/register?role=${selectedRole}`}>
              Create account
            </Link>
          </div>
          <Link className="mb-5 inline-flex text-xs font-bold text-[#4f6125] no-underline hover:text-[#29331d]" to="/login">
            ← Change account type
          </Link>
          {(location.state?.message || searchParams.get('verified') === '1' || searchParams.get('registered') === '1') && (
            <p className="mb-5 rounded-xl border border-[#d4ddbd] bg-[#edf1e3] px-4 py-3 text-sm font-medium text-[#354418]" role="status">
              {location.state?.message || (searchParams.get('verified') === '1'
                ? 'Your email is verified. Sign in to continue.'
                : 'Your teacher access is ready. Sign in to continue.')}
            </p>
          )}
          <p className="mb-2 mt-0 text-[10px] font-extrabold tracking-[1.7px] text-[#445523]">WELCOME BACK</p>
          <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.8px] text-[#27301e]" id="auth-title">
            {selectedRole === 'INSTRUCTOR' ? 'Teacher sign in' : 'Student sign in'}
          </h2>
          <p className="mb-6 mt-2 text-[13px] leading-[1.6] text-slate-500">
            {selectedRole === 'INSTRUCTOR'
              ? 'Sign in to create, manage, and publish your courses.'
              : 'Sign in to access your learning and course enrollments.'}
          </p>

          <form className="grid gap-4" onSubmit={submitForm}>
            <label className="grid gap-2 text-xs font-bold text-slate-700">
              Gmail address
              <input
                className="h-[50px] w-full rounded-xl border border-slate-300 bg-slate-50/70 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 hover:border-[#9ca982] focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]"
                autoComplete="email"
                name="email"
                onChange={updateForm}
                placeholder="you@gmail.com"
                required
                type="email"
                value={form.email}
              />
            </label>
            <label className="grid gap-2 text-xs font-bold text-slate-700">
              Password
              <input
                className="h-[50px] w-full rounded-xl border border-slate-300 bg-slate-50/70 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 hover:border-[#9ca982] focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]"
                autoComplete="current-password"
                minLength="8"
                name="password"
                onChange={updateForm}
                placeholder="At least 8 characters"
                required
                type="password"
                value={form.password}
              />
            </label>
            {error && <p className="m-0 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs leading-[1.5] text-rose-700" role="alert">{error}</p>}
            {message && <p className="m-0 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-xs leading-[1.5] text-emerald-700" role="status">{message}</p>}
            <button
              className="mt-1 inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#465820] to-[#617832] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(63,77,36,0.24)] transition hover:-translate-y-0.5 hover:from-[#354418] hover:to-[#4f6125] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7] disabled:cursor-wait disabled:opacity-70"
              disabled={busy}
            >
              {busy ? 'Please wait…' : 'Sign in'}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {selectedRole === 'INSTRUCTOR' && (
            <p className="mb-0 mt-4 text-center text-xs leading-5 text-[#535b4a]">
              New teacher? Choose Create account above. To add teacher access to an existing student account, use the same email and password.
            </p>
          )}

          {pendingEmail && (
            <button
              className="mx-auto mt-4 block border-0 bg-transparent text-xs font-bold text-[#445523] hover:text-[#29331d] disabled:cursor-wait disabled:opacity-65"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError('')
                setMessage('')
                try {
                  const result = await resendVerification(pendingEmail)
                  setMessage(result.message)
                } catch (requestError) {
                  setError(getApiErrorMessage(requestError))
                } finally {
                  setBusy(false)
                }
              }}
              type="button"
            >
              Resend verification email
            </button>
          )}
        </section>
      )}
    </AuthLayout>
  )
}

export default Login
