import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Catalog from '@/views/catalog.vue'
import Pipeline from '@/views/Pipeline.vue'
import ImportMonitor from '@/views/ImportMonitor.vue'
import Settings from "@/views/Settings.vue"
import DataManagerLogDetails from "@/views/DataManagerLogDetails.vue"
import PartnerDetails from "@/views/PartnerDetails.vue"
import CategoryJobs from "@/views/CategoryJobs.vue"
import JobDetailConfig from "@/views/JobDetailConfig.vue"
import ImportQueue from "@/views/ImportQueue.vue"
import FileHistory from "@/views/FileHistory.vue"
import FileDetail from "@/views/FileDetail.vue"
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@common'
import 'vue-router'
import { loader } from '@/user-utils';


// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}

const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    next('/login')
  }
  next()
};

const loginGuard = (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !to.query?.token && !to.query?.oms) {
    next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/pipeline'
  },
  {
    path: '/pipeline',
    name: 'Pipeline',
    component: Pipeline,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/import-logs-detail/:jobId',
    name: 'DataManagerLogDetails',
    component: DataManagerLogDetails,
    beforeEnter: authGuard,
    props: true
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
    path: '/import-monitor',
    name: 'ImportMonitor',
    component: ImportMonitor,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    beforeEnter: loginGuard
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  },
  {
    path: "/partner/:name",
    name: "PartnerDetails",
    component: PartnerDetails,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: "/partner/:partner/category/:category",
    name: "CategoryJobs",
    component: CategoryJobs,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: "/partner/:partner/category/:category/job/:jobId",
    name: "JobDetailConfig",
    component: JobDetailConfig,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: "/import-queue",
    name: "ImportQueue",
    component: ImportQueue,
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
    beforeEnter: authGuard
  },
  {
    path: '/manual-uploads/:type',
    name: 'ImportDetail',
    component: () => import('@/views/ImportDetail.vue'),
    beforeEnter: authGuard
  },
  {
    path: '/manual-uploads',
    name: 'ManualUploads',
    component: () => import('@/views/ManualUploads.vue'),
    beforeEnter: authGuard
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


router.beforeEach((to, from) => {
  if (to.meta.permissionId && !hasPermission(to.meta.permissionId)) {
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