import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import logger from './logger';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Theme variables */
import './theme/variables.css';
import "@common/css/settings.css"
import "@common/css/theme.css"

import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import localeMessages from './locales';
import { createDxpI18n, initialiseConfig } from '@common';
import { useUserStore } from './store/user';

const pinia = createPinia().use(piniaPluginPersistedstate);
const i18n = createDxpI18n(localeMessages)

const app = createApp(App)
  .use(IonicVue, {
    mode: 'md',
    innerHTMLTemplatesEnabled: true
  })
  .use(logger, {
    level: import.meta.env.VITE_DEFAULT_LOG_LEVEL
  })
  .use(i18n)
  .use(pinia)
  .use(router)

initialiseConfig({
  postLogin: useUserStore().postLogin,
  postLogout: useUserStore().postLogout,
  get oms() { return useUserStore().oms },
  set oms(val) { useUserStore().oms = val },
  get current() { return useUserStore().current },
  set current(val) { useUserStore().current = val },
  router: router
})

router.isReady().then(() => {
  app.mount('#app');
});