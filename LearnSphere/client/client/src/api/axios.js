import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
export const API_URL = configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
export const API_BASE_URL = `${API_URL}/api`
export const AUTH_SESSION_EXPIRED_EVENT = 'learnsphere:auth-session-expired'

const api = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
})

export function clearSessionOnUnauthorized(instance) {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error.config?.url || ''
      const isPublicAuthRequest = /\/(login|register|teacher-applications|verify-email|resend-verification)\/?$/.test(url)
      if (
        error.response?.status === 401
        && !isPublicAuthRequest
        && typeof window !== 'undefined'
      ) {
        window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
      }
      return Promise.reject(error)
    }
  )
}

clearSessionOnUnauthorized(api)

export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  return error.response?.data?.message || error.message || fallback
}

export default api
