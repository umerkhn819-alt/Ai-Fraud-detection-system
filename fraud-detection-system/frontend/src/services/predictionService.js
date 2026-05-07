import api from './api'

export async function runPrediction(transactionId) {
  const { data } = await api.post('/predict/', { transaction_id: transactionId })
  return data
}

export async function explainPrediction(predictionId) {
  const { data } = await api.post(`/predict/explain/${predictionId}`)
  return data
}

export async function listHistory(params) {
  const { data } = await api.get('/history/', { params })
  return data
}
