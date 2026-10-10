import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, GraduationCap, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import coursesApi from '../api/courses'
import studioApi from '../api/studio'
import { getApiErrorMessage } from '../api/axios'
import CourseHeader from '../components/CourseHeader'
import { useAuth } from '../context/AuthContext'

const formatPrice = (price) => Number(price) === 0
  ? 'Free'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(price))

function CourseDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRoles = user?.roles || (user ? [user.role] : [])
  const hasStudentAccess = userRoles.includes('STUDENT')
  const [course, setCourse] = useState(null)
  const [loadedSlug, setLoadedSlug] = useState('')
  const [error, setError] = useState('')
  const [enrollment, setEnrollment] = useState(null)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollmentError, setEnrollmentError] = useState('')
  const [viewTrackingError, setViewTrackingError] = useState('')

  useEffect(() => {
    let isCurrent = true
    coursesApi.get(`/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (!isCurrent) return
        setCourse(data.data)
        let visitorId = sessionStorage.getItem(`learnsphere-course-view:${slug}`)
        if (!visitorId) {
          visitorId = crypto.randomUUID()
          sessionStorage.setItem(`learnsphere-course-view:${slug}`, visitorId)
        }
        coursesApi.post(`/${encodeURIComponent(slug)}/view`, { visitorId })
          .catch((requestError) => {
            if (isCurrent) {
              setViewTrackingError(getApiErrorMessage(requestError, 'Unable to record this course view'))
            }
          })
        if (hasStudentAccess) {
          studioApi.get(`/courses/${encodeURIComponent(slug)}/enrollment`)
            .then((result) => {
              if (isCurrent) setEnrollment(result.data.data)
            })
            .catch((requestError) => {
              if (isCurrent) setEnrollmentError(getApiErrorMessage(requestError, 'Unable to check course enrollment'))
            })
        }
      })
      .catch((requestError) => {
        if (isCurrent) setError(getApiErrorMessage(requestError, 'Unable to load this course'))
      })
      .finally(() => {
        if (isCurrent) setLoadedSlug(slug)
      })
    return () => {
      isCurrent = false
    }
  }, [slug, hasStudentAccess])

  const isLoading = loadedSlug !== slug

  async function enroll() {
    setEnrolling(true)
    setEnrollmentError('')
    try {
      const { data } = await studioApi.post(`/courses/${encodeURIComponent(slug)}/enroll`)
      setEnrollment(data.data)
    } catch (requestError) {
      setEnrollmentError(getApiErrorMessage(requestError, 'Unable to enroll in this course'))
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1280px]">
        <CourseHeader />
        <section className="mx-auto max-w-[900px] py-10 sm:py-16">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#4f6125] no-underline hover:text-[#29331d]" to="/courses">
            <ArrowLeft className="size-4" aria-hidden="true" /> All courses
          </Link>
          {isLoading && <p className="py-16 text-center text-[#535b4a]" role="status">Loading course details…</p>}
          {!isLoading && error && (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-white p-8 text-center" role="alert">
              <h1 className="m-0 text-2xl font-bold text-[#27301e]">Course unavailable</h1>
              <p className="mb-0 mt-3 text-sm text-rose-800">{error}</p>
            </div>
          )}
          {!isLoading && !error && course && (
            <article className="mt-7 overflow-hidden rounded-[32px] border border-[#e1e5d7] bg-white shadow-[0_20px_60px_rgba(47,57,31,0.09)]">
              <div className="bg-gradient-to-br from-[#e7ecd9] via-[#f1f3e9] to-[#dce4c8] p-7 sm:p-12">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d2dbbe] bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#445523]">
                  <BookOpen className="size-4" aria-hidden="true" /> Published course
                </span>
                <h1 className="mb-0 mt-5 max-w-[740px] break-words text-3xl font-extrabold leading-tight tracking-[-1.4px] text-[#27301e] sm:text-5xl">
                  {course.title}
                </h1>
                <p className="mb-0 mt-4 max-w-[680px] break-words text-base leading-7 text-[#46503a]">
                  {course.description}
                </p>
              </div>
              <div className="grid gap-8 p-7 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#edf1e3] text-[#4f6125]">
                      <GraduationCap className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-[#5b624f]">Instructor</p>
                      <p className="mb-0 mt-1 text-sm font-bold text-[#27301e]">{course.instructor.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#edf1e3] text-[#4f6125]">
                      <Users className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-[#5b624f]">Learning path</p>
                      <p className="mb-0 mt-1 text-sm font-bold text-[#27301e]">
                        {course._count.modules} {course._count.modules === 1 ? 'module' : 'modules'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#f4f6ee] p-5 sm:min-w-[190px]">
                  <p className="m-0 text-xs font-semibold text-[#535b4a]">Course price</p>
                  <p className="mb-0 mt-1 text-2xl font-extrabold text-[#354418]">{formatPrice(course.price)}</p>
                  {hasStudentAccess && (
                    enrollment ? (
                      <button className="mt-4 w-full rounded-xl bg-[#4f6125] px-4 py-3 text-sm font-bold text-white" onClick={() => navigate('/learning')} type="button">
                        Continue learning
                      </button>
                    ) : Number(course.price) === 0 ? (
                      <button className="mt-4 w-full rounded-xl bg-[#4f6125] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={enrolling} onClick={enroll} type="button">
                        {enrolling ? 'Enrolling…' : 'Enroll for free'}
                      </button>
                    ) : (
                      <p className="mb-0 mt-3 text-xs leading-5 text-[#535b4a]">Online checkout is not available yet.</p>
                    )
                  )}
                  {!user && <Link className="mt-4 inline-block text-xs font-bold text-[#4f6125] underline" to="/login">Sign in to enroll</Link>}
                </div>
              </div>
              {enrollmentError && <p className="mx-7 mb-0 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:mx-10" role="alert">{enrollmentError}</p>}
              {viewTrackingError && <p className="mx-7 mb-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:mx-10" role="status">{viewTrackingError}</p>}
              {course.modules?.length > 0 && (
                <section className="border-t border-[#edf0e7] p-7 sm:p-10" aria-labelledby="course-curriculum">
                  <h2 className="m-0 text-xl font-bold text-[#27301e]" id="course-curriculum">Course curriculum</h2>
                  <div className="mt-5 grid gap-3">
                    {course.modules.map((module) => (
                      <article className="rounded-2xl bg-[#f5f7ef] p-4" key={module.id}>
                        <h3 className="m-0 text-sm font-bold text-[#394625]">{module.title}</h3>
                        <p className="mb-0 mt-1 text-xs text-[#535b4a]">{module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}</p>
                        {module.lessons.length > 0 && (
                          <ul className="mb-0 mt-3 grid gap-2 pl-5 text-sm text-[#30382a]">
                            {module.lessons.map((lesson) => <li key={lesson.id}>{lesson.title}</li>)}
                          </ul>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </article>
          )}
        </section>
      </div>
    </main>
  )
}

export default CourseDetails
