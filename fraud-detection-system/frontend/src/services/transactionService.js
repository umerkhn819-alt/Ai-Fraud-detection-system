import api from './api'

export async function createTransaction(body) {
  const { data } = await api.post('/transactions/', body)
  return data
}

export async function listTransactions(params = {}) {
  const { data } = await api.get('/transactions/', { params })
  return data
}

export async function uploadCsv(file) {
  const form = new FormData()
  form.append('file', file)
  // Do NOT set Content-Type manually — axios auto-adds the correct boundary for FormData
  const { data } = await api.post('/transactions/upload-csv', form)
  return data
}

export async function resetData() {
  const { data } = await api.delete('/transactions/admin/reset-data')
  return data
}
