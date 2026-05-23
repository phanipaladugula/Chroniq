import axios from 'axios'

// In Docker: VITE_API_URL is empty string → nginx proxies /api/* to the backend.
// In local dev: falls back to http://localhost:8000/api
const _raw = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const BASE_URL = _raw === '' ? '/api' : _raw

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong'
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
  }
)

export default client
