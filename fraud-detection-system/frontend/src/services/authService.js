import api from './api'

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function updateProfile(full_name) {
  const { data } = await api.patch('/auth/me', { full_name })
  return data
}

export async function changePassword(current_password, new_password) {
  await api.post('/auth/change-password', { current_password, new_password })
}
