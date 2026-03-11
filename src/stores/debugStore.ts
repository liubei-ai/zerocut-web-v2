import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export const useDebugStore = defineStore('debug', () => {
  const route = useRoute()
  const isDebugMode = ref(false)

  // Check URL parameter on initialization
  const checkDebugParam = () => {
    const urlParams = new URLSearchParams(window.location.search)
    isDebugMode.value = urlParams.get('debug') === 'true'
  }

  // Initialize debug mode from URL
  checkDebugParam()

  // Watch for route changes
  watch(
    () => route.query.debug,
    (debugParam) => {
      isDebugMode.value = debugParam === 'true'
    }
  )

  const toggleDebugMode = () => {
    isDebugMode.value = !isDebugMode.value
  }

  const setDebugMode = (value: boolean) => {
    isDebugMode.value = value
  }

  return {
    isDebugMode,
    toggleDebugMode,
    setDebugMode,
    checkDebugParam
  }
})
