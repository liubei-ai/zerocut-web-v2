<script setup lang="ts">
import { useAttrs, computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <textarea
    :value="modelValue"
    @input="handleInput"
    :class="cn(
      'flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300',
      attrs.class as string
    )"
    v-bind="$attrs"
  />
</template>
