import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CourseHeader from '../components/CourseHeader'

function StudentDashboard() {
  const { user } = useAuth()
  const userRoles = user.roles || [user.role]

  return (
    <main className="mx-auto min-h-screen max-w-[1280px] px-[18px] sm:px-[26px] lg:px-16">
      <CourseHeader />
      <nav className="flex flex-wrap gap-3 border-b border-[#343d24]/10 py-4" aria-label="Student navigation">
        <Link className="rounded-xl bg-[#edf1e3] px-4 py-2.5 text-sm font-bold text-[#445523] no-underline" to="/courses">
          Browse courses
        </Link>
        <Link className="rounded-xl bg-[#edf1e3] px-4 py-2.5 text-sm font-bold text-[#445523] no-underline" to="/learning">
          My learning
        </Link>
        {userRoles.some((role) => ['INSTRUCTOR', 'ADMIN'].includes(role)) && (
          <Link className="rounded-xl bg-[#edf1e3] px-4 py-2.5 text-sm font-bold text-[#445523] no-underline" to="/instructor/courses">
            Instructor dashboard
          </Link>
        )}
      </nav>
      <section className="mx-auto my-[12vh] max-w-[600px] rounded-[18px] border border-[#e8e9ed] bg-white px-[30px] py-[60px] text-center shadow-[0_24px_70px_rgba(34,39,75,0.08)]">
        <div className="mx-auto mb-[22px] grid size-[54px] place-items-center rounded-full bg-[#e8eddc] text-[25px] text-[#445523]" aria-hidden="true">
          ✓
        </div>
        <p className="mb-4 mt-0 text-[11px] font-extrabold tracking-[1.7px] text-brand">EMAIL VERIFIED</p>
        <h1 className="m-0 break-words text-[clamp(1.75rem,8vw,2.375rem)] font-bold tracking-[-1.5px] text-[#27301e]">
          Welcome, {user.name}
        </h1>
        <p className="mt-3 text-base leading-[1.7] text-[#72778a]">
          You’re signed in to LearnSphere as <span className="break-all">{user.email}</span>.
        </p>
        <span className="mt-[22px] inline-block rounded-full bg-[#e8eddc] px-3 py-1.5 text-[11px] font-bold tracking-[0.5px] text-[#445523]">
          {userRoles.join(' · ')}
        </span>
      </section>
    </main>
  )
}

export default StudentDashboard
