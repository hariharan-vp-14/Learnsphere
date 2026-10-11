import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Clock3, Search, ShieldCheck, XCircle } from 'lucide-react'
import studioApi from '../api/studio'
import { getApiErrorMessage } from '../api/axios'
import CourseHeader from '../components/CourseHeader'

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [applications, setApplications] = useState([])
  const [pagination, setPagination] = useState(null)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fetchApplications = useCallback(async () => {
    const { data } = await studioApi.get('/admin/teacher-applications', {
      params: { page, status, search },
    })
    return data.data
  }, [page, search, status])

  useEffect(() => {
    let active = true
    fetchApplications()
      .then((result) => {
        if (!active) return
        setError('')
        setApplications(result.data)
        setPagination(result.pagination)
        setStats(result.stats)
      })
      .catch((requestError) => {
        if (active) {
          setError(getApiErrorMessage(requestError, 'Unable to load teacher applications'))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetchApplications, refreshKey])

  function updateSearch(value) {
    setLoading(true)
    setPage(1)
    setSearch(value)
  }

  function updateStatus(value) {
    setLoading(true)
    setPage(1)
    setStatus(value)
  }

  async function openApplication(application) {
    setSelected(application)
    setReason('')
    setNotice('')
    setError('')
    try {
      const { data } = await studioApi.get(`/admin/teacher-applications/${application.id}`)
      setSelected(data.data)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load application details'))
    }
  }

  async function decide(decision) {
    if (!selected || busy || selected.applicationStatus !== 'PENDING') return
    const actionLabel = decision === 'approve' ? 'approve' : 'reject'
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${selected.user.name}'s teacher application?`)) return
    if (decision === 'reject' && reason.trim().length > 1000) {
      setError('Rejection feedback must be no longer than 1000 characters.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { data } = await studioApi.patch(
        `/admin/teacher-applications/${selected.id}/${decision}`,
        decision === 'reject' ? { reason } : {}
      )
      setSelected(data.data)
      setNotice(decision === 'approve' ? 'Teacher application approved.' : 'Teacher application rejected.')
      setLoading(true)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to review this application'))
    } finally {
      setBusy(false)
    }
  }

  const cards = [
    { label: 'All applications', value: stats?.totalApplications, icon: ShieldCheck },
    { label: 'Pending review', value: stats?.pendingApplications, icon: Clock3 },
    { label: 'Approved teachers', value: stats?.approvedTeachers, icon: BadgeCheck },
    { label: 'Rejected applications', value: stats?.rejectedApplications, icon: XCircle },
  ]

  return (
    <main className="min-h-screen bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1280px]">
        <CourseHeader />
        <section className="py-9 sm:py-12">
          <p className="mb-2 text-[10px] font-extrabold tracking-[1.6px] text-[#52672a]">ADMINISTRATION</p>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#27301e] sm:text-4xl">Admin dashboard</h1>
          <p className="mb-0 mt-2 text-sm text-[#535b4a]">Review teacher applications and manage approval decisions.</p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon }) => (
              <article className="rounded-2xl border border-[#e1e5d7] bg-white p-5" key={label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="m-0 text-sm font-semibold text-[#535b4a]">{label}</p>
                  <Icon className="size-5 text-[#667c32]" aria-hidden="true" />
                </div>
                <p className="mb-0 mt-3 text-3xl font-extrabold text-[#27301e]">{value ?? '—'}</p>
              </article>
            ))}
          </div>

          {error && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
          {notice && <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{notice}</p>}

          <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <section className="rounded-2xl border border-[#e1e5d7] bg-white p-4 sm:p-6" aria-labelledby="applications-title">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="m-0 text-lg font-bold text-[#27301e]" id="applications-title">Teacher applications</h2>
                  <p className="mb-0 mt-1 text-xs text-[#535b4a]">{pagination?.total ?? 0} matching records</p>
                </div>
                <label className="flex min-h-10 min-w-[min(100%,240px)] flex-1 items-center gap-2 rounded-xl border border-[#d9dfca] px-3 sm:flex-none">
                  <Search className="size-4 text-[#667c32]" aria-hidden="true" />
                  <span className="sr-only">Search applications</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder="Search name or email"
                    value={search}
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter applications by status">
                {FILTERS.map((filter) => (
                  <button
                    aria-pressed={status === filter}
                    className={`rounded-full px-3 py-2 text-xs font-bold ${status === filter ? 'bg-[#4f6125] text-white' : 'bg-[#edf1e3] text-[#445523]'}`}
                    key={filter}
                    onClick={() => updateStatus(filter)}
                    type="button"
                  >
                    {filter === 'ALL' ? 'All statuses' : filter}
                  </button>
                ))}
              </div>

              {loading && <p className="py-10 text-center text-sm text-[#535b4a]" role="status">Loading applications…</p>}
              {!loading && applications.length === 0 && (
                <p className="py-10 text-center text-sm text-[#535b4a]">No applications match these filters.</p>
              )}
              {!loading && applications.length > 0 && (
                <ul className="mb-0 mt-4 grid gap-2 p-0">
                  {applications.map((application) => (
                    <li className="list-none" key={application.id}>
                      <button
                        aria-current={selected?.id === application.id ? 'true' : undefined}
                        className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === application.id ? 'border-[#748847] bg-[#f3f6eb]' : 'border-[#edf0e7] hover:bg-[#f8f9f4]'}`}
                        onClick={() => openApplication(application)}
                        type="button"
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#27301e]">{application.user.name}</span>
                          <span className="rounded-full bg-[#edf1e3] px-2.5 py-1 text-[10px] font-bold text-[#445523]">
                            {application.applicationStatus}
                          </span>
                        </span>
                        <span className="mt-1 block break-all text-xs text-[#535b4a]">{application.user.email}</span>
                        <span className="mt-2 block text-[11px] text-[#68705c]">Applied {new Date(application.createdAt).toLocaleDateString()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf0e7] pt-4">
                  <button
                    className="rounded-lg border border-[#d9dfca] px-3 py-2 text-xs font-bold text-[#394625] disabled:opacity-50"
                    disabled={loading || page <= 1}
                    onClick={() => { setLoading(true); setPage(page - 1) }}
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[#535b4a]">Page {page} of {pagination.totalPages}</span>
                  <button
                    className="rounded-lg border border-[#d9dfca] px-3 py-2 text-xs font-bold text-[#394625] disabled:opacity-50"
                    disabled={loading || page >= pagination.totalPages}
                    onClick={() => { setLoading(true); setPage(page + 1) }}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#e1e5d7] bg-white p-5 sm:p-6" aria-label="Application details">
              {!selected && <p className="m-0 py-8 text-center text-sm text-[#535b4a]">Choose an application to review its details and history.</p>}
              {selected && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-extrabold tracking-[1.4px] text-[#52672a]">APPLICATION DETAILS</p>
                      <h2 className="m-0 break-words text-xl font-bold text-[#27301e]">{selected.user.name}</h2>
                      <p className="mb-0 mt-1 break-all text-sm text-[#535b4a]">{selected.user.email}</p>
                    </div>
                    <span className="rounded-full bg-[#edf1e3] px-2.5 py-1 text-[10px] font-bold text-[#445523]">{selected.applicationStatus}</span>
                  </div>
                  <dl className="mb-0 mt-5 grid gap-4 text-sm">
                    {[
                      ['Professional bio', selected.professionalBio],
                      ['Expertise', selected.expertise],
                      ['Qualifications / experience', selected.qualifications],
                      ['Teaching interests', selected.teachingInterests],
                    ].map(([label, value]) => value && (
                      <div key={label}>
                        <dt className="font-bold text-[#394625]">{label}</dt>
                        <dd className="mb-0 mt-1 whitespace-pre-wrap leading-6 text-[#535b4a]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {selected.rejectionReason && (
                    <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                      <strong>Rejection feedback:</strong> {selected.rejectionReason}
                    </p>
                  )}
                  {selected.applicationStatus === 'PENDING' && (
                    <div className="mt-6 border-t border-[#edf0e7] pt-5">
                      <label className="grid gap-2 text-xs font-bold text-[#394625]">
                        Rejection feedback (optional)
                        <textarea
                          className="min-h-24 rounded-xl border border-[#d9dfca] p-3 text-sm font-normal text-[#27301e] outline-none focus:border-[#71883c] focus:ring-4 focus:ring-[#e8eddc]"
                          maxLength={1000}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Share concise, actionable feedback"
                          value={reason}
                        />
                      </label>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          className="min-h-11 rounded-xl bg-[#4f6125] px-4 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
                          disabled={busy}
                          onClick={() => decide('approve')}
                          type="button"
                        >
                          {busy ? 'Saving…' : 'Approve application'}
                        </button>
                        <button
                          className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900 disabled:cursor-wait disabled:opacity-60"
                          disabled={busy}
                          onClick={() => decide('reject')}
                          type="button"
                        >
                          {busy ? 'Saving…' : 'Reject application'}
                        </button>
                      </div>
                    </div>
                  )}
                  <section className="mt-6 border-t border-[#edf0e7] pt-5" aria-labelledby="review-history-title">
                    <h3 className="m-0 text-sm font-bold text-[#27301e]" id="review-history-title">Review history</h3>
                    {selected.reviews?.length ? (
                      <ol className="mb-0 mt-3 grid gap-3 pl-5">
                        {selected.reviews.map((review) => (
                          <li className="text-xs leading-5 text-[#535b4a]" key={review.id}>
                            <strong className="text-[#394625]">{review.applicationStatus}</strong>
                            {' by '}{review.reviewer.name}
                            {' · '}{new Date(review.reviewedAt).toLocaleString()}
                            {review.rejectionReason && <p className="mb-0 mt-1 whitespace-pre-wrap">{review.rejectionReason}</p>}
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mb-0 mt-2 text-xs text-[#68705c]">No review decisions recorded.</p>}
                  </section>
                </>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

export default AdminDashboard
