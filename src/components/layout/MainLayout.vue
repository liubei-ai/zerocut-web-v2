<script setup lang="ts">
import Header from './Header.vue';
import Footer from './Footer.vue';
import Sidebar from './Sidebar.vue';

interface Props {
  showFooter?: boolean;
  showSidebar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showFooter: true,
  showSidebar: true,
});
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <Header />
    <Sidebar v-if="showSidebar" />
    <main class="flex-1">
      <slot />
    </main>
    <Footer v-if="showFooter" />
  </div>
</template>
