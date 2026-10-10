import { ArrowRight, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

function AccountTypeChooser({ mode }) {
  const isRegister = mode === 'register'

  return (
    <section
      className="rounded-[26px] border border-white/90 bg-white/95 p-6 shadow-[0_28px_80px_rgba(55,66,35,0.14)] backdrop-blur sm:p-9"
      aria-labelledby="account-type-title"
    >
      <p className="intro-eyebrow mb-2 mt-0 text-[10px] font-extrabold tracking-[1.7px] text-[#445523]">WELCOME TO LEARNSPHERE</p>
      <h2 className="auth-card-heading m-0 text-[26px] font-extrabold text-[#27301e]" id="account-type-title">
        How would you like to continue?
      </h2>
      <p className="auth-card-copy mb-6 mt-2 text-[13px] leading-[1.6] text-[#535b4a]">
        Choose your account type to continue to {isRegister ? 'account creation' : 'sign in'}.
      </p>

      <div className="grid gap-3">
        <Link
          className="group flex min-h-[82px] items-center gap-4 rounded-2xl border border-[#d9dfca] bg-white p-4 no-underline transition hover:border-[#9ca982] hover:bg-[#fbfcf8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7]"
          to={isRegister ? '/register?role=STUDENT' : '/login?role=STUDENT'}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#edf1e3] text-[#4f6125]">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span>
            <span className="auth-option-title block text-sm font-extrabold text-[#27301e]">I’m a student</span>
            <span className="auth-card-copy mt-1 block text-xs leading-5 text-[#535b4a]">
              {isRegister ? 'Create an account to explore and learn' : 'Sign in to learn and track your courses'}
            </span>
          </span>
          <ArrowRight className="ml-auto size-4 shrink-0 text-[#4f6125] transition group-hover:translate-x-1" aria-hidden="true" />
        </Link>

        <Link
          className="group flex min-h-[82px] items-center gap-4 rounded-2xl border border-[#d9dfca] bg-white p-4 no-underline transition hover:border-[#9ca982] hover:bg-[#fbfcf8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7]"
          to={isRegister ? '/register?role=INSTRUCTOR' : '/login?role=INSTRUCTOR'}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#edf1e3] text-[#4f6125]">
            <Users className="size-6" aria-hidden="true" />
          </span>
          <span>
            <span className="auth-option-title block text-sm font-extrabold text-[#27301e]">I’m a teacher</span>
            <span className="auth-card-copy mt-1 block text-xs leading-5 text-[#535b4a]">
              {isRegister ? 'Create a teacher account to publish courses' : 'Sign in to create and publish courses'}
            </span>
          </span>
          <ArrowRight className="ml-auto size-4 shrink-0 text-[#4f6125] transition group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
      {isRegister && (
        <p className="mb-0 mt-5 text-center text-xs leading-5 text-[#535b4a]">
          Verify your email to activate your new account.
        </p>
      )}
    </section>
  )
}

export default AccountTypeChooser
