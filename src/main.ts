import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createGuard } from '@authing/guard-vue3';
import App from './App.vue';
import router from './routes';
import './index.css';
import { buildAuthingGuardConfig } from './features/authingGuardConfig';
import { captureRefFromUrl } from './utils/referralTracker';
// Removed authing-overrides.css since we're using scoped CSS now

// 启动时捕获 ?ref= 推广邀请码（last-click 覆盖；cookie 共享 .zerocut.cn 子域）
captureRefFromUrl();

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Initialize Authing Guard
const guard = createGuard(
  buildAuthingGuardConfig(
    import.meta.env.VITE_AUTHING_APP_ID || '',
    import.meta.env.VITE_AUTHING_DOMAIN || '',
  ),
);

app.use(pinia);
app.use(router);
app.use(guard);

app.mount('#app');
