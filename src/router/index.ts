import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Catalog from '@/views/Catalog.vue'
import Settings from "@/views/Settings.vue"
import FileHistory from "@/views/FileHistory.vue"
import FileDetail from "@/views/FileDetail.vue"
import { showToast } from '@/utils'
import { translate } from '@common'
import 'vue-router'
import { useAuth } from '@common/composables/useAuth';
import ImportDetail from '@/views/ImportDetail.vue';
import ManualUploads from '@/views/ManualUploads.vue';
import JobDetail from '@/views/JobDetail.vue';
import SystemMessageMonitor from '@/views/SystemMessageMonitor.vue';
import SystemMessageDetailView from '@/views/SystemMessageDetailView.vue';
import SystemMessageTypes from '@/views/SystemMessageTypes.vue';
import SystemMessageTypeDetail from '@/views/SystemMessageTypeDetail.vue';
import SystemMessageRemotes from '@/views/SystemMessageRemotes.vue';
import SystemMessageRemoteDetail from '@/views/SystemMessageRemoteDetail.vue';
import Login from '@common/components/Login.vue';
import { useUserStore } from '@/store/user';

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}

const authGuard = async () => {
  if (!useAuth().isAuthenticated.value) {
    return { path: '/login' };
  }
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/catalog'
  },
  {
    path: '/catalog',
    name: 'Catalog',
    component: Catalog,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  },
  {
    path: "/file-history",
    name: "FileHistory",
    component: FileHistory,
    beforeEnter: authGuard
  },
  {
    path: "/file-history/:id",
    name: "FileDetail",
    component: FileDetail,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/manual-uploads/:type',
    name: 'ImportDetail',
    component: ImportDetail,
    beforeEnter: authGuard
  },
  {
    path: '/manual-uploads',
    name: 'ManualUploads',
    component: ManualUploads,
    beforeEnter: authGuard
  },
  {
    path: '/job/:jobName',
    name: 'JobDetail',
    component: JobDetail,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/system-messages',
    name: 'SystemMessageMonitor',
    component: SystemMessageMonitor,
    beforeEnter: authGuard
  },
  {
    path: '/system-messages/:id',
    name: 'SystemMessageDetailView',
    component: SystemMessageDetailView,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/system-message-types',
    name: 'SystemMessageTypes',
    component: SystemMessageTypes,
    beforeEnter: authGuard
  },
  {
    path: '/system-message-types/new',
    name: 'CreateSystemMessageType',
    component: SystemMessageTypeDetail,
    beforeEnter: authGuard
  },
  {
    path: '/system-message-types/:id',
    name: 'SystemMessageTypeDetail',
    component: SystemMessageTypeDetail,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/system-message-remotes',
    name: 'SystemMessageRemotes',
    component: SystemMessageRemotes,
    beforeEnter: authGuard
  },
  {
    path: '/system-message-remotes/new',
    name: 'CreateSystemMessageRemote',
    component: SystemMessageRemoteDetail,
    beforeEnter: authGuard
  },
  {
    path: '/system-message-remotes/:id',
    name: 'SystemMessageRemoteDetail',
    component: SystemMessageRemoteDetail,
    beforeEnter: authGuard,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


router.beforeEach((to, from) => {
  if (to.meta.permissionId && !useUserStore().hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else {
      showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router
