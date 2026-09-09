import toast from 'react-hot-toast'
import { ApiError } from '@/lib/apiClient'

export function notifySuccess(message: string) {
  toast.success(message)
}

export function notifyError(error: unknown, fallback = 'Algo salió mal. Intenta de nuevo.') {
  const message = error instanceof ApiError ? error.message : fallback
  toast.error(message)
}
