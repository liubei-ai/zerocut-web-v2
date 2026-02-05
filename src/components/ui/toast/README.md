# Toast Notification System

This project uses `reka-ui` for toast notifications with a custom composable for easy usage.

## Setup

The toast system is already set up in the project:

1. `Toaster` component is included in `App.vue`
2. API client automatically shows error toasts
3. Auth store shows success/error toasts

## Usage

### Basic Usage

```typescript
import { useToast } from '@/composables/useToast'

const { toast } = useToast()

// Basic toast
toast({
  description: 'This is a basic toast message',
  title: 'Optional Title'
})

// Success toast
toast.success('Operation completed successfully!')

// Error toast
toast.error('Something went wrong', 'Error Title')

// Warning toast
toast.warning('Please check your input', 'Warning')
```

### Toast Options

```typescript
toast({
  title: 'Optional title',
  description: 'Toast message', // Required
  variant: 'default' | 'destructive' | 'success' | 'warning',
  duration: 5000 // Auto-dismiss after 5 seconds (0 = no auto-dismiss)
})
```

### Automatic Error Handling

The API client (`src/api/client.ts`) automatically shows error toasts for:

- HTTP errors (4xx, 5xx)
- Network errors
- Authentication failures
- API-level errors

### Manual Toast Management

```typescript
const { toasts, addToast, removeToast } = useToast()

// Add a toast and get its ID
const toastId = addToast({
  description: 'Custom toast',
  variant: 'success'
})

// Remove a specific toast
removeToast(toastId)

// Access all current toasts
console.log(toasts.value)
```

## Styling

Toast styles are defined in:
- `src/components/ui/toast/Toast.vue` - Component styles
- `src/index.css` - Animation keyframes and theme colors

The toasts use Tailwind CSS classes and support both light and dark themes.

## Examples

### In a Vue Component

```vue
<template>
  <button @click="showToast">Show Toast</button>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toast } = useToast()

const showToast = () => {
  toast.success('Button clicked!', 'Success')
}
</script>
```

### In a Store (Pinia)

```typescript
import { useToast } from '@/composables/useToast'

export const useMyStore = defineStore('myStore', () => {
  const { toast } = useToast()
  
  const saveData = async () => {
    try {
      await api.save()
      toast.success('Data saved successfully!')
    } catch (error) {
      // Error toast is automatically shown by API client
      // But you can add custom handling if needed
    }
  }
  
  return { saveData }
})
```