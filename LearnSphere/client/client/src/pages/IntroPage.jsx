import {
  ArrowRight,
  Backpack,
  BookOpen,
  BrainCircuit,
  Calculator,
  Check,
  FileText,
  GraduationCap,
  Laptop,
  Pencil,
  Sparkles,
} from 'lucide-react'
import studentLibraryImage from '../assets/students-library.png'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardPath } from '../utils/userRoutes'

const studyMaterials = [
  { icon: BookOpen, delay: 'intro-orbit-delay-1', color: 'intro-material-book' },
  { icon: GraduationCap, delay: 'intro-orbit-delay-2', color: 'intro-material-cap' },
  { icon: Laptop, delay: 'intro-orbit-delay-3', color: 'intro-material-laptop' },
  { icon: Backpack, delay: 'intro-orbit-delay-4', color: 'intro-material-bag' },
  { icon: Pencil, delay: 'intro-orbit-delay-5', color: 'intro-material-pencil' },
  { icon: Calculator, delay: 'intro-orbit-delay-6', color: 'intro-material-calculator' },
  { icon: FileText, delay: 'intro-orbit-delay-7', color: 'intro-material-notes' },
  { icon: BrainCircuit, delay: 'intro-orbit-delay-8', color: 'intro-material-brain' },
]

function IntroPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const userRoles = (user?.roles || (user ? [user.role] : []))
    .map((role) => String(role).toUpperCase())
  const isAdmin = !isLoading
    && Boolean(user)
    && (userRoles.includes('ADMIN') || String(user?.role || '').toUpperCase() === 'ADMIN')

  function enterLearnSphere() {
    navigate(user ? getDashboardPath(user) : '/login')
  }

  return (
    <main className="intro-page min-h-screen overflow-hidden bg-[#f7f8f2] text-[#27301e]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 sm:px-8 lg:px-14">
        <header className="flex min-h-[76px] items-center justify-between border-b border-[#343d24]/10 sm:min-h-[88px]">
          <Link className="intro-brand text-[21px] font-extrabold tracking-[-0.8px] text-[#27301e] no-underline sm:text-[23px]" to="/">
            LearnSphere<span className="text-[#71883c]"> AI</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6" aria-label="Public navigation">
            {isAdmin && (
              <Link
                aria-label="Admin Dashboard"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-[#667c32] bg-[#667c32] text-white no-underline shadow-sm transition hover:bg-[#52672a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7]"
                title="Admin Dashboard"
                to="/admin/dashboard"
              >
                <Check className="size-5" strokeWidth={3} aria-hidden="true" />
              </Link>
            )}
            {!user && (
              <Link className="intro-sign-in rounded-xl border border-[#d9dfca] bg-white/80 px-4 py-2.5 text-xs font-bold text-[#394625] no-underline transition hover:bg-[#edf1e3] sm:text-sm" to="/login">
                Sign in
              </Link>
            )}
          </nav>
        </header>

        <section className="mx-auto grid w-full max-w-[1240px] flex-1 grid-cols-1 items-center gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:gap-12 lg:py-12">
          <div className="relative z-10 mx-auto w-full max-w-[600px] lg:mx-0">
            <p className="intro-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4ddbd] bg-white/80 px-3.5 py-2 text-[10px] font-extrabold tracking-[1.5px] text-[#445523] shadow-sm sm:text-[11px]">
              <Sparkles className="size-3.5" aria-hidden="true" />
              YOUR NEXT CHAPTER STARTS HERE
            </p>
            <h1 className="intro-heading m-0 max-w-[600px] text-[clamp(2.75rem,6vw,5rem)] font-extrabold text-[#27301e]">
              Make room for your{' '}
              <span className="intro-heading-accent bg-gradient-to-r from-[#465820] to-[#829645] bg-clip-text text-transparent">
                next big idea.
              </span>
            </h1>
            <p className="intro-description mb-0 mt-6 max-w-[490px] text-[15px] leading-7 text-[#626855] sm:text-base sm:leading-8">
              Discover new skills, build a learning habit, and turn curiosity into real progress — all in one focused space.
            </p>
            <div className="mt-8">
              <button
                className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#465820] to-[#617832] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(63,77,36,0.24)] transition hover:-translate-y-0.5 hover:from-[#354418] hover:to-[#4f6125] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce5c7] disabled:cursor-wait disabled:opacity-75"
                disabled={isLoading}
                onClick={enterLearnSphere}
                type="button"
              >
                {isLoading ? 'Checking your session…' : user ? 'Open your dashboard' : 'Enter LearnSphere'}
                {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
              </button>
            </div>
            <p className="mb-0 mt-5 text-xs leading-5 text-[#777c6e]" role={isLoading ? 'status' : undefined}>
              {isLoading
                ? 'Restoring your secure session before you continue.'
                : 'A calmer way to explore, learn, and keep moving forward.'}
            </p>
          </div>

          <div className="intro-scene relative mx-auto flex h-[330px] w-full max-w-[630px] items-center justify-center sm:h-[430px] lg:h-[540px]" role="group" aria-label="Students studying surrounded by orbiting study materials">
            <div className="intro-scene-glow absolute left-1/2 top-1/2 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e3e9d2]/80 blur-3xl" aria-hidden="true" />
            <div className="intro-orbit absolute left-1/2 top-1/2" aria-hidden="true" />

            {studyMaterials.map(({ icon: Icon, delay, color }) => (
              <div className={`intro-orbiting-item ${delay}`} key={delay} aria-hidden="true">
                <span className={`intro-orbiting-icon ${color}`}>
                  <Icon className="size-5 sm:size-6" strokeWidth={1.8} />
                </span>
              </div>
            ))}

            <div className="intro-center-image-wrap absolute left-1/2 top-1/2 z-10">
              <img
                alt="Students studying together"
                className="intro-center-image h-auto w-[clamp(145px,34vw,250px)] object-contain"
                src={studentLibraryImage}
              />
            </div>
          </div>
        </section>

        <footer className="intro-footer flex flex-col items-center justify-between gap-2 border-t border-[#343d24]/10 py-4 text-[10px] font-medium text-[#777c6e] sm:flex-row sm:text-xs">
          <span>LearnSphere AI — a focused place to learn.</span>
          <span>Sign in to enter your learning space.</span>
        </footer>
      </div>
    </main>
  )
}

export default IntroPage
