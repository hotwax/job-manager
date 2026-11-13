import { ref } from 'vue';
export const omsRef = ref('local-ui-fixtures');
export const isMoquiOmsRef = ref(true);
const isAuthenticated = ref(true);
const noop = async () => {};
export function useAuth() {
 return { isAuthenticated, loginOption: ref({}), fetchLoginOptions: noop, fetchAppVersion: noop,
 checkAppVersionRedirect: () => false, login: async () => { isAuthenticated.value = true; }, logout: () => { isAuthenticated.value = false; },
 clearAuth: () => { isAuthenticated.value = false; }, updateToken: noop, updateOMS: noop, updateUserId: noop };
}
