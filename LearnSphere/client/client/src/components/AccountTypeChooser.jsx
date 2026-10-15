import { ArrowRight, GraduationCap, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const accountTypes = [
  {
    role: 'STUDENT',
    title: 'Student',
    description: 'Sign in or register with your email and password.',
    action: 'Email and password',
    Icon: GraduationCap,
  },
  {
    role: 'INSTRUCTOR',
    title: 'Teacher',
    description: 'Continue with Google. Teaching tools unlock after approval.',
    action: 'Continue with Google',
    Icon: Users,
  },
  {
    role: 'ADMIN',
    title: 'Admin',
    description: 'Continue with Google using a pre-provisioned admin account.',
    action: 'Continue with Google',
    Icon: ShieldCheck,
  },
]

function AccountTypeChooser() {
  return (
    <section
      className="rounded-[26px] border border-white/90 bg-white/95 p-6 shadow-[0_28px_80px_rgba(55,66,35,0.14)] backdrop-blur sm:p-9"
      aria-labelledby="account-type-title"
    >
      <p className="intro-eyebrow mb-2 mt-0 text-[10px] font-extrabold tracking-[1.7px] text-[#445523]">WELCOME TO LEARNSPHERE</p>
      <h2 className="auth-card-heading m-0 text-[26px] font-extrabold text-[#27301e]" id="account-type-title">
        Choose your role
      </h2>
      <p className="auth-card-copy mb-6 mt-2 text-[13px] leading-[1.6] text-[#535b4a]">
        Select how you want to continue.
      </p>

      <div className="grid gap-3">
        {accountTypes.map(({ role, title, description, action, Icon }) => (
          <Link
            className="group flex min-h-[82px] items-center gap-4 rounded-2xl border border-[#d9dfca] bg-white p-4 no-underline transition hover:border-[#9ca982] hover:bg-[#fbfcf8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7]"
            key={role}
            to={`/login?role=${role}`}
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#edf1e3] text-[#4f6125]">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <span>
              <span className="auth-option-title block text-sm font-extrabold text-[#27301e]">Continue as {title}</span>
              <span className="auth-card-copy mt-1 block text-xs leading-5 text-[#535b4a]">{description}</span>
              <span className="mt-2 block text-[11px] font-bold text-[#52672a]">{action}</span>
            </span>
            <ArrowRight className="ml-auto size-4 shrink-0 text-[#4f6125] transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  )
}

export default AccountTypeChooser
