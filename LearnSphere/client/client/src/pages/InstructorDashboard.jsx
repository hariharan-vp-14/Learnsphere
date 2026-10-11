import { useEffect, useState } from 'react'
import { Archive, BookOpen, Check, Edit3, Plus, Send, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import coursesApi from '../api/courses'
import { getApiErrorMessage } from '../api/axios'
import studioApi from '../api/studio'
import CourseHeader from '../components/CourseHeader'
import { useAuth } from '../context/AuthContext'

const emptyForm = { title: '', description: '', price: '0.00' }

const formatPrice = (price) => Number(price) === 0
  ? 'Free'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(price))

function InstructorDashboard() {
  const { user } = useAuth()
  const applicationStatus = user.instructorProfile?.applicationStatus
  const applicationPending = applicationStatus === 'PENDING'
  const applicationRejected = applicationStatus === 'REJECTED'
  const [courses, setCourses] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyCourseId, setBusyCourseId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dashboard, setDashboard] = useState(null)

  async function loadCourses() {
    try {
      const { data } = await coursesApi.get('/mine')
      setCourses(data.data)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load your courses'))
      setCourses([])
    }
  }

  useEffect(() => {
    if (applicationPending || applicationRejected) return undefined
    let isCurrent = true
    coursesApi.get('/mine')
      .then(({ data }) => {
        if (!isCurrent) return
        setCourses(data.data)
      })
      .catch((requestError) => {
        if (!isCurrent) return
        setError(getApiErrorMessage(requestError, 'Unable to load your courses'))
        setCourses([])
      })
    return () => {
      isCurrent = false
    }
  }, [applicationPending, applicationRejected])

  useEffect(() => {
    if (applicationPending || applicationRejected) return undefined
    let isCurrent = true
    studioApi.get('/instructor/dashboard')
      .then(({ data }) => {
        if (isCurrent) setDashboard(data.data)
      })
      .catch((requestError) => {
        if (isCurrent) setError(getApiErrorMessage(requestError, 'Unable to load dashboard metrics'))
      })
    return () => {
      isCurrent = false
    }
  }, [applicationPending, applicationRejected])

  const courseList = courses || []
  const isLoading = courses === null

  if (applicationPending || applicationRejected) {
    return (
      <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1100px]">
          <CourseHeader />
          <section className="mx-auto my-12 max-w-2xl rounded-3xl border border-[#e1e5d7] bg-white p-7 shadow-[0_20px_60px_rgba(47,57,31,0.08)] sm:my-16 sm:p-10">
            <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">TEACHER APPLICATION</p>
            <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#27301e]">
              {applicationPending ? 'Application pending review' : 'Application not approved'}
            </h1>
            {applicationPending ? (
              <p className="mb-0 mt-4 text-sm leading-7 text-[#535b4a]">
                Your application is awaiting administrator approval. You can sign in and check back here, but instructor tools and publishing are unavailable until approval.
              </p>
            ) : (
              <>
                <p className="mt-4 text-sm leading-7 text-[#535b4a]">
                  Your teacher application was not approved. Instructor tools and publishing remain unavailable.
                </p>
                {user.instructorProfile.rejectionReason && (
                  <p className="mt-4 whitespace-pre-wrap rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    <strong>Review feedback:</strong> {user.instructorProfile.rejectionReason}
                  </p>
                )}
                <Link className="mt-3 inline-flex text-sm font-bold text-[#4f6125] underline" to="/register?role=INSTRUCTOR">
                  Update teacher application
                </Link>
              </>
            )}
            <p className="mb-0 mt-6 border-t border-[#edf0e7] pt-5 text-sm text-[#535b4a]">
              Signed in as {user.name} · <Link className="font-bold text-[#4f6125] underline" to="/courses">Browse courses as a student</Link>
            </p>
          </section>
        </div>
      </main>
    )
  }

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setNotice('')
    setError('')
    setShowForm(true)
  }

  function startEdit(course) {
    setEditingId(course.id)
    setForm({
      title: course.title,
      description: course.description,
      price: Number(course.price).toFixed(2),
    })
    setNotice('')
    setError('')
    setShowForm(true)
  }

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function saveCourse(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (editingId) {
        await coursesApi.put(`/${editingId}`, {
          title: form.title,
          description: form.description,
          price: Number(form.price),
        })
        setNotice('Course changes saved.')
      } else {
        await coursesApi.post('/', {
          title: form.title,
          description: form.description,
          price: Number(form.price),
        })
        setNotice('Draft course created. Publish it when it is ready for students.')
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      await loadCourses()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save course'))
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(course, action, message) {
    setBusyCourseId(course.id)
    setError('')
    setNotice('')
    try {
      await coursesApi.post(`/${course.id}/${action}`)
      setNotice(message)
      await loadCourses()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to update course status'))
    } finally {
      setBusyCourseId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1280px]">
        <CourseHeader />
        <section className="py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">INSTRUCTOR STUDIO</p>
              <h1 className="m-0 text-3xl font-extrabold tracking-[-1.3px] text-[#27301e] sm:text-4xl">
                Manage your courses
              </h1>
              <p className="mb-0 mt-3 text-sm leading-6 text-[#535b4a]">
                Create a draft, refine your course details, and publish it to the public catalog.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9dfca] px-4 text-sm font-bold text-[#394625] no-underline hover:bg-white" to="/instructor/students">
                View students
              </Link>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4f6125] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#354418] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7]"
                onClick={startCreate}
                type="button"
              >
                <Plus className="size-[18px]" aria-hidden="true" /> New course
              </button>
            </div>
          </div>

          {dashboard && (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Dashboard metrics">
                {[
                  ['All courses', dashboard.metrics.totalCourses],
                  ['Published', dashboard.metrics.publishedCourses],
                  ['Enrolled learners', dashboard.metrics.totalEnrollments],
                  ['Completed courses', dashboard.metrics.completedEnrollments],
                  ['Average progress', dashboard.metrics.averageCompletionPercentage === null ? '—' : `${dashboard.metrics.averageCompletionPercentage}%`],
                  ['Course views', dashboard.metrics.courseViews.total],
                ].map(([label, value]) => (
                  <article className="rounded-2xl border border-[#e1e5d7] bg-white p-5" key={label}>
                    <p className="m-0 text-xs font-semibold text-[#535b4a]">{label}</p>
                    <p className="mb-0 mt-2 text-2xl font-extrabold text-[#27301e]">{value}</p>
                  </article>
                ))}
                <p className="m-0 rounded-2xl border border-dashed border-[#cbd4b8] bg-[#f2f4eb] p-4 text-xs leading-5 text-[#394625] sm:col-span-2 xl:col-span-6">
                  Course views count unique browser sessions since tracking was enabled. Payment totals include database records marked successful or refunded; checkout is not enabled, so no new paid transactions can be made yet.
                </p>
              </div>
              <section className="mt-6 rounded-2xl border border-[#e1e5d7] bg-white p-5 sm:p-6" aria-labelledby="earnings-title">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="m-0 text-base font-bold text-[#27301e]" id="earnings-title">Recorded payments</h2>
                  <span className="text-xs text-[#535b4a]">Payment status from database records</span>
                </div>
                {dashboard.metrics.earnings.amountsByCurrency.length === 0 ? (
                  <p className="mb-0 mt-4 text-sm text-[#535b4a]">
                    No successful or refunded payment records have been recorded yet.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#edf0e7] text-xs text-[#535b4a]">
                          <th className="px-3 py-3 font-semibold">Currency</th>
                          <th className="px-3 py-3 font-semibold">Successful payments</th>
                          <th className="px-3 py-3 font-semibold">Refunds</th>
                          <th className="px-3 py-3 font-semibold">Net recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.metrics.earnings.amountsByCurrency.map((amounts) => (
                          <tr className="border-b border-[#edf0e7] last:border-0" key={amounts.currency}>
                            <th className="px-3 py-3 font-bold text-[#27301e]">{amounts.currency}</th>
                            <td className="px-3 py-3 text-[#394625]">
                              {Number(amounts.grossSuccessfulPayments).toFixed(2)} ({amounts.successfulPaymentCount})
                            </td>
                            <td className="px-3 py-3 text-[#394625]">
                              {Number(amounts.refunds).toFixed(2)} ({amounts.refundCount})
                            </td>
                            <td className="px-3 py-3 font-bold text-[#354418]">
                              {Number(amounts.netRecordedPayments).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <section className="mt-6 rounded-2xl border border-[#e1e5d7] bg-white p-5 sm:p-6" aria-labelledby="course-performance-title">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="m-0 text-base font-bold text-[#27301e]" id="course-performance-title">Course performance</h2>
                  <span className="text-xs text-[#535b4a]">Course detail views and enrollments</span>
                </div>
                {dashboard.topCourses.length === 0 ? (
                  <p className="mb-0 mt-4 text-sm text-[#535b4a]">Course performance will appear after you create courses.</p>
                ) : (
                  <ol className="mb-0 mt-4 grid gap-3 pl-5 text-sm text-[#394625] sm:grid-cols-2">
                    {dashboard.topCourses.map((course) => (
                      <li className="rounded-xl bg-[#f5f7ef] px-4 py-3" key={course.id}>
                        <span className="font-bold text-[#27301e]">{course.title}</span>
                        <span className="ml-2 text-xs text-[#535b4a]">{course._count.views} views · {course._count.enrollments} enrollments</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}

          {error && (
            <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-6 rounded-xl border border-[#d4ddbd] bg-[#edf1e3] p-4 text-sm font-semibold text-[#354418]" role="status">
              {notice}
            </p>
          )}

          {showForm && (
            <section className="mt-8 rounded-3xl border border-[#dfe5d2] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="course-form-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-xl font-bold text-[#27301e]" id="course-form-title">
                    {editingId ? 'Edit course' : 'Create a course draft'}
                  </h2>
                  <p className="mb-0 mt-1 text-sm text-[#535b4a]">You can edit a published course without changing its visibility.</p>
                </div>
                <button
                  className="rounded-lg px-3 py-2 text-sm font-bold text-[#52672a] hover:bg-[#f3f5ec]"
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
              <form className="mt-6 grid gap-4" onSubmit={saveCourse}>
                <label className="grid gap-2 text-xs font-bold text-[#394625]">
                  Course title
                  <input
                    className="h-12 rounded-xl border border-[#d9dfca] bg-[#fafbf7] px-4 text-sm text-[#25291f] outline-none placeholder:text-[#68705c] focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]"
                    maxLength="191"
                    name="title"
                    onChange={updateForm}
                    placeholder="e.g. Introduction to Data Science"
                    required
                    value={form.title}
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#394625]">
                  Description
                  <textarea
                    className="min-h-32 resize-y rounded-xl border border-[#d9dfca] bg-[#fafbf7] p-4 text-sm leading-6 text-[#25291f] outline-none placeholder:text-[#68705c] focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]"
                    name="description"
                    onChange={updateForm}
                    placeholder="What will students learn in this course?"
                    required
                    rows="4"
                    value={form.description}
                  />
                </label>
                <label className="grid max-w-[240px] gap-2 text-xs font-bold text-[#394625]">
                  Price (INR)
                  <input
                    className="h-12 rounded-xl border border-[#d9dfca] bg-[#fafbf7] px-4 text-sm text-[#25291f] outline-none focus:border-[#71883c] focus:bg-white focus:ring-4 focus:ring-[#e8eddc]"
                    min="0"
                    name="price"
                    onChange={updateForm}
                    required
                    step="0.01"
                    type="number"
                    value={form.price}
                  />
                </label>
                {error && (
                  <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4f6125] px-5 text-sm font-bold text-white transition hover:bg-[#354418] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:justify-self-start"
                  disabled={busy}
                  type="submit"
                >
                  <Check className="size-4" aria-hidden="true" />
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create draft'}
                </button>
              </form>
            </section>
          )}

          <div className="mt-9">
            {isLoading && <p className="py-10 text-center text-sm text-[#535b4a]" role="status">Loading your courses…</p>}
            {!isLoading && !error && courseList.length === 0 && (
              <div className="rounded-3xl border border-dashed border-[#cbd4b8] bg-white/70 px-6 py-14 text-center">
                <BookOpen className="mx-auto size-9 text-[#667c32]" aria-hidden="true" />
                <h2 className="mb-0 mt-4 text-lg font-bold text-[#27301e]">No courses yet</h2>
                <p className="mb-0 mt-2 text-sm text-[#535b4a]">Create your first draft to get started.</p>
              </div>
            )}
            {courseList.length > 0 && (
              <div className="grid gap-4">
                {courseList.map((course) => (
                  <article className="rounded-3xl border border-[#e1e5d7] bg-white p-5 shadow-sm sm:p-6" key={course.id}>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#edf1e3] text-[#4f6125]">
                          <BookOpen className="size-6" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="m-0 truncate text-base font-bold text-[#27301e] sm:text-lg">{course.title}</h2>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                              course.status === 'PUBLISHED'
                                ? 'bg-[#e8f1dc] text-[#38531d]'
                                : course.status === 'ARCHIVED'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-50 text-amber-800'
                            }`}>
                              {course.status.toLowerCase()}
                            </span>
                          </div>
                          <p className="mb-0 mt-1 line-clamp-2 text-sm leading-5 text-[#535b4a]">{course.description}</p>
                          <p className="mb-0 mt-2 text-xs font-semibold text-[#5b624f]">
                            {formatPrice(course.price)} <span className="px-1 text-[#a6ad98]">·</span>
                            {course._count.modules} {course._count.modules === 1 ? 'module' : 'modules'}
                            {course.status === 'PUBLISHED' && <> <span className="px-1 text-[#a6ad98]">·</span> {course._count.enrollments} learners</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:shrink-0">
                        <Link
                          className="inline-flex h-10 items-center rounded-xl border border-[#d9dfca] px-3 text-xs font-bold text-[#394625] no-underline transition hover:bg-[#f3f5ec]"
                          to={`/instructor/courses/${course.id}/curriculum`}
                        >
                          Curriculum
                        </Link>
                        <button
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9dfca] px-3 text-xs font-bold text-[#394625] transition hover:bg-[#f3f5ec]"
                          onClick={() => startEdit(course)}
                          type="button"
                        >
                          <Edit3 className="size-3.5" aria-hidden="true" /> Edit
                        </button>
                        {course.status === 'PUBLISHED' ? (
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9dfca] px-3 text-xs font-bold text-[#394625] transition hover:bg-[#f3f5ec] disabled:opacity-60"
                            disabled={busyCourseId === course.id}
                            onClick={() => changeStatus(course, 'unpublish', 'Course moved back to draft.')}
                            type="button"
                          >
                            <Undo2 className="size-3.5" aria-hidden="true" /> Unpublish
                          </button>
                        ) : (
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4f6125] px-3 text-xs font-bold text-white transition hover:bg-[#354418] disabled:opacity-60"
                            disabled={busyCourseId === course.id}
                            onClick={() => changeStatus(course, 'publish', 'Course published to the public catalog.')}
                            type="button"
                          >
                            <Send className="size-3.5" aria-hidden="true" /> Publish
                          </button>
                        )}
                        {course.status !== 'ARCHIVED' && (
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-800 transition hover:bg-rose-50 disabled:opacity-60"
                            disabled={busyCourseId === course.id}
                            onClick={() => changeStatus(course, 'archive', 'Course archived and hidden from the catalog.')}
                            type="button"
                          >
                            <Archive className="size-3.5" aria-hidden="true" /> Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default InstructorDashboard
