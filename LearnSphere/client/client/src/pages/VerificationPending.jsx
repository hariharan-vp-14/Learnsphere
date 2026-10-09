import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

function VerificationPending() {
  const { resendVerification } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const selectedRole = searchParams.get('role') === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT'
  const [email, setEmail] = useState(location.state?.email || '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function resend(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await resendVerification(email)
      setNotice(result.message)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to resend verification email'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout mode="register">
      <section className="rounded-[26px] border border-white/90 bg-white/95 p-6 shadow-[0_28px_80px_rgba(55,66,35,0.14)] backdrop-blur sm:p-9">
        <p className="mb-2 mt-0 text-[10px] font-extrabold tracking-[1.7px] text-[#445523]">ONE LAST STEP</p>
        <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.8px] text-[#27301e]">
          Check your inbox
        </h2>
        <p className="mb-0 mt-3 text-sm leading-6 text-[#535b4a]">
          Your {selectedRole === 'INSTRUCTOR' ? 'teacher' : 'student'} account is created. Open the verification link we sent to your email to activate it and return to LearnSphere.
        </p>
        {email && <p className="mt-3 break-all text-sm font-bold text-[#354418]">{email}</p>}
        <div className="mt-6 rounded-xl border border-[#d4ddbd] bg-[#f2f4eb] p-4 text-xs leading-5 text-[#394625]">
          The link opens this website and verifies your email. After verification, continue to the matching sign-in page.
        </div>
        <form className="mt-6 grid gap-3" onSubmit={resend}>
          <label className="grid gap-2 text-xs font-bold text-slate-700">
            Didn’t receive the email? Resend it
            <input
              autoComplete="email"
              className="h-[50px] w-full rounded-xl border border-slate-300 bg-slate-50/70 px-4 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@gmail.com"
              required
              type="email"
              value={email}
            />
          </label>
          {error && <p className="m-0 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs text-rose-800" role="alert">{error}</p>}
          {notice && <p className="m-0 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800" role="status">{notice}</p>}
          <button className="inline-flex h-12 items-center justify-center rounded-xl bg-[#4f6125] px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60" disabled={busy} type="submit">
            {busy ? 'Sending…' : 'Resend verification email'}
          </button>
        </form>
        <Link className="mt-5 inline-flex text-sm font-bold text-[#4f6125] no-underline hover:text-[#29331d]" to={`/login?role=${selectedRole}`}>
          Go to {selectedRole === 'INSTRUCTOR' ? 'teacher' : 'student'} sign in
        </Link>
      </section>
    </AuthLayout>
  )
}

export default VerificationPending
