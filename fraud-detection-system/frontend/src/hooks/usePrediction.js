import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as pred from '../services/predictionService'

export function usePrediction() {
  const qc = useQueryClient()
  const predict = useMutation({
    mutationFn: (transactionId) => pred.runPrediction(transactionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  })
  const explain = useMutation({
    mutationFn: (predictionId) => pred.explainPrediction(predictionId),
  })
  return { predict, explain }
}
