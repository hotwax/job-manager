<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Manual Uploads") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main>
        <div class="header-section">
          <h1>{{ translate("Manual Uploads") }}</h1>
          <p>{{ translate("Ingest CSV or JSON files manually for processing.") }}</p>
        </div>

        <ion-card>
          <ion-searchbar v-model="queryString" @ionInput="searchConfig" :placeholder="translate('Search uploads')"></ion-searchbar>
          <div class="categories">
            <ion-chip v-for="category in categories" :key="category" @click="selectedCategory = category" :outline="selectedCategory !== category" :color="selectedCategory === category ? 'primary' : ''">
              <ion-label>{{ category }}</ion-label>
            </ion-chip>
          </div>
        </ion-card>

        <div class="imports">
          <ion-card class="upload-card" v-for="config in importConfigs" :key="config.configId">
            <ion-card-content>
              <ion-item lines="none">
                <!-- TODO: check icon thing -->
                <!-- <ion-icon slot="start" :icon="uploadType.icon" color="primary" /> -->
                <ion-label>
                  {{ config.scriptTitle }}
                  <p>{{ config.description }}</p>
                </ion-label>
              </ion-item>
              
              <ion-item lines="none">
                <!-- TODO: file type thing -->
                <!-- <ion-badge color="light">{{ config.fileType }}</ion-badge> -->
                <ion-button slot="end" fill="clear" @click="startImport(config.configId)">
                  {{ translate("Start Import") }}
                  <ion-icon slot="end" :icon="arrowForwardOutline" />
                </ion-button>
              </ion-item>
            </ion-card-content>
          </ion-card>
        </div>
        <p class="empty-state">
          {{ translate("No configs found") }}
        </p>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonBadge, IonSearchbar, IonChip, IonLabel} from '@ionic/vue';
import { cartOutline, cubeOutline, shapesOutline, peopleOutline, arrowUndoOutline, arrowForwardOutline, compass } from 'ionicons/icons';
import router from '@/router';
import { translate } from '@common';
import { useConfigStore } from '@/store/exim';

const selectedCategory = ref('All');
const queryString = ref("");
const configStore = useConfigStore();

const configs = computed(() => configStore.getConfigs)
let importConfigs = ref([]) as any

// const uploadTypes = [
//   {
//     id: 'sales-orders',
//     title: 'Sales Orders',
//     description: 'Import new sales orders (CSV/JSON)',
//     fileType: 'CSV',
//     icon: cartOutline
//   },
//   {
//     id: 'inventory-counts',
//     title: 'Inventory Counts',
//     description: 'Update inventory levels by SKU',
//     fileType: 'CSV',
//     icon: cubeOutline
//   },
//   {
//     id: 'product-catalog',
//     title: 'Product Catalog',
//     description: 'Create or update product details',
//     fileType: 'JSON',
//     icon: shapesOutline
//   },
//   {
//     id: 'customer-data',
//     title: 'Customer Data',
//     description: 'Import customer profiles and addresses',
//     fileType: 'CSV',
//     icon: peopleOutline
//   },
//   {
//     id: 'returns',
//     title: 'Returns (RMA)',
//     description: 'Import return authorizations',
//     fileType: 'CSV',
//     icon: arrowUndoOutline
//   }
// ];

onMounted(async () => {
  await configStore.fetchConfigs();
  searchConfig()
})

const startImport = (typeId: string) => {
  router.push({ name: "ImportDetail", params: { type: typeId }});
}

const searchConfig = () => {
  if(!queryString.value.trim()) {
    importConfigs.value = configs.value
  }
  importConfigs.value = configs.value.filter((config: any) =>
    config.configId.toLowerCase().includes(queryString.value.toLowerCase()) ||
    config.scriptTitle?.toLowerCase().includes(queryString.value.toLowerCase()) ||
    config.description?.toLowerCase().includes(queryString.value.toLowerCase())
  )
}
</script>

<style scoped>

.header-section {
  padding: var(--spacer-sm) var(--spacer-xs);
  margin-bottom: var(--spacer-sm);
}

.categories {
  padding: 0 var(--spacer-xs) var(--spacer-xs);
  display: flex;
  flex-wrap: wrap;
}

.categories ion-chip {
  cursor: pointer;
}

.imports {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--spacer-xs);
  align-items: start;
}

</style>
