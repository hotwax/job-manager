import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Inventory from '@/views/Inventory.vue'
import Product from '@/views/Product.vue'
import Pipeline from '@/views/Pipeline.vue'
import PreOrder from '@/views/PreOrder.vue'
import Orders from '@/views/Orders.vue'
import InitialLoad from '@/views/InitialLoad.vue'
import Login from '@/views/Login.vue'
import Settings from "@/views/Settings.vue"
import store from '@/store'
import { alertController } from '@ionic/vue';

const authGuard = (to: any, from: any, next: any) => {
  if (store.getters['user/isAuthenticated']) {
      next()
  } else {
    next("/login")
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  if (!store.getters['user/isAuthenticated']) {
      next()
  } else {
    next("/")
  }
};

const before = async (to: any, from: any, next: any) => {
  console.log(store.getters['job/getShowAlertBoolean']);
  if(store.getters['job/getShowAlertBoolean']) {
    const alert = await alertController
    .create({
      header: 'Discard changes',
      message: 'All unsaved changes will be lost. Are you sure you want to leave this page.',
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
          handler: async () => {
            store.dispatch('job/updateShowAlertCondition', false);
          }
        },
        {
          text: 'Save',
          handler: async () => {
            store.dispatch('job/updateShowAlertCondition', false);
            next()
          }  
        }
      ]
    });
    // next()
    alert.present();
  } else {
    next()
  }
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/pipeline'
  },
  {
    path: '/pipeline',
    name: 'Pipeline',
    component: Pipeline,
    beforeEnter: authGuard
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: Inventory,
    beforeEnter: authGuard
  },
  {  
    path: '/product',
    name: 'Product',
    component: Product,
    beforeEnter: authGuard
  },
  {
    path: '/pre-order',
    name: 'PreOrder',
    component: PreOrder,
    beforeEnter: [authGuard, before]
  },
  {
    path: '/orders',
    name: 'Orders',
    component: Orders,
    beforeEnter: authGuard,
  },
  {
    path: '/initial-load',
    name: 'InitialLoad',
    component: InitialLoad,
    beforeEnter: authGuard
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
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

export default router