import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/axios'
import studioApi from '../api/studio'
import CourseHeader from '../components/CourseHeader'

function InstructorStudents() {
  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    studioApi.get('/instructor/students', { params: { page } })
      .then(({ data }) => {
        if (current) {
          setResult(data.data)
          setError('')
        }
      })
      .catch((requestError) => {
        if (current) setError(getApiErrorMessage(requestError, 'Unable to load students'))
      })
    return () => { current = false }
  }, [page])

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1280px]">
        <CourseHeader />
        <section className="py-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">INSTRUCTOR STUDIO</p>
              <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#27301e]">Your students</h1>
              <p className="mb-0 mt-2 text-sm text-[#535b4a]">Enrollment and learning progress from recorded course activity.</p>
            </div>
            <Link className="rounded-xl bg-[#edf1e3] px-4 py-2.5 text-sm font-bold text-[#445523] no-underline" to="/instructor/courses">
              Back to courses
            </Link>
          </div>
          {error && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
          {result?.pagination.page !== page && !error && <p className="py-12 text-center text-sm text-[#535b4a]" role="status">Loading student records…</p>}
          {result?.pagination.page === page && (
            <>
              <p className="mt-6 text-sm font-semibold text-[#394625]">{result.pagination.total} active or completed enrollments</p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#e1e5d7] bg-white">
                {result.data.length === 0 ? (
                  <p className="p-8 text-center text-sm text-[#535b4a]">No active student enrollments yet.</p>
                ) : (
                  <div className="divide-y divide-[#edf0e7]">
                    {result.data.map((item) => (
                      <article className="grid gap-2 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center" key={item.id}>
                        <div>
                          <h2 className="m-0 text-sm font-bold text-[#27301e]">{item.student.name}</h2>
                          <p className="mb-0 mt-1 break-all text-xs text-[#535b4a]">{item.student.email}</p>
                        </div>
                        <div>
                          <p className="m-0 text-sm font-semibold text-[#394625]">{item.course.title}</p>
                          <p className="mb-0 mt-1 text-xs text-[#535b4a]">
                            Enrolled {new Date(item.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="min-w-32">
                          <div className="flex justify-between text-xs font-bold text-[#394625]">
                            <span>{item.status.toLowerCase()}</span><span>{Number(item.progressPercentage)}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8eddc]" aria-label={`Progress ${Number(item.progressPercentage)}%`}>
                            <div className="h-full rounded-full bg-[#4f6125]" style={{ width: `${Math.min(100, Number(item.progressPercentage))}%` }} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              {result.pagination.totalPages > 1 && (
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  <button className="rounded-lg border border-[#d9dfca] px-4 py-2 text-sm font-bold text-[#394625] disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Previous</button>
                  <span className="px-3 py-2 text-sm text-[#394625]">Page {page} of {result.pagination.totalPages}</span>
                  <button className="rounded-lg border border-[#d9dfca] px-4 py-2 text-sm font-bold text-[#394625] disabled:opacity-50" disabled={page >= result.pagination.totalPages} onClick={() => setPage((value) => value + 1)} type="button">Next</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default InstructorStudents
