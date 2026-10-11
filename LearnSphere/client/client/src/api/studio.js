import axios from 'axios'
import { API_BASE_URL, clearSessionOnUnauthorized } from './axios'

const studioApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

clearSessionOnUnauthorized(studioApi)

export default studioApi
