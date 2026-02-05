import { ref } from 'vue'

export interface Toast {
  id: string
  title?: string
  description: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  duration?: number
  showProgress?: boolean
}

const toasts = ref<Toast[]>([])

export function useToast() {
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      duration: 5000,
      variant: 'default',
      showProgress: true,
      ...toast,
    }
    
    toasts.value.push(newToast)
    
    return id
  }
  
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const clearAllToasts = () => {
    toasts.value = []
  }
  
  const toast = (toast: Omit<Toast, 'id'>) => addToast(toast)
  
  // Convenience methods with better defaults
  toast.success = (description: string, title?: string, options?: Partial<Toast>) => 
    addToast({ 
      description, 
      title: title || 'Success', 
      variant: 'success',
      duration: 4000,
      ...options 
    })
    
  toast.error = (description: string, title?: string, options?: Partial<Toast>) => 
    addToast({ 
      description, 
      title: title || 'Error', 
      variant: 'destructive',
      duration: 6000,
      ...options 
    })
    
  toast.warning = (description: string, title?: string, options?: Partial<Toast>) => 
    addToast({ 
      description, 
      title: title || 'Warning', 
      variant: 'warning',
      duration: 5000,
      ...options 
    })

  toast.info = (description: string, title?: string, options?: Partial<Toast>) => 
    addToast({ 
      description, 
      title: title || 'Info', 
      variant: 'default',
      duration: 4000,
      ...options 
    })
  
  return {
    toasts,
    toast,
    addToast,
    removeToast,
    clearAllToasts,
  }
}