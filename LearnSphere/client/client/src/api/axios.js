import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
export const API_URL = configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
export const API_BASE_URL = `${API_URL}/api`

const api = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
})

export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  return error.response?.data?.message || error.message || fallback
}

export default api
