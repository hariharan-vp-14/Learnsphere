import axios from 'axios'
import { API_BASE_URL } from './axios'

const coursesApi = axios.create({
  baseURL: `${API_BASE_URL}/courses`,
  withCredentials: true,
})

export default coursesApi
