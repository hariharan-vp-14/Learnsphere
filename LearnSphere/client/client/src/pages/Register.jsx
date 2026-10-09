import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

function Register() {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
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

    try {
      const result = await register(form)
      setMessage(result.message)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout mode="register">
        <section
          className="rounded-[26px] border border-white/90 bg-white/95 p-6 shadow-[0_28px_80px_rgba(55,66,35,0.14)] backdrop-blur sm:p-9"
          aria-labelledby="auth-title"
        >
          <div className="mb-7 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/90 p-1.5" aria-label="Authentication options">
            <Link className="grid min-h-11 place-items-center rounded-[9px] text-[13px] font-semibold text-slate-600 no-underline transition hover:text-[#445523]" to="/login">
              Sign in
            </Link>
            <Link className="grid min-h-11 place-items-center rounded-[9px] bg-white text-[13px] font-bold text-[#29331d] no-underline shadow-sm" to="/register" aria-current="page">
              Create account
            </Link>
          </div>
          <p className="mb-2 mt-0 text-[10px] font-extrabold tracking-[1.7px] text-[#445523]">GET STARTED</p>
          <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.8px] text-[#27301e]" id="auth-title">
            Create your account
          </h2>
          <p className="mb-6 mt-2 text-[13px] leading-[1.6] text-slate-500">
            We’ll send a verification link to your Gmail inbox.
          </p>

          <form className="grid gap-4" onSubmit={submitForm}>
            <label className="grid gap-2 text-xs font-bold text-slate-700">
              Full name
              <input
                className="h-[50px] w-full rounded-xl border border-slate-300 bg-slate-50/70 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 hover:border-[#9ca982] focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]"
                autoComplete="name"
                maxLength="191"
                name="name"
                onChange={updateForm}
                placeholder="Your name"
                required
                value={form.name}
              />
            </label>
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
                autoComplete="new-password"
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
              {busy ? 'Please wait…' : 'Create account'}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
        </section>
    </AuthLayout>
  )
}

export default Register
