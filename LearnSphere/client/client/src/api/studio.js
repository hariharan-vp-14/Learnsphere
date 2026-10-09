import axios from 'axios'
import { API_BASE_URL } from './axios'

const studioApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export default studioApi
