import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Catalog from "@/views/Catalog.vue";
import Settings from "@/views/Settings.vue"
import FileHistory from "@/views/FileHistory.vue"
import FileHistoryDetail from "@/views/FileHistoryDetail.vue"
import { showToast } from '@/utils'
import { translate } from '@common'
import { alertController } from '@ionic/vue'
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
import SolrMonitoring from '@/views/SolrMonitoring.vue';
import SolrRepair from '@/views/SolrRepair.vue';
import Login from '@common/components/Login.vue';
import { useUserStore } from '@/store/user';
import { useDataDocumentGraphStore } from '@/store/dataDocumentGraph';
import DataDocumentCatalog from '@/views/DataDocumentCatalog.vue';
import DataDocumentGraphBuilder from '@/views/DataDocumentGraphBuilder.vue';
import DataDocumentExportHistory from '@/views/DataDocumentExportHistory.vue';
import DataDocumentFeeds from '@/views/DataDocumentFeeds.vue';
import DataDocumentFeedDetail from '@/views/DataDocumentFeedDetail.vue';

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
    name: "FileHistoryDetail",
    component: FileHistoryDetail,
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
  },
  {
    path: '/data-documents',
    name: 'DataDocuments',
    component: DataDocumentCatalog,
    beforeEnter: authGuard
  },
  // {
  //   path: '/data-document-feeds',
  //   name: 'DataDocumentFeeds',
  //   component: DataDocumentFeeds,
  //   beforeEnter: authGuard
  // },
  // {
  //   path: '/data-document-feeds/:id',
  //   name: 'DataDocumentFeedDetail',
  //   component: DataDocumentFeedDetail,
  //   beforeEnter: authGuard,
  //   props: true
  // },
  {
    // Single detail page for a data document (also create via id="new"). Absorbs the former
    // detail / edit / run pages as in-page segments (Fields / Conditions / Preview / Usage /
    // Export History) reachable via ?segment=.
    path: '/data-documents/:id/graph',
    name: 'DataDocumentGraphBuilder',
    component: DataDocumentGraphBuilder,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/data-document-export-history',
    name: 'DataDocumentExportHistory',
    component: DataDocumentExportHistory,
    beforeEnter: authGuard
  },
  {
    path: '/data-document-export-history/:id',
    name: 'DataDocumentExportDetail',
    component: SystemMessageDetailView,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/solr-monitoring',
    name: 'SolrMonitoring',
    component: SolrMonitoring,
    beforeEnter: authGuard
  },
  {
    path: '/solr-repair',
    name: 'SolrRepair',
    component: SolrRepair,
    beforeEnter: authGuard
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


const DATA_DOCUMENT_BUILDER_ROUTES = ["DataDocumentGraphBuilder"];

// Prompt to save or discard unsaved data-document builder changes before leaving.
// Lives here (not as an in-component onBeforeRouteLeave) because Ionic's IonRouterOutlet
// caches pages, so per-component leave guards do not fire reliably on menu navigation.
router.beforeEach(async (to, from) => {
  const leavingBuilder = DATA_DOCUMENT_BUILDER_ROUTES.includes(from.name as string);
  const enteringSameDoc = DATA_DOCUMENT_BUILDER_ROUTES.includes(to.name as string) && to.params.id === from.params.id;
  if (!leavingBuilder || enteringSameDoc) return true;

  const graphStore = useDataDocumentGraphStore();
  if (!graphStore.isDirty) return true;

  const alert = await alertController.create({
    header: translate("Unsaved changes"),
    message: translate("You have unsaved changes to this data document. Save them before leaving?"),
    buttons: [
      { text: translate("Cancel"), role: "cancel" },
      { text: translate("Discard"), role: "discard" },
      { text: translate("Save"), role: "save" }
    ]
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  if (role === "save") {
    try {
      await graphStore.saveGraph();
      return true;
    } catch (error) {
      showToast(translate("Failed to save data document graph."));
      return false;
    }
  }
  if (role === "discard") {
    graphStore.discardDraft();
    return true;
  }
  return false;
});

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
