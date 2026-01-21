import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/Home.vue'),
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/project/Projects.vue'),
  },
  {
    path: '/workspace/:projectId',
    name: 'Workspace',
    component: () => import('@/views/workspace/Workspace.vue'),
  },
];

const router = createRouter({
  history: createWebHistory('/'),
  routes,
});

export default router;
