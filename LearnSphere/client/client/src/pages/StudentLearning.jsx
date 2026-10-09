import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import coursesApi from '../api/courses'
import studioApi from '../api/studio'
import CourseHeader from '../components/CourseHeader'

function StudentLearning() {
  const [enrollments, setEnrollments] = useState(null)
  const [selected, setSelected] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let current = true
    studioApi.get('/enrollments/mine')
      .then(({ data }) => { if (current) setEnrollments(data.data) })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, 'Unable to load your enrollments')) })
    return () => { current = false }
  }, [])

  async function openCourse(enrollment) {
    setSelected({ ...enrollment, courseDetails: null })
    setLesson(null)
    setError('')
    try {
      const { data } = await coursesApi.get(`/${encodeURIComponent(enrollment.course.slug)}`)
      setSelected((current) => current?.id === enrollment.id ? { ...current, courseDetails: data.data } : current)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load course lessons'))
    }
  }

  async function openLesson(lessonId) {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const { data } = await studioApi.get(`/enrollments/${selected.id}/lessons/${lessonId}`)
      setLesson(data.data)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load this lesson'))
    } finally {
      setBusy(false)
    }
  }

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
          {error && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
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
                  <button className={`rounded-2xl border p-5 text-left transition ${selected?.id === enrollment.id ? 'border-[#748847] bg-[#edf1e3]' : 'border-[#e1e5d7] bg-white hover:bg-[#f5f7ef]'}`} key={enrollment.id} onClick={() => openCourse(enrollment)} type="button">
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
                {!selected && <p className="m-0 text-sm text-[#535b4a]">Choose a course to view its lessons.</p>}
                {selected && !selected.courseDetails && <p className="m-0 text-sm text-[#535b4a]" role="status">Loading lessons…</p>}
                {selected?.courseDetails && (
                  <>
                    <h2 className="m-0 text-xl font-bold text-[#27301e]">{selected.course.title}</h2>
                    <div className="mt-5 grid gap-3">
                      {selected.courseDetails.modules.flatMap((module) => module.lessons.map((item) => (
                        <button className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${lesson?.id === item.id ? 'border-[#748847] bg-[#edf1e3] text-[#354418]' : 'border-[#e1e5d7] text-[#394625] hover:bg-[#f5f7ef]'}`} key={item.id} onClick={() => openLesson(item.id)} type="button">
                          {module.title} · {item.title}
                        </button>
                      )))}
                    </div>
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
