import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getApiErrorMessage } from './api/axios'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'

function VerifyEmail() {
  const { verifyEmail } = useAuth()
  const location = useLocation()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const verificationStarted = useRef('')
  const token = new URLSearchParams(location.search).get('token')

  useEffect(() => {
    if (!token) return
    if (verificationStarted.current === token) return
    verificationStarted.current = token

    verifyEmail(token)
      .then((result) => {
        setStatus('success')
        setMessage(result.message)
      })
      .catch((error) => {
        setStatus('error')
        setMessage(getApiErrorMessage(error))
      })
  }, [token, verifyEmail])

  const visibleStatus = token ? status : 'error'
  const visibleMessage = token ? message : 'The verification link is missing its token.'
  return (
    <main className="mx-auto min-h-screen max-w-[1280px] px-[18px] sm:px-[26px] lg:px-16">
    <header className="flex min-h-[70px] items-center justify-between border-b border-[#e8e9ed] sm:min-h-[88px]">
      <Link className="text-[22px] font-extrabold tracking-[-0.8px] text-[#27301e] no-underline" to="/">
        LearnSphere<span className="text-brand">.</span>
      </Link>
      <span className="text-[11px] text-[#74798d] sm:text-[13px]">A focused place to learn</span>
    </header>
    <section
      className="mx-auto mt-[12vh] max-w-[600px] rounded-[18px] border border-[#e8e9ed] bg-white px-6 py-10 text-center shadow-[0_24px_70px_rgba(34,39,75,0.09)] sm:px-[30px] sm:py-[60px]"
      role={visibleStatus === 'error' ? 'alert' : 'status'}
    >
      {visibleStatus === 'loading' && (
        <span className="mb-[18px] inline-block size-7 animate-spin rounded-full border-[3px] border-[#e4e9d5] border-t-brand" />
      )}
      <h2 className="m-0 text-2xl font-bold tracking-[-0.7px] text-[#27301e]">
        {visibleStatus === 'loading' ? 'Verifying your email' :
          visibleStatus === 'success' ? 'Email verified' : 'Unable to verify email'}
      </h2>
      <p className="mx-0 my-[9px] mb-6 text-[13px] leading-[1.55] text-[#777c8f]">
        {visibleStatus === 'loading' ? 'Please wait while we activate your account.' : visibleMessage}
      </p>
      {visibleStatus !== 'loading' && (
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-[17px] text-[13px] font-bold text-white no-underline transition hover:-translate-y-px hover:bg-[#354418]"
          to="/login"
        >
          Continue to sign in
        </Link>
      )}
      </section>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
