import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Fulfillment from '@/views/Fulfillment.vue';
import Inventory from '@/views/Inventory.vue'
import Product from '@/views/Product.vue'
import Pipeline from '@/views/Pipeline.vue'
import PreOrder from '@/views/PreOrder.vue'
import Orders from '@/views/Orders.vue'
import JobDetails from '@/views/JobDetails.vue'
import InitialLoad from '@/views/InitialLoad.vue'
import Miscellaneous from '@/views/Miscellaneous.vue'
import Settings from "@/views/Settings.vue"
import DataManagerLogDetails from "@/views/DataManagerLogDetails.vue"
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
    path: '/inventory',
    name: 'Inventory',
    component: Inventory,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_INVENTORY_VIEW"
    }
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
    path: '/pre-order',
    name: 'PreOrder',
    component: PreOrder,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_PREORDER_VIEW"
    }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: Orders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_ORDERS_VIEW"
    }
  },
  {   
    path: '/fulfillment',
    name: 'Fulfillment',
    component: Fulfillment,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_FULFILLMENT_VIEW"
    }
  },
  {
    path: '/:category/job-details/:jobId',
    name: 'JobDetails',
    component: JobDetails,
    props: true,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_JOB_DETAILS_VIEW"
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
    path: '/miscellaneous',
    name: 'Miscellaneous',
    component: Miscellaneous,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_MISC_VIEW"
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