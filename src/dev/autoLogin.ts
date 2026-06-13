// Dev-only auto-login shim. Tree-shaken out of production builds because
// every call site is guarded by `import.meta.env.DEV`.
//
// When all three of VITE_DEV_OMS / VITE_DEV_USERNAME / VITE_DEV_PASSWORD are present
// in .env.local, this composable submits a login on app mount so you don't have to
// click through the Login UI on every dev reload.
//
// Wired by main.ts ONLY in dev mode:
//
//   if (import.meta.env.DEV) {
//     import('./dev/autoLogin').then(({ tryDevAutoLogin }) => tryDevAutoLogin());
//   }

import { useAuth } from '@common/composables/useAuth';
import { commonUtil, cookieHelper, logger } from '@common';
import { accxuiConfig } from '@common/core/configRegistry';
import { useUserStore } from '@/store/user';

function redirectFromLogin() {
  if (window.location.pathname === '/login') {
    window.location.replace('/');
  }
}

export async function tryDevAutoLogin(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (import.meta.env.VITE_DEV_AUTO_LOGIN === 'false') return;

  const oms = import.meta.env.VITE_DEV_OMS as string | undefined;
  const username = import.meta.env.VITE_DEV_USERNAME as string | undefined;
  const password = import.meta.env.VITE_DEV_PASSWORD as string | undefined;

  if (!oms || !username || !password) return;

  const auth = useAuth();
  const userStore = useUserStore();
  // If the browser already has a valid session, do not replace it with the dev default.
  if (auth.isAuthenticated.value && commonUtil.getMaargURL()) {
    redirectFromLogin();
    return;
  }

  try {
    // Seed the OMS cookie so commonUtil.getOmsURL() resolves correctly before login.
    userStore.oms = oms;
    accxuiConfig.value.oms = oms;
    auth.updateOMS(oms);
    cookieHelper().set('oms', oms);

    // Fetch login options so the Maarg URL is populated in cookies (mirrors Login.vue).
    await auth.fetchLoginOptions();

    await auth.login(username, password);
    userStore.current = {
      ...userStore.current,
      userId: userStore.current.userId || cookieHelper().get('userId')
    };
    accxuiConfig.value.oms = oms;
    accxuiConfig.value.current = userStore.current;
    redirectFromLogin();
    logger.info('[dev] auto-login succeeded for', username, 'on', oms);
  } catch (err) {
    // Never log the password. The composable already shows a toast on failure.
    logger.warn('[dev] auto-login failed; falling back to Login UI');
  }
}
