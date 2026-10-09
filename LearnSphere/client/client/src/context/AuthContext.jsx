import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isCurrent = true

    api.get('/me')
      .then(({ data }) => {
        if (isCurrent) setUser(data.data)
      })
      .catch((error) => {
        if (!isCurrent) return
        if (error.response?.status !== 401 && error.response?.status !== 403) {
          setAuthError(error.response?.data?.message || error.message)
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/login', credentials)
    setUser({ ...data.data, emailVerified: true })
    setAuthError('')
    return data
  }, [])

  const register = useCallback(async (details) => {
    const { data } = await api.post('/register', details)
    if (data.data?.roles) {
      setUser((current) => (
        current?.id === data.data.id
          ? { ...current, ...data.data }
          : current
      ))
    }
    return data
  }, [])

  const resendVerification = useCallback(async (email) => {
    const { data } = await api.post('/resend-verification', { email })
    return data
  }, [])

  const verifyEmail = useCallback(async (token) => {
    const { data } = await api.post('/verify-email', { token })
    return data
  }, [])

  const logout = useCallback(async () => {
    await api.post('/logout')
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    isLoading,
    authError,
    login,
    register,
    resendVerification,
    verifyEmail,
    logout,
  }), [
    user,
    isLoading,
    authError,
    login,
    register,
    resendVerification,
    verifyEmail,
    logout,
  ])

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
