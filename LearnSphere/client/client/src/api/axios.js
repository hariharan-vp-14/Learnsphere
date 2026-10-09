import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: `${API_URL}/api/auth`,
  withCredentials: true,
})

export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  return error.response?.data?.message || error.message || fallback
}

export default api
