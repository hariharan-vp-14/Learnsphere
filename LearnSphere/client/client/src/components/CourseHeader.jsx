import { BookOpen, Check, ChevronDown, CircleUserRound, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import { useAuth } from '../context/AuthContext'

function CourseHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const userRoles = (user?.roles || (user ? [user.role] : []))
    .map((role) => String(role).toUpperCase())
  const isAdmin = userRoles.includes('ADMIN')
    || String(user?.role || '').toUpperCase() === 'ADMIN'

  useEffect(() => {
    if (!profileOpen) return undefined

    function closeOnOutsideClick(event) {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setProfileOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileOpen])

  async function signOut() {
    setSignOutError('')
    try {
      await logout()
      navigate('/courses', { replace: true })
    } catch (error) {
      setSignOutError(getApiErrorMessage(error, 'Unable to sign out'))
    }
  }

  return (
    <header className="relative z-10 flex min-h-[76px] flex-wrap items-center justify-between gap-2 border-b border-[#343d24]/10 sm:min-h-[88px]">
      <Link className="inline-flex items-center gap-2 text-[21px] font-extrabold tracking-[-0.8px] text-[#27301e] no-underline" to="/courses">
        <span className="grid size-9 place-items-center rounded-xl bg-[#e8eddc] text-[#4f6125]">
          <BookOpen className="size-5" aria-hidden="true" />
        </span>
        LearnSphere<span className="-ml-2 text-[#667c32]">.</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm font-semibold sm:gap-5" aria-label="Main navigation">
        <Link className="hidden text-[#445523] no-underline hover:text-[#29331d] sm:inline" to="/courses">
          Courses
        </Link>
        {user && userRoles.some((role) => ['INSTRUCTOR', 'ADMIN'].includes(role)) && (
          <Link className="hidden text-[#445523] no-underline hover:text-[#29331d] sm:inline" to="/instructor/courses">
            Instructor
          </Link>
        )}
        {user ? (
          <>
          {isAdmin && (
            <Link
              aria-label="Admin dashboard"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#667c32] bg-[#667c32] px-3 text-white no-underline shadow-sm transition hover:border-[#52672a] hover:bg-[#52672a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7]"
              title="Admin dashboard"
              to="/admin/dashboard"
            >
              <span className="grid size-6 place-items-center rounded-full bg-white text-[#52672a]">
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="text-xs font-extrabold">Admin dashboard</span>
            </Link>
          )}
          <div className="relative" ref={profileRef}>
            <button
              aria-expanded={profileOpen}
              aria-haspopup="dialog"
              aria-label="Open profile details"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d9dfca] bg-white/90 px-2.5 text-xs font-bold text-[#394625] transition hover:bg-[#edf1e3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7] sm:px-3 sm:text-sm"
              onClick={() => setProfileOpen((open) => !open)}
              type="button"
            >
              <span className="grid size-8 place-items-center rounded-full bg-[#e8eddc] text-[#4f6125]">
                <CircleUserRound className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
              <ChevronDown className={`size-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {profileOpen && (
              <section
                aria-label="Your profile details"
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(340px,calc(100vw-2.5rem))] rounded-2xl border border-[#dfe5d2] bg-white p-5 text-left shadow-[0_20px_60px_rgba(47,57,31,0.18)]"
                role="dialog"
              >
                <div className="flex items-center gap-3 border-b border-[#edf0e7] pb-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#e8eddc] text-[#4f6125]">
                    <CircleUserRound className="size-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="m-0 truncate text-base font-extrabold text-[#27301e]">{user.name}</h2>
                    <p className="mb-0 mt-1 truncate text-xs text-[#535b4a]">{user.email}</p>
                  </div>
                </div>
                <dl className="my-4 grid gap-3 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-[#5b624f]">Account ID</dt>
                    <dd className="m-0 break-all text-right font-bold text-[#27301e]">{user.id}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-[#5b624f]">Role</dt>
                    <dd className="m-0 rounded-full bg-[#edf1e3] px-2.5 py-1 font-bold text-[#354418]">
                      {userRoles.join(' · ')}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-[#5b624f]">Email status</dt>
                    <dd className="m-0 font-bold text-[#38531d]">
                      {user.emailVerified === false ? 'Not verified' : 'Verified'}
                    </dd>
                  </div>
                </dl>
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#d9dfca] text-xs font-bold text-[#394625] transition hover:bg-[#f3f5ec]"
                  onClick={signOut}
                  type="button"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </button>
                {signOutError && (
                  <p className="mb-0 mt-3 text-xs font-semibold text-rose-800" role="alert">
                    {signOutError}
                  </p>
                )}
              </section>
            )}
          </div>
          </>
        ) : (
          <Link className="rounded-xl bg-[#4f6125] px-4 py-2.5 text-xs font-bold text-white no-underline transition hover:bg-[#354418] sm:text-sm" to="/login">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}

export default CourseHeader
