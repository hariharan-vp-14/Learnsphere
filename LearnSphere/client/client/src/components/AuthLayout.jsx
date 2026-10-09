import { BookOpen, GraduationCap, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

function AuthLayout({ children, mode }) {
  const isRegister = mode === 'register'

  return (
    <main className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col overflow-hidden px-5 sm:px-8 lg:px-14">
      <div className="pointer-events-none absolute -left-40 top-32 size-[420px] rounded-full bg-[#dfe7c8]/60 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-40 bottom-10 size-[420px] rounded-full bg-[#e9ecd9]/75 blur-3xl" aria-hidden="true" />

      <header className="relative z-10 flex min-h-[76px] items-center justify-between border-b border-[#343d24]/10 sm:min-h-[88px]">
        <Link className="text-[22px] font-extrabold tracking-[-0.9px] text-[#27301e] no-underline" to="/">
          LearnSphere<span className="text-[#667c32]">.</span>
        </Link>
        <div className="hidden items-center gap-2 text-[13px] font-medium text-slate-500 sm:flex">
          <Sparkles className="size-4 text-[#667c32]" aria-hidden="true" />
          A focused place to learn
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,460px)] lg:gap-16 lg:py-12">
        <div className="mx-auto w-full max-w-[580px] lg:mx-0">
          <p className="mb-4 mt-0 inline-flex items-center gap-2 rounded-full border border-[#d4ddbd] bg-white/80 px-3 py-1.5 text-[10px] font-extrabold tracking-[1.6px] text-[#445523] shadow-sm">
            <span className="size-1.5 rounded-full bg-[#667c32]" aria-hidden="true" />
            YOUR NEXT CHAPTER STARTS HERE
          </p>
          <h1 className="m-0 max-w-[560px] text-[42px] font-extrabold leading-[1.04] tracking-[-2.8px] text-[#27301e] sm:text-[54px] lg:text-[62px]">
            Learn something that{' '}
            <span className="bg-gradient-to-r from-[#465820] to-[#829645] bg-clip-text text-transparent">
              moves you forward.
            </span>
          </h1>
          <p className="mb-0 mt-5 max-w-[480px] text-[15px] leading-7 text-slate-600 sm:text-base">
            {isRegister
              ? 'Build a learning habit that lasts. Create your account and find your next big idea.'
              : 'Pick up where you left off, discover a new skill, and keep moving toward your goals.'}
          </p>

          <div className="relative mx-auto mt-8 h-[260px] max-w-[500px] sm:mt-5 sm:h-[300px] lg:mx-0 lg:mt-8">
            <div className="absolute inset-x-8 bottom-6 top-5 rounded-[36px] bg-gradient-to-br from-[#e5ebd5] via-[#edf0e1] to-[#d7dfbf] shadow-inner sm:inset-x-12" aria-hidden="true" />
            <div className="absolute left-[17%] top-[18%] size-24 rounded-[28px] bg-white/40 blur-2xl sm:size-32" aria-hidden="true" />
            <div className="absolute left-[34%] top-[20%] grid size-[118px] -rotate-6 place-items-center rounded-[30px] border border-white/80 bg-gradient-to-br from-white to-[#e8eddc] text-[#52672a] shadow-[0_22px_45px_rgba(63,77,36,0.2)] sm:left-[35%] sm:size-[140px]">
              <div className="grid size-[78px] place-items-center rounded-[24px] bg-gradient-to-br from-[#465820] to-[#71883c] text-white shadow-lg sm:size-[92px]">
                <BookOpen className="size-11 stroke-[1.6]" aria-hidden="true" />
              </div>
            </div>
            <div className="absolute left-[15%] top-[34%] grid size-12 rotate-12 place-items-center rounded-2xl border border-white/80 bg-white/90 text-[#52672a] shadow-lg sm:left-[19%] sm:size-14">
              <GraduationCap className="size-7" aria-hidden="true" />
            </div>
            <div className="absolute right-[16%] top-[16%] grid size-10 -rotate-12 place-items-center rounded-xl bg-[#71883c] text-white shadow-lg sm:right-[19%] sm:size-12">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>

            <div className="absolute bottom-2 left-1/2 w-[min(290px,82%)] -translate-x-1/2 rounded-2xl border border-white/90 bg-white/95 p-4 shadow-[0_18px_40px_rgba(40,39,90,0.16)] backdrop-blur sm:bottom-1 sm:left-[52%] sm:w-[310px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="m-0 text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Learning snapshot</p>
                  <p className="mb-0 mt-1 text-sm font-bold text-[#27301e]">Your next milestone</p>
                </div>
                <span className="grid size-9 place-items-center rounded-xl bg-[#edf1e3] text-[#4f6125]">
                  <BookOpen className="size-[18px]" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Illustrative progress</span>
                <span className="text-[#445523]">68%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e4e9d5]" aria-hidden="true">
                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#465820] to-[#829645]" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end">
          {children}
          <p className="mb-0 mt-5 text-center text-[11px] leading-5 text-slate-400">
            Secure learning starts with a verified account.
          </p>
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
