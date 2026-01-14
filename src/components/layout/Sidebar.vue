<script setup lang="ts">
import { Home, FolderOpen, Users, Settings } from 'lucide-vue-next';
</script>

<template>
  <aside class="fixed left-4 top-1/2 z-40 -translate-y-1/2">
    <div class="flex flex-col gap-3 rounded-full bg-white p-3 shadow-lg dark:bg-slate-900">
      <button class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
        <Home class="h-5 w-5" />
      </button>
      <button class="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
        <FolderOpen class="h-5 w-5" />
      </button>
      <button class="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
        <Users class="h-5 w-5" />
      </button>
      <button class="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
        <Settings class="h-5 w-5" />
      </button>
    </div>
  </aside>
</template>
