import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// ─── REQUEST interceptor ─────────────────────────────────────
// Runs before EVERY request — reads token from localStorage fresh each time
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    if (config.headers.set) {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  // For FormData uploads: let axios/browser auto-set Content-Type with boundary
  if (config.data instanceof FormData) {
    if (config.headers.delete) {
      config.headers.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
    }
  }
  return config
}, (error) => Promise.reject(error))

// ─── RESPONSE interceptor ────────────────────────────────────
// On 401: clear token. React Router's ProtectedRoute handles redirect.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      if (!url.includes('/auth/login')) {
        localStorage.removeItem('token')
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
