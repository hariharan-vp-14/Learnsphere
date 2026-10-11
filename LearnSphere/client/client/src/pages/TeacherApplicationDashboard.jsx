import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CourseHeader from '../components/CourseHeader'

function TeacherApplicationDashboard() {
  const { user } = useAuth()
  const profile = user.instructorProfile
  const rejected = profile?.applicationStatus === 'REJECTED'

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1000px]">
        <CourseHeader />
        <section className="mx-auto my-12 max-w-2xl rounded-3xl border border-[#e1e5d7] bg-white p-7 shadow-[0_20px_60px_rgba(47,57,31,0.08)] sm:my-16 sm:p-10">
          <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">TEACHER APPLICATION</p>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#27301e]">
            {rejected ? 'Application not approved' : 'Application pending review'}
          </h1>
          {rejected ? (
            <>
              <p className="mt-4 text-sm leading-7 text-[#535b4a]">
                Your teacher application was reviewed and was not approved. Course publishing and instructor tools remain unavailable.
              </p>
              {profile.rejectionReason && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h2 className="m-0 text-sm font-bold text-amber-950">Review feedback</h2>
                  <p className="mb-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">{profile.rejectionReason}</p>
                </div>
              )}
              <p className="mt-5 text-sm text-[#535b4a]">You may submit an updated application using the same account.</p>
              <Link
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#4f6125] px-5 py-3 text-sm font-bold text-white no-underline hover:bg-[#354418]"
                to="/register?role=INSTRUCTOR"
              >
                Update teacher application
              </Link>
            </>
          ) : (
            <p className="mb-0 mt-4 text-sm leading-7 text-[#535b4a]">
              Your application has been received{profile?.createdAt ? ` on ${new Date(profile.createdAt).toLocaleDateString()}` : ''}.
              You can sign in and check this page, but instructor tools and course publishing are unavailable until an administrator approves your application.
            </p>
          )}
          <div className="mt-7 border-t border-[#edf0e7] pt-5">
            <p className="m-0 text-sm font-semibold text-[#27301e]">{user.name}</p>
            <p className="mb-0 mt-1 text-xs text-[#535b4a]">{user.email}</p>
            <Link className="mt-4 inline-block text-sm font-bold text-[#4f6125] underline" to="/courses">
              Browse courses as a student
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

export default TeacherApplicationDashboard
