import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createGuard } from '@authing/guard-vue3';
import App from './App.vue';
import router from './routes';
import './index.css';
import { captureRefFromUrl } from './utils/referralTracker';
// Removed authing-overrides.css since we're using scoped CSS now

// 启动时捕获 ?ref= 推广邀请码（last-click 覆盖；cookie 共享 .zerocut.cn 子域）
captureRefFromUrl();

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Initialize Authing Guard
const guard = createGuard({
  appId: import.meta.env.VITE_AUTHING_APP_ID || '',
  // Add other Authing configuration as needed
});

app.use(pinia);
app.use(router);
app.use(guard);

app.mount('#app');
