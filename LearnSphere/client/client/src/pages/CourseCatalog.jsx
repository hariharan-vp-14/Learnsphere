import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, GraduationCap, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import coursesApi from '../api/courses'
import { getApiErrorMessage } from '../api/axios'
import CourseHeader from '../components/CourseHeader'

const formatPrice = (price) => Number(price) === 0
  ? 'Free'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(price))

function CourseCatalog() {
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    coursesApi.get('/')
      .then(({ data }) => {
        if (isCurrent) setCourses(data.data)
      })
      .catch((requestError) => {
        if (isCurrent) setError(getApiErrorMessage(requestError, 'Unable to load courses'))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const visibleCourses = courses.filter((course) =>
    `${course.title} ${course.description} ${course.instructor.name}`
      .toLowerCase()
      .includes(normalizedSearch)
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8f2] px-5 sm:px-8 lg:px-14">
      <div className="pointer-events-none absolute -right-40 -top-24 size-[420px] rounded-full bg-[#e9ecd9]/70 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1280px]">
        <CourseHeader />
        <section className="relative py-12 sm:py-16">
          <div className="max-w-[720px]">
            <p className="mb-4 text-[11px] font-extrabold tracking-[1.7px] text-[#52672a]">LEARN AT YOUR PACE</p>
            <h1 className="m-0 text-4xl font-extrabold leading-tight tracking-[-1.8px] text-[#27301e] sm:text-5xl">
              Find your next <span className="text-[#667c32]">great course.</span>
            </h1>
            <p className="mb-0 mt-4 max-w-[620px] text-base leading-7 text-[#535b4a]">
              Explore practical courses created by instructors to help you build skills and move forward.
            </p>
          </div>

          <label className="mt-8 flex h-12 max-w-[460px] items-center gap-3 rounded-2xl border border-[#d9dfca] bg-white/90 px-4 shadow-sm focus-within:border-[#71883c] focus-within:ring-4 focus-within:ring-[#e8eddc]">
            <Search className="size-[18px] shrink-0 text-[#667c32]" aria-hidden="true" />
            <span className="sr-only">Search courses</span>
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#25291f] outline-none placeholder:text-[#68705c]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses or instructors"
              type="search"
              value={search}
            />
          </label>

          <div className="mb-5 mt-12 flex items-end justify-between gap-4">
            <div>
              <h2 className="m-0 text-2xl font-bold tracking-tight text-[#27301e]">Explore courses</h2>
              <p className="mb-0 mt-1 text-sm text-[#535b4a]">
                {isLoading ? 'Loading the catalog…' : `${visibleCourses.length} ${visibleCourses.length === 1 ? 'course' : 'courses'} available`}
              </p>
            </div>
            <GraduationCap className="hidden size-8 text-[#71883c] sm:block" aria-hidden="true" />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800" role="alert">
              {error}
            </p>
          )}

          {isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading courses">
              {[0, 1, 2].map((item) => (
                <div className="h-[270px] animate-pulse rounded-3xl border border-[#e2e6d8] bg-white/70" key={item} />
              ))}
            </div>
          )}

          {!isLoading && !error && visibleCourses.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCourses.map((course) => (
                <article className="group flex min-h-[270px] flex-col rounded-3xl border border-[#e1e5d7] bg-white p-5 shadow-[0_12px_35px_rgba(47,57,31,0.06)] transition hover:-translate-y-1 hover:border-[#c4cfac] hover:shadow-[0_18px_45px_rgba(47,57,31,0.12)]" key={course.id}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#edf1e3] text-[#4f6125]">
                      <BookOpen className="size-6" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-[#f3f5ec] px-3 py-1.5 text-xs font-bold text-[#445523]">
                      {formatPrice(course.price)}
                    </span>
                  </div>
                  <h3 className="m-0 text-lg font-bold leading-snug text-[#27301e]">{course.title}</h3>
                  <p className="mb-5 mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[#535b4a]">{course.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e7] pt-4">
                    <span className="min-w-0 break-words text-xs font-medium text-[#5b624f]">By {course.instructor.name}</span>
                    <Link
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4f6125] no-underline transition group-hover:text-[#29331d]"
                      to={`/courses/${encodeURIComponent(course.slug)}`}
                    >
                      View course <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!isLoading && !error && visibleCourses.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#cbd4b8] bg-white/60 px-6 py-14 text-center">
              <BookOpen className="mx-auto size-9 text-[#71883c]" aria-hidden="true" />
              <h3 className="mb-0 mt-4 text-lg font-bold text-[#27301e]">
                {courses.length ? 'No matching courses' : 'Courses are on the way'}
              </h3>
              <p className="mb-0 mt-2 text-sm text-[#535b4a]">
                {courses.length ? 'Try another search term.' : 'Published courses will appear here as instructors add them.'}
              </p>
            </div>
          )}
        </section>
        <footer className="border-t border-[#343d24]/10 py-6 text-center text-xs text-[#5b624f]">
          LearnSphere · Learn something that moves you forward.
        </footer>
      </div>
    </main>
  )
}

export default CourseCatalog
