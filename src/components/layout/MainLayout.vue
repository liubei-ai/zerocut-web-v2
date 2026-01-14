<script setup lang="ts">
import Header from './Header.vue';
import Footer from './Footer.vue';
import Sidebar from './Sidebar.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <Header />
    <Sidebar />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </div>
</template>
