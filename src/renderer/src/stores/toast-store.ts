import { create } from 'zustand'
import { v4 as uuid } from 'uuid'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  message: string
  detail?: string
  duration: number
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const item: ToastItem = {
      id: uuid(),
      duration: 3000,
      ...toast,
    }
    set((state) => ({ toasts: [...state.toasts, item] }))
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
