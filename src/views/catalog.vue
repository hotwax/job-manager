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
          <ion-button>
            <ion-icon slot="end" :ios="addOutline" :md="addOutline"></ion-icon>
            Add job
          </ion-button>
        </div>

        <ion-card>
          <ion-searchbar :placeholder="translate('Search jobs')"></ion-searchbar>
          <div class="categories">
            <ion-chip v-for="category in categories" :key="category" @click="selectedCategory = category" :outline="selectedCategory !== category" :color="selectedCategory === category ? 'primary' : ''">
              <ion-label>{{ category }}</ion-label>
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
} from '@ionic/vue';
import { defineComponent, ref, computed } from 'vue';
import router from '@/router';
import { addOutline } from 'ionicons/icons';
import { translate } from '@common';

export default defineComponent({
  name: 'Catalog',
  components: {
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
    const categories = ['All', 'Shopify', 'NetSuite', 'Orders', 'Inventory'];
    const selectedCategory = ref('All');

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
      return jobs.filter(job => job.categories.includes(selectedCategory.value));
    });

    return {
      addOutline,
      categories,
      filteredJobs,
      jobs,
      router,
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