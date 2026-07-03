import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './i18n';
import { blurFocusOnEscape } from './lib/blurFocusOnEscape';
import { router } from './router';
import './style.css';
import 'vue-sonner/style.css';

blurFocusOnEscape();

createApp(App).use(createPinia()).use(i18n).use(router).mount('#app');
