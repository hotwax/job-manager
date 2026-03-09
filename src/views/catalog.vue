<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>
              Job catalog
            </h1>
            <p>
              Manage and configure integration tasks.
            </p>
          </div>
          <ion-button @click="openCreateJobModal()">
            <ion-icon slot="end" :ios="addOutline" :md="addOutline"></ion-icon>
            {{ translate("Add job") }}
          </ion-button>
        </div>

        <ion-card>
          <ion-searchbar :placeholder="translate('Search jobs')"></ion-searchbar>
          
          <ion-breadcrumbs v-if="navigationStack.length > 0" class="ion-padding-start ion-padding-top">
            <ion-breadcrumb @click="resetNavigation">All</ion-breadcrumb>
            <ion-breadcrumb v-for="(cat, index) in navigationStack" :key="cat.id" @click="navigateToStackIndex(index)">
              {{ cat.name }}
            </ion-breadcrumb>
          </ion-breadcrumbs>

          <div class="categories">
            <ion-chip v-for="category in currentLevelCategories" :key="category.id" @click="selectCategory(category)" :outline="selectedCategory !== category.id" :color="selectedCategory === category.id ? 'primary' : ''">
              <ion-label>{{ category.name }}</ion-label>
              <ion-icon v-if="category.subCategories && category.subCategories.length > 0" :icon="chevronForwardOutline" />
            </ion-chip>
          </div>
        </ion-card>

        <div class="jobs">
          <ion-card v-for="job in filteredJobs" :key="job.id">
            <ion-card-header>
              <ion-card-subtitle>{{ job.direction }}</ion-card-subtitle>
              <ion-card-title>{{ job.name }}</ion-card-title>
              <code>{{ job.code }}</code>
            </ion-card-header>
            <ion-item lines="none" detail button @click="router.push(job.path)">
              <ion-label>
                {{ job.status }}: {{ job.frequency }}
              </ion-label>
            </ion-item>
          </ion-card>
        </div>

      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBreadcrumb,
  IonBreadcrumbs,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent, ref, computed } from 'vue';
import router from '@/router';
import { addOutline, chevronForwardOutline } from 'ionicons/icons';
import { translate } from '@common';
import CreateJobModal from '@/components/CreateJobModal.vue';

export default defineComponent({
  name: 'Catalog',
  components: {
    IonBreadcrumb,
    IonBreadcrumbs,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar
  },
  setup() {
    const categories = ref([
      { id: 'Shopify', name: 'Shopify', subCategories: [] },
      { 
        id: 'NetSuite', 
        name: 'NetSuite', 
        subCategories: [
          { id: 'NS_ORDER', name: 'Order' },
          { id: 'NS_INVENTORY', name: 'Inventory' },
          { id: 'NS_TRANSFER_ORDER', name: 'Transfer Order' }
        ] 
      },
      { id: 'Orders', name: 'Orders' },
      { id: 'Inventory', name: 'Inventory' }
    ]);

    const selectedCategory = ref('All');
    const navigationStack = ref([] as any[]);

    const currentLevelCategories = computed(() => {
      if (navigationStack.value.length === 0) {
        return categories.value;
      }
      return navigationStack.value[navigationStack.value.length - 1].subCategories || [];
    });

    const selectCategory = (category: any) => {
      selectedCategory.value = category.id;
      if (category.subCategories && category.subCategories.length > 0) {
        navigationStack.value.push(category);
      }
    };

    const resetNavigation = () => {
      navigationStack.value = [];
      selectedCategory.value = 'All';
    };

    const navigateToStackIndex = (index: number) => {
      navigationStack.value = navigationStack.value.slice(0, index + 1);
      selectedCategory.value = navigationStack.value[index].id;
    };

    const jobs = [
      {
        id: 'import-sales-orders-shopify',
        name: 'Import Sales Orders (Shopify)',
        code: 'importShopifySalesOrders',
        direction: 'SHOPIFY → HOTWAX',
        frequency: 'Every 15m',
        status: 'Enabled',
        path: '/partner/HotWax/category/Shopify/job/import-sales-order',
        categories: ['Shopify', 'Orders']
      },
      {
        id: 'import-sales-orders',
        name: 'Import Sales Orders (NS)',
        code: 'importNetSuiteSalesOrders',
        direction: 'NETSUITE → HOTWAX',
        frequency: 'Every 15m',
        status: 'Enabled',
        path: '/partner/HotWax/category/NetSuite/job/import-sales-order',
        categories: ['NetSuite', 'Orders']
      },
      {
        id: 'order-status',
        name: 'Sync Order Status to NS',
        code: 'syncOrderStatusNetSuite',
        direction: 'HOTWAX → NETSUITE',
        frequency: 'Every 15m',
        status: 'Enabled',
        path: '/partner/HotWax/category/NetSuite/job/sync-order-status',
        categories: ['NetSuite', 'Orders']
      },
      {
        id: 'transfer-orders',
        name: 'Import Transfer Orders',
        code: 'importNetSuiteTransferOrders',
        direction: 'NETSUITE → HOTWAX',
        frequency: 'Hourly',
        status: 'Enabled',
        path: '/partner/HotWax/category/NetSuite/job/import-transfer-orders',
        categories: ['NetSuite', 'Orders', 'Inventory']
      },
      {
        id: 'fulfillments',
        name: 'Export Fulfillments to NS',
        code: 'exportFulfillmentsNetSuite',
        direction: 'HOTWAX → NETSUITE',
        frequency: 'Every 30m',
        status: 'Enabled',
        path: '/partner/HotWax/category/NetSuite/job/export-fulfillments',
        categories: ['NetSuite', 'Orders']
      },
      {
        id: 'customer-deposits',
        name: 'Sync Customer Deposits',
        code: 'syncNetSuiteDeposits',
        direction: 'NETSUITE → HOTWAX',
        frequency: 'Every 2h',
        status: 'Paused',
        path: '/partner/HotWax/category/NetSuite/job/sync-customer-deposits',
        categories: ['NetSuite']
      },
      {
        id: 'sync-inventory-shopify',
        name: 'Sync Inventory to Shopify',
        code: 'syncShopifyInventory',
        direction: 'HOTWAX → SHOPIFY',
        frequency: 'Every 15m',
        status: 'Enabled',
        path: '/partner/HotWax/category/Shopify/job/sync-inventory',
        categories: ['Shopify', 'Inventory']
      },
      {
        id: 'import-bulk-orders',
        name: 'Import Bulk Orders',
        code: 'importBulkOrders',
        direction: 'FILE → HOTWAX',
        frequency: 'Daily',
        status: 'Enabled',
        path: '/partner/HotWax/category/Orders/job/import-bulk-orders',
        categories: ['Orders']
      }
    ];

    const filteredJobs = computed(() => {
      if (selectedCategory.value === 'All') return jobs;
      // Simple initial check: if the job has the category ID directly
      // In a real app, this would be more complex (checking parent categories etc)
      return jobs.filter(job => job.categories.includes(selectedCategory.value) || 
                                (selectedCategory.value === 'NetSuite' && job.categories.includes('NetSuite')));
    });

    const openCreateJobModal = async () => {
      const modal = await modalController.create({
        component: CreateJobModal,
        componentProps: {
          categories: categories.value
        }
      });
      modal.present();

      const { data, role } = await modal.onDidDismiss();
      if (role === 'confirm') {
        console.log('Job created:', data);
        // Here you would typically call an API to save the job
      }
    };

    return {
      addOutline,
      chevronForwardOutline,
      categories,
      currentLevelCategories,
      filteredJobs,
      jobs,
      navigationStack,
      navigateToStackIndex,
      openCreateJobModal,
      resetNavigation,
      router,
      selectCategory,
      selectedCategory,
      translate
    }
  }
});
</script>

<style scoped>

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.categories {
  padding: 0 8px 8px;
  display: flex;
  flex-wrap: wrap;
}

.categories ion-chip {
  cursor: pointer;
}

.jobs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 350px), 1fr));
  align-items: start;
}

ion-card ion-item {
  --background: var(--ion-color-light);
}

</style>