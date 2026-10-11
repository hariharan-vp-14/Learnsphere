import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import coursesApi from '../api/courses'
import studioApi from '../api/studio'
import CourseHeader from '../components/CourseHeader'

function StudentLearning() {
  const [searchParams] = useSearchParams()
  const resumeEnrollmentId = searchParams.get('enrollmentId')
  const [enrollments, setEnrollments] = useState(null)
  const [selected, setSelected] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const autoOpenedEnrollmentId = useRef('')
  const courseRequestId = useRef(0)
  const lessonRequestId = useRef(0)

  useEffect(() => {
    let current = true
    studioApi.get('/enrollments/my')
      .then(({ data }) => { if (current) setEnrollments(data.data) })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, 'Unable to load your enrollments')) })
    return () => { current = false }
  }, [])

  async function openCourse(enrollment) {
    const requestId = ++courseRequestId.current
    try {
      const { data } = await coursesApi.get(`/${encodeURIComponent(enrollment.course.slug)}`)
      if (requestId !== courseRequestId.current) return
      setSelected({ ...enrollment, courseDetails: data.data })
      setLesson(null)
      setError('')
    } catch (requestError) {
      if (requestId === courseRequestId.current) {
        setError(getApiErrorMessage(requestError, 'Unable to load course lessons'))
      }
    }
  }

  function chooseCourse(enrollment) {
    courseRequestId.current += 1
    lessonRequestId.current += 1
    setBusy(false)
    setSelected({ ...enrollment, courseDetails: null })
    setLesson(null)
    setError('')
    openCourse(enrollment)
  }

  async function openLesson(lessonId, enrollmentId = selected?.id) {
    if (!enrollmentId) return
    const requestId = ++lessonRequestId.current
    const selectedCourseRequestId = courseRequestId.current
    setBusy(true)
    setError('')
    try {
      const { data } = await studioApi.get(`/enrollments/${enrollmentId}/lessons/${lessonId}`)
      if (requestId === lessonRequestId.current
          && selectedCourseRequestId === courseRequestId.current) {
        setLesson(data.data)
      }
    } catch (requestError) {
      if (requestId === lessonRequestId.current
          && selectedCourseRequestId === courseRequestId.current) {
        setError(getApiErrorMessage(requestError, 'Unable to load this lesson'))
      }
    } finally {
      if (requestId === lessonRequestId.current) setBusy(false)
    }
  }

  useEffect(() => {
    if (!enrollments || !resumeEnrollmentId || autoOpenedEnrollmentId.current === resumeEnrollmentId) return
    const enrollment = enrollments.find((item) => String(item.id) === resumeEnrollmentId)
    if (!enrollment) return
    let current = true
    const requestId = ++courseRequestId.current
    coursesApi.get(`/${encodeURIComponent(enrollment.course.slug)}`)
      .then(({ data }) => {
        if (!current || requestId !== courseRequestId.current) return
        autoOpenedEnrollmentId.current = resumeEnrollmentId
        setSelected({ ...enrollment, courseDetails: data.data })
        setLesson(null)
        setError('')
        const completedIds = new Set(enrollment.completedLessonIds || [])
        const nextLesson = data.data.modules
          .flatMap((module) => module.lessons)
          .find((item) => !completedIds.has(item.id))
        if (!nextLesson) return
        const lessonRequest = ++lessonRequestId.current
        setBusy(true)
        return studioApi.get(`/enrollments/${enrollment.id}/lessons/${nextLesson.id}`)
          .then((lessonResponse) => {
            if (current && requestId === courseRequestId.current
                && lessonRequest === lessonRequestId.current) {
              setLesson(lessonResponse.data.data)
            }
          })
          .catch((requestError) => {
            if (current && requestId === courseRequestId.current
                && lessonRequest === lessonRequestId.current) {
              setError(getApiErrorMessage(requestError, 'Unable to load this lesson'))
            }
          })
          .finally(() => {
            if (current && requestId === courseRequestId.current
                && lessonRequest === lessonRequestId.current) {
              setBusy(false)
            }
          })
      })
      .catch((requestError) => {
        if (current && requestId === courseRequestId.current) {
          setError(getApiErrorMessage(requestError, 'Unable to load course lessons'))
        }
      })
    return () => {
      current = false
    }
  }, [enrollments, resumeEnrollmentId])

  async function completeLesson() {
    if (!selected || !lesson) return
    setBusy(true)
    setError('')
    try {
      const { data } = await studioApi.post(`/enrollments/${selected.id}/lessons/${lesson.id}/complete`)
      setLesson((current) => ({ ...current, completed: true }))
      setEnrollments((current) => current.map((item) => item.id === selected.id
        ? { ...item, ...data.data.enrollment }
        : item))
      setSelected((current) => ({ ...current, ...data.data.enrollment }))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save lesson progress'))
    } finally {
      setBusy(false)
    }
  }

  const resumeEnrollmentUnavailable = Boolean(
    enrollments
    && resumeEnrollmentId
    && !enrollments.some((item) => String(item.id) === resumeEnrollmentId)
  )
  const visibleError = error || (resumeEnrollmentUnavailable
    ? 'That course is not available in your learning list.'
    : '')

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1100px]">
        <CourseHeader />
        <section className="py-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">MY LEARNING</p>
              <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#27301e]">Continue learning</h1>
              <p className="mb-0 mt-2 text-sm text-[#535b4a]">Your enrolled courses and lesson progress.</p>
            </div>
            <Link className="rounded-xl bg-[#edf1e3] px-4 py-2.5 text-sm font-bold text-[#445523] no-underline" to="/courses">Browse courses</Link>
          </div>
          {visibleError && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{visibleError}</p>}
          {!enrollments && !error && <p className="py-12 text-center text-sm text-[#535b4a]" role="status">Loading your courses…</p>}
          {enrollments?.length === 0 && (
            <div className="mt-7 rounded-2xl border border-dashed border-[#cbd4b8] bg-white p-10 text-center">
              <p className="m-0 text-sm text-[#535b4a]">You have not enrolled in a course yet.</p>
              <Link className="mt-4 inline-flex rounded-xl bg-[#4f6125] px-5 py-3 text-sm font-bold text-white no-underline" to="/courses">Explore courses</Link>
            </div>
          )}
          {enrollments?.length > 0 && (
            <div className="mt-7 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="grid content-start gap-3">
                {enrollments.map((enrollment) => (
                  <button className={`rounded-2xl border p-5 text-left transition ${selected?.id === enrollment.id ? 'border-[#748847] bg-[#edf1e3]' : 'border-[#e1e5d7] bg-white hover:bg-[#f5f7ef]'}`} key={enrollment.id} onClick={() => chooseCourse(enrollment)} type="button">
                    <span className="block text-sm font-bold text-[#27301e]">{enrollment.course.title}</span>
                    <span className="mt-1 block text-xs text-[#535b4a]">Instructor: {enrollment.course.instructor.name}</span>
                    <span className="mt-3 block text-xs font-bold text-[#445523]">{Number(enrollment.progressPercentage)}% complete</span>
                    <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white">
                      <span className="block h-full rounded-full bg-[#4f6125]" style={{ width: `${Math.min(100, Number(enrollment.progressPercentage))}%` }} />
                    </span>
                  </button>
                ))}
              </div>
              <section className="min-h-60 rounded-2xl border border-[#e1e5d7] bg-white p-5 sm:p-7" aria-label="Course lessons">
                {!selected && resumeEnrollmentId && !visibleError && <p className="m-0 text-sm text-[#535b4a]" role="status">Opening your course…</p>}
                {!selected && !resumeEnrollmentId && <p className="m-0 text-sm text-[#535b4a]">Choose a course to view its lessons.</p>}
                {selected && !selected.courseDetails && <p className="m-0 text-sm text-[#535b4a]" role="status">Loading lessons…</p>}
                {selected?.courseDetails && (
                  <>
                    <h2 className="m-0 text-xl font-bold text-[#27301e]">{selected.course.title}</h2>
                    <div className="mt-5 grid gap-3">
                      {selected.courseDetails.modules.flatMap((module) => module.lessons.map((item) => (
                        <button className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-60 ${lesson?.id === item.id ? 'border-[#748847] bg-[#edf1e3] text-[#354418]' : 'border-[#e1e5d7] text-[#394625] hover:bg-[#f5f7ef]'}`} disabled={busy} key={item.id} onClick={() => openLesson(item.id, selected.id)} type="button">
                          {module.title} · {item.title}
                        </button>
                      )))}
                    </div>
                    {busy && !lesson && <p className="mt-5 text-sm text-[#535b4a]" role="status">Loading lesson…</p>}
                    {!lesson && (
                      <p className="mt-5 text-sm text-[#535b4a]">
                        {selected.status === 'COMPLETED'
                          ? 'You have completed this course. Select any lesson to review it.'
                          : 'Select a lesson to begin. This course does not have any lessons yet.'}
                      </p>
                    )}
                    {lesson && (
                      <article className="mt-6 border-t border-[#edf0e7] pt-5">
                        <h3 className="m-0 text-lg font-bold text-[#27301e]">{lesson.title}</h3>
                        {lesson.description && <p className="text-sm text-[#535b4a]">{lesson.description}</p>}
                        {lesson.content && <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#30382a]">{lesson.content}</div>}
                        {lesson.videoUrl && <a className="mt-4 inline-block text-sm font-bold text-[#4f6125] underline" href={lesson.videoUrl} rel="noreferrer" target="_blank">Open lesson video</a>}
                        <button className="mt-5 block rounded-xl bg-[#4f6125] px-4 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy || lesson.completed} onClick={completeLesson} type="button">
                          {lesson.completed ? 'Lesson completed' : busy ? 'Saving progress…' : 'Mark lesson complete'}
                        </button>
                      </article>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default StudentLearning
