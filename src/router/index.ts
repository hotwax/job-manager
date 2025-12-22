import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Product from '@/views/Product.vue'
import Pipeline from '@/views/Pipeline.vue'
import InitialLoad from '@/views/InitialLoad.vue'
import Reports from '@/views/Reports.vue'
import BulkEditor from '@/views/BulkEditor.vue'
import Settings from "@/views/Settings.vue"
import DataManagerLogDetails from "@/views/DataManagerLogDetails.vue"
import PartnerDetails from "@/views/PartnerDetails.vue"
import CategoryJobs from "@/views/CategoryJobs.vue"
import JobDetailConfig from "@/views/JobDetailConfig.vue"
import store from '@/store'
import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@hotwax/dxp-components'
import 'vue-router'
import { DxpLogin } from '@hotwax/dxp-components';
import { useAuthStore } from '@hotwax/dxp-components'
import { loader } from '@/user-utils';

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}

const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !store.getters['user/isAuthenticated']) {
    await loader.present('Authenticating')
    // TODO use authenticate() when support is there
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    loader.dismiss()
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
      permissionId: "APP_PIPELINE_VIEW"
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
    path: '/product',
    name: 'Product',
    component: Product,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_PRODUCT_VIEW"
    }
  },
  {  
    path: '/initial-load',
    name: 'InitialLoad',
    component: InitialLoad,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_INITIAL_LOAD_VIEW"
    }
  },
  {  
    path: '/bulk-editor',
    name: 'BulkEditor',
    component: BulkEditor,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_BULK_EDITOR_VIEW"
    }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_REPORT_VIEW"
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: DxpLogin,
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
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
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