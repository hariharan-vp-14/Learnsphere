import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { user, isLoading, authError } = useAuth()

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-[1280px] px-[18px] sm:px-[26px] lg:px-16">
        <div className="py-10 text-center" role="status">
          <span className="mb-[18px] inline-block size-7 animate-spin rounded-full border-[3px] border-[#e7e6ff] border-t-brand" />
          <p className="my-0 text-[13px] leading-[1.55] text-[#777c8f]">Loading your account…</p>
        </div>
      </main>
    )
  }

  if (authError) {
    return (
      <main className="mx-auto min-h-screen max-w-[1280px] px-[18px] py-6 sm:px-[26px] lg:px-16">
        <p className="m-0 rounded-[7px] bg-[#fff1f0] px-3 py-2.5 text-xs leading-[1.5] text-[#a53731]" role="alert">
          Unable to check your account: {authError}
        </p>
        <Link className="mt-4 inline-block text-sm font-semibold text-brand" to="/login">
          Return to sign in
        </Link>
      </main>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
