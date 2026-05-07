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
  const { data } = await api.post('/transactions/upload-csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
