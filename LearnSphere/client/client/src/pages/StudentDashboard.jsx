import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import studioApi from '../api/studio'
import CourseHeader from '../components/CourseHeader'
import { useAuth } from '../context/AuthContext'

function CourseCard({ enrollment, completed = false }) {
  const progress = Math.max(0, Math.min(100, Number(enrollment.progressPercentage) || 0))

  return (
    <article className="flex min-h-60 flex-col rounded-3xl border border-[#e1e5d7] bg-white p-5 shadow-[0_12px_35px_rgba(47,57,31,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf1e3] text-[#4f6125]">
          {completed
            ? <CheckCircle2 className="size-5" aria-hidden="true" />
            : <BookOpen className="size-5" aria-hidden="true" />}
        </span>
        <span className="rounded-full bg-[#f3f5ec] px-3 py-1.5 text-xs font-bold text-[#445523]">
          {progress.toFixed(progress % 1 ? 1 : 0)}% complete
        </span>
      </div>
      <h3 className="mb-0 mt-5 break-words text-lg font-bold leading-snug text-[#27301e]">
        {enrollment.course.title}
      </h3>
      <p className="mb-5 mt-2 text-sm text-[#535b4a]">
        Instructor: {enrollment.course.instructor.name}
      </p>
      <div
        aria-label={`${progress.toFixed(1)} percent complete`}
        className="mb-5 h-2 overflow-hidden rounded-full bg-[#edf0e7]"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress}
      >
        <span
          className="block h-full rounded-full bg-[#667c32] transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <Link
        className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4f6125] px-4 py-3 text-sm font-bold text-white no-underline transition hover:bg-[#354418]"
        to={`/learning?enrollmentId=${enrollment.id}`}
      >
        {completed ? 'Review course' : 'Continue learning'}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  )
}

function StudentDashboard() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    studioApi.get('/enrollments/my')
      .then(({ data }) => {
        if (current) setEnrollments(data.data)
      })
      .catch((requestError) => {
        if (current) setError(getApiErrorMessage(requestError, 'Unable to load your learning dashboard'))
      })
    return () => {
      current = false
    }
  }, [])

  const activeCourses = enrollments?.filter((item) => item.status === 'ACTIVE') || []
  const completedCourses = enrollments?.filter((item) => item.status === 'COMPLETED') || []

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1100px]">
        <CourseHeader />
        <section className="py-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">STUDENT DASHBOARD</p>
              <h1 className="m-0 break-words text-3xl font-extrabold tracking-tight text-[#27301e] sm:text-4xl">
                Welcome, {user.name}
              </h1>
              <p className="mb-0 mt-2 text-sm text-[#535b4a]">Pick up where you left off or revisit a completed course.</p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#edf1e3] px-4 py-3 text-sm font-bold text-[#445523] no-underline transition hover:bg-[#e2e8d4]"
              to="/courses"
            >
              <BookOpen className="size-4" aria-hidden="true" />
              Browse courses
            </Link>
          </div>

          {error && (
            <p className="mt-7 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
              {error}
            </p>
          )}
          {!enrollments && !error && (
            <p className="py-14 text-center text-sm text-[#535b4a]" role="status">Loading your learning dashboard…</p>
          )}
          {enrollments?.length === 0 && (
            <div className="mt-8 rounded-3xl border border-dashed border-[#cbd4b8] bg-white px-6 py-14 text-center">
              <BookOpen className="mx-auto size-10 text-[#71883c]" aria-hidden="true" />
              <h2 className="mb-0 mt-4 text-xl font-bold text-[#27301e]">Your learning journey starts here</h2>
              <p className="mb-0 mt-2 text-sm text-[#535b4a]">You have not enrolled in a course yet.</p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#4f6125] px-5 py-3 text-sm font-bold text-white no-underline hover:bg-[#354418]"
                to="/courses"
              >
                Explore courses
              </Link>
            </div>
          )}

          {activeCourses.length > 0 && (
            <section className="mt-10" aria-labelledby="active-courses-title">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="m-0 text-xl font-bold text-[#27301e]" id="active-courses-title">My learning</h2>
                  <p className="mb-0 mt-1 text-sm text-[#535b4a]">Your enrolled courses and saved progress.</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeCourses.map((enrollment) => (
                  <CourseCard enrollment={enrollment} key={enrollment.id} />
                ))}
              </div>
            </section>
          )}

          {completedCourses.length > 0 && (
            <section className="mt-10" aria-labelledby="completed-courses-title">
              <h2 className="mb-5 mt-0 text-xl font-bold text-[#27301e]" id="completed-courses-title">Completed courses</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completedCourses.map((enrollment) => (
                  <CourseCard completed enrollment={enrollment} key={enrollment.id} />
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  )
}

export default StudentDashboard
