<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const isHomeActive = computed(() => route.name === 'Home')
const isProjectsActive = computed(() => route.name === 'Projects')

const navigateToHome = () => {
  router.push('/')
}

const navigateToProjects = () => {
  router.push('/projects')
}
</script>

<template>
  <aside class="fixed left-6 top-1/2 -translate-y-1/2 z-[1000]">
    <div class="flex flex-col gap-1 bg-white rounded-[50px] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <button 
        @click="navigateToHome"
        :class="[
          'w-12 h-12 flex items-center justify-center rounded-full text-xl transition-colors',
          isHomeActive 
            ? 'bg-[#111827] text-white hover:bg-black' 
            : 'text-[#6b7280] hover:bg-[#f3f4f6]'
        ]"
      >
        🏠
      </button>
      <button 
        @click="navigateToProjects"
        :class="[
          'w-12 h-12 flex items-center justify-center rounded-full text-xl transition-colors',
          isProjectsActive 
            ? 'bg-[#111827] text-white hover:bg-black' 
            : 'text-[#6b7280] hover:bg-[#f3f4f6]'
        ]"
      >
        📁
      </button>
      <button class="w-12 h-12 flex items-center justify-center rounded-full text-[#6b7280] text-xl transition-colors hover:bg-[#f3f4f6]">
        👤
      </button>
      <button class="w-12 h-12 flex items-center justify-center rounded-full text-[#6b7280] text-xl transition-colors hover:bg-[#f3f4f6]">
        ⚙️
      </button>
    </div>
  </aside>
</template>
