import { useEffect, useState } from 'react'
import { Check, Send } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import coursesApi from '../api/courses'
import studioApi from '../api/studio'
import CourseHeader from '../components/CourseHeader'

const blankModule = { title: '', description: '' }
const blankLesson = { title: '', description: '', content: '', videoUrl: '' }

function CurriculumEditor() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [moduleForm, setModuleForm] = useState(blankModule)
  const [editingModuleId, setEditingModuleId] = useState(null)
  const [moduleEdit, setModuleEdit] = useState(blankModule)
  const [editingLessonId, setEditingLessonId] = useState(null)
  const [lessonEdit, setLessonEdit] = useState(blankLesson)
  const [lessonForms, setLessonForms] = useState({})
  const [busy, setBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)

  async function loadCourse() {
    const { data } = await studioApi.get(`/curriculum/courses/${courseId}/manage`)
    setCourse(data.data)
  }

  useEffect(() => {
    let current = true
    studioApi.get(`/curriculum/courses/${courseId}/manage`)
      .then(({ data }) => { if (current) setCourse(data.data) })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, 'Unable to load curriculum')) })
    return () => { current = false }
  }, [courseId])

  async function perform(action, successMessage) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      await loadCourse()
      setNotice(successMessage)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save curriculum'))
    } finally {
      setBusy(false)
    }
  }

  async function publishCourse() {
    setPublishing(true)
    setError('')
    setNotice('')
    try {
      await coursesApi.post(`/${courseId}/publish`)
      await loadCourse()
      setNotice('Course published to the public catalog.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to publish course'))
    } finally {
      setPublishing(false)
    }
  }

  function addModule(event) {
    event.preventDefault()
    perform(async () => {
      await studioApi.post(`/curriculum/courses/${courseId}/modules`, moduleForm)
      setModuleForm(blankModule)
    }, 'Module added.')
  }

  function addLesson(event, moduleId) {
    event.preventDefault()
    const form = lessonForms[moduleId] || blankLesson
    perform(async () => {
      await studioApi.post(`/curriculum/modules/${moduleId}/lessons`, form)
      setLessonForms((current) => ({ ...current, [moduleId]: blankLesson }))
    }, 'Lesson added.')
  }

  function moveModule(index, offset) {
    const modules = [...course.modules]
    const destination = index + offset
    if (destination < 0 || destination >= modules.length) return
    ;[modules[index], modules[destination]] = [modules[destination], modules[index]]
    perform(
      () => studioApi.put(`/curriculum/courses/${courseId}/modules/reorder`, { moduleIds: modules.map((item) => item.id) }),
      'Module order saved.'
    )
  }

  function moveLesson(module, index, offset) {
    const lessons = [...module.lessons]
    const destination = index + offset
    if (destination < 0 || destination >= lessons.length) return
    ;[lessons[index], lessons[destination]] = [lessons[destination], lessons[index]]
    perform(
      () => studioApi.put(`/curriculum/modules/${module.id}/lessons/reorder`, {
        lessonIds: lessons.map((item) => item.id),
      }),
      'Lesson order saved.'
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1100px]">
        <CourseHeader />
        <section className="py-10 sm:py-14">
          <Link className="text-sm font-bold text-[#4f6125] no-underline" to="/instructor/courses">← Back to courses</Link>
          <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">COURSE CREATION STUDIO</p>
              <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#27301e]">{course?.title || 'Course curriculum'}</h1>
              <p className="mb-0 mt-2 text-sm text-[#535b4a]">Organize modules and lessons. Lesson content is available only to enrolled students.</p>
            </div>
            {course && (
              <button
                className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-xl bg-[#4f6125] px-5 text-sm font-bold text-white transition hover:bg-[#354418] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                disabled={publishing || busy || course.status === 'PUBLISHED' || !course.modules.some((module) => module.lessons.length > 0)}
                onClick={publishCourse}
                type="button"
              >
                {course.status === 'PUBLISHED'
                  ? <><Check className="size-4" aria-hidden="true" /> Published</>
                  : <><Send className="size-4" aria-hidden="true" /> {publishing ? 'Publishing…' : 'Publish course'}</>}
              </button>
            )}
          </div>
          {course && course.status !== 'PUBLISHED' && !course.modules.some((module) => module.lessons.length > 0) && (
            <p className="mb-0 mt-3 text-xs text-[#535b4a]">Add at least one module and one lesson to enable publishing.</p>
          )}
          {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
          {notice && <p className="mt-5 rounded-xl border border-[#d4ddbd] bg-[#edf1e3] p-4 text-sm font-semibold text-[#354418]" role="status">{notice}</p>}
          {!course && !error && <p className="py-10 text-center text-sm text-[#535b4a]" role="status">Loading curriculum…</p>}
          {course && (
            <>
              <form className="mt-7 grid gap-3 rounded-2xl border border-[#e1e5d7] bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={addModule}>
                <label className="grid gap-2 text-xs font-bold text-[#394625]">
                  New module title
                  <input className="h-11 rounded-xl border border-[#d9dfca] bg-[#fafbf7] px-3 text-sm text-[#25291f] outline-none focus:ring-4 focus:ring-[#e8eddc]" onChange={(event) => setModuleForm((form) => ({ ...form, title: event.target.value }))} required value={moduleForm.title} />
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#394625]">
                  Description
                  <input className="h-11 rounded-xl border border-[#d9dfca] bg-[#fafbf7] px-3 text-sm text-[#25291f] outline-none focus:ring-4 focus:ring-[#e8eddc]" onChange={(event) => setModuleForm((form) => ({ ...form, description: event.target.value }))} value={moduleForm.description} />
                </label>
                <button className="h-11 rounded-xl bg-[#4f6125] px-4 text-sm font-bold text-white disabled:opacity-60" disabled={busy} type="submit">Add module</button>
              </form>
              <div className="mt-6 grid gap-4">
                {course.modules.map((module, index) => (
                  <article className="rounded-2xl border border-[#e1e5d7] bg-white p-5 sm:p-6" key={module.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="m-0 text-lg font-bold text-[#27301e]">{index + 1}. {module.title}</h2>
                        {module.description && <p className="mb-0 mt-1 text-sm text-[#535b4a]">{module.description}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button aria-label={`Move ${module.title} up`} className="rounded-lg border border-[#d9dfca] px-3 py-2 text-sm font-bold text-[#394625] disabled:opacity-40" disabled={busy || index === 0} onClick={() => moveModule(index, -1)} type="button">↑</button>
                        <button aria-label={`Move ${module.title} down`} className="rounded-lg border border-[#d9dfca] px-3 py-2 text-sm font-bold text-[#394625] disabled:opacity-40" disabled={busy || index === course.modules.length - 1} onClick={() => moveModule(index, 1)} type="button">↓</button>
                        <button className="rounded-lg border border-[#d9dfca] px-3 py-2 text-xs font-bold text-[#394625]" onClick={() => { setEditingModuleId(module.id); setModuleEdit({ title: module.title, description: module.description || '' }) }} type="button">Edit</button>
                        <button className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-40" disabled={busy} onClick={() => perform(() => studioApi.delete(`/curriculum/modules/${module.id}`), 'Module deleted.')} type="button">Delete</button>
                      </div>
                    </div>
                    {editingModuleId === module.id && (
                      <form className="mt-4 grid gap-3 rounded-xl bg-[#f5f7ef] p-4 sm:grid-cols-2" onSubmit={(event) => {
                        event.preventDefault()
                        perform(() => studioApi.put(`/curriculum/modules/${module.id}`, moduleEdit), 'Module changes saved.')
                        setEditingModuleId(null)
                      }}>
                        <input aria-label="Edit module title" className="h-10 rounded-lg border border-[#d9dfca] px-3 text-sm text-[#25291f]" onChange={(event) => setModuleEdit((form) => ({ ...form, title: event.target.value }))} required value={moduleEdit.title} />
                        <input aria-label="Edit module description" className="h-10 rounded-lg border border-[#d9dfca] px-3 text-sm text-[#25291f]" onChange={(event) => setModuleEdit((form) => ({ ...form, description: event.target.value }))} value={moduleEdit.description} />
                        <button className="h-9 justify-self-start rounded-lg bg-[#4f6125] px-3 text-xs font-bold text-white" type="submit">Save module</button>
                      </form>
                    )}
                    <ol className="mt-4 grid gap-2">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <li className="rounded-xl bg-[#f5f7ef] px-4 py-3 text-sm font-semibold text-[#394625]" key={lesson.id}>
                          {editingLessonId === lesson.id ? (
                            <form className="grid gap-3" onSubmit={(event) => {
                              event.preventDefault()
                              perform(() => studioApi.put(`/curriculum/lessons/${lesson.id}`, lessonEdit), 'Lesson changes saved.')
                              setEditingLessonId(null)
                            }}>
                              <input aria-label="Edit lesson title" className="h-10 rounded-lg border border-[#d9dfca] px-3 text-sm text-[#25291f]" onChange={(event) => setLessonEdit((form) => ({ ...form, title: event.target.value }))} required value={lessonEdit.title} />
                              <input aria-label="Edit lesson description" className="h-10 rounded-lg border border-[#d9dfca] px-3 text-sm text-[#25291f]" onChange={(event) => setLessonEdit((form) => ({ ...form, description: event.target.value }))} placeholder="Short description (optional)" value={lessonEdit.description} />
                              <textarea aria-label="Edit lesson content" className="min-h-24 rounded-lg border border-[#d9dfca] p-3 text-sm text-[#25291f]" onChange={(event) => setLessonEdit((form) => ({ ...form, content: event.target.value }))} value={lessonEdit.content} />
                              <input aria-label="Edit HTTPS video URL" className="h-10 rounded-lg border border-[#d9dfca] px-3 text-sm text-[#25291f]" onChange={(event) => setLessonEdit((form) => ({ ...form, videoUrl: event.target.value }))} placeholder="https://… (optional)" type="url" value={lessonEdit.videoUrl} />
                              <div className="flex gap-2">
                                <button className="rounded-lg bg-[#4f6125] px-3 py-2 text-xs font-bold text-white" type="submit">Save lesson</button>
                                <button className="rounded-lg border border-[#d9dfca] px-3 py-2 text-xs font-bold text-[#394625]" onClick={() => setEditingLessonId(null)} type="button">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span>{lessonIndex + 1}. {lesson.title}</span>
                                <div className="flex flex-wrap gap-1">
                                  <button aria-label={`Move ${lesson.title} up`} className="rounded border border-[#d9dfca] px-2 py-1 text-xs disabled:opacity-40" disabled={busy || lessonIndex === 0} onClick={() => moveLesson(module, lessonIndex, -1)} type="button">↑</button>
                                  <button aria-label={`Move ${lesson.title} down`} className="rounded border border-[#d9dfca] px-2 py-1 text-xs disabled:opacity-40" disabled={busy || lessonIndex === module.lessons.length - 1} onClick={() => moveLesson(module, lessonIndex, 1)} type="button">↓</button>
                                  <button className="rounded border border-[#d9dfca] px-2 py-1 text-xs" onClick={() => {
                                    setEditingLessonId(lesson.id)
                                    setLessonEdit({
                                      title: lesson.title,
                                      description: lesson.description || '',
                                      content: lesson.content || '',
                                      videoUrl: lesson.videoUrl || '',
                                    })
                                  }} type="button">Edit</button>
                                  <button className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-800 disabled:opacity-40" disabled={busy} onClick={() => perform(() => studioApi.delete(`/curriculum/lessons/${lesson.id}`), 'Lesson deleted.')} type="button">Delete</button>
                                </div>
                              </div>
                              {lesson.description && <p className="mb-0 mt-1 text-xs font-normal text-[#535b4a]">{lesson.description}</p>}
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                    <form className="mt-4 grid gap-3 border-t border-[#edf0e7] pt-4" onSubmit={(event) => addLesson(event, module.id)}>
                      <h3 className="m-0 text-sm font-bold text-[#27301e]">Add a lesson</h3>
                      <input aria-label="Lesson title" className="h-11 rounded-xl border border-[#d9dfca] bg-[#fafbf7] px-3 text-sm text-[#25291f] outline-none focus:ring-4 focus:ring-[#e8eddc]" onChange={(event) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || blankLesson), title: event.target.value } }))} placeholder="Lesson title" required value={(lessonForms[module.id] || blankLesson).title} />
                      <input aria-label="Lesson description" className="h-11 rounded-xl border border-[#d9dfca] bg-[#fafbf7] px-3 text-sm text-[#25291f] outline-none focus:ring-4 focus:ring-[#e8eddc]" onChange={(event) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || blankLesson), description: event.target.value } }))} placeholder="Short lesson description (optional)" value={(lessonForms[module.id] || blankLesson).description} />
                      <textarea aria-label="Lesson content" className="min-h-24 rounded-xl border border-[#d9dfca] bg-[#fafbf7] p-3 text-sm text-[#25291f] outline-none focus:ring-4 focus:ring-[#e8eddc]" onChange={(event) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || blankLesson), content: event.target.value } }))} placeholder="Lesson content (shown only to enrolled students)" value={(lessonForms[module.id] || blankLesson).content} />
                      <input aria-label="HTTPS video URL" className="h-11 rounded-xl border border-[#d9dfca] bg-[#fafbf7] px-3 text-sm text-[#25291f] outline-none focus:ring-4 focus:ring-[#e8eddc]" onChange={(event) => setLessonForms((current) => ({ ...current, [module.id]: { ...(current[module.id] || blankLesson), videoUrl: event.target.value } }))} placeholder="https://… (optional)" type="url" value={(lessonForms[module.id] || blankLesson).videoUrl} />
                      <button className="h-10 justify-self-start rounded-xl border border-[#d9dfca] px-4 text-xs font-bold text-[#394625] disabled:opacity-50" disabled={busy} type="submit">Save lesson</button>
                    </form>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default CurriculumEditor
