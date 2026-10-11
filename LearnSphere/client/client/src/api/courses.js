import axios from 'axios'
import { API_BASE_URL, clearSessionOnUnauthorized } from './axios'

const coursesApi = axios.create({
  baseURL: `${API_BASE_URL}/courses`,
  withCredentials: true,
})

clearSessionOnUnauthorized(coursesApi)

export default coursesApi
