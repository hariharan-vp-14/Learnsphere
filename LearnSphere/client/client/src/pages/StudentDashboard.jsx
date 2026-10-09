import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import { useAuth } from '../context/AuthContext'

function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1280px] px-[18px] sm:px-[26px] lg:px-16">
      <header className="flex min-h-[70px] items-center justify-between border-b border-[#e8e9ed] sm:min-h-[88px]">
        <Link className="text-[22px] font-extrabold tracking-[-0.8px] text-[#27301e] no-underline" to="/">
          LearnSphere<span className="text-[#667c32]">.</span>
        </Link>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#e4e5ec] bg-white px-[17px] text-[13px] font-semibold text-[#454a63] disabled:cursor-wait disabled:opacity-70"
          disabled={busy}
          onClick={signOut}
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </header>
      <section className="mx-auto my-[12vh] max-w-[600px] rounded-[18px] border border-[#e8e9ed] bg-white px-[30px] py-[60px] text-center shadow-[0_24px_70px_rgba(34,39,75,0.08)]">
        <div className="mx-auto mb-[22px] grid size-[54px] place-items-center rounded-full bg-[#e8eddc] text-[25px] text-[#445523]" aria-hidden="true">
          ✓
        </div>
        <p className="mb-4 mt-0 text-[11px] font-extrabold tracking-[1.7px] text-brand">EMAIL VERIFIED</p>
        <h1 className="m-0 text-[38px] font-bold tracking-[-1.5px] text-[#27301e]">
          Welcome, {user.name}
        </h1>
        <p className="mt-3 text-base leading-[1.7] text-[#72778a]">
          You’re signed in to LearnSphere as {user.email}.
        </p>
        <span className="mt-[22px] inline-block rounded-full bg-[#e8eddc] px-3 py-1.5 text-[11px] font-bold tracking-[0.5px] text-[#445523]">
          {user.role}
        </span>
        {error && <p className="mt-4 rounded-[7px] bg-[#fff1f0] px-3 py-2.5 text-xs leading-[1.5] text-[#a53731]" role="alert">{error}</p>}
      </section>
    </main>
  )
}

export default StudentDashboard
