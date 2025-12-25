<template>
  <ion-page>
    <ion-header :translucent="true">
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
          <ion-searchbar :placeholder="translate('Search uploads')"></ion-searchbar>
          <div class="categories">
            <ion-chip v-for="category in categories" :key="category" @click="selectedCategory = category" :outline="selectedCategory !== category" :color="selectedCategory === category ? 'primary' : ''">
              <ion-label>{{ category }}</ion-label>
            </ion-chip>
          </div>
        </ion-card>

        <div class="imports">
          <ion-card class="upload-card" v-for="uploadType in uploadTypes" :key="uploadType.id">
            <ion-card-content>
              <ion-item lines="none">
                <ion-icon slot="start" :icon="uploadType.icon" color="primary" />
                <ion-label>
                  {{ translate(uploadType.title) }}
                  <p>{{ translate(uploadType.description) }}</p>
                </ion-label>
              </ion-item>
              
              <ion-item lines="none">
                <ion-badge color="light">{{ uploadType.fileType }}</ion-badge>
                <ion-button slot="end" fill="clear" @click="startImport(uploadType.id)">
                  {{ translate("Start Import") }}
                  <ion-icon slot="end" :icon="arrowForwardOutline" />
                </ion-button>
              </ion-item>
            </ion-card-content>
          </ion-card>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle, 
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton,
  IonBadge,
  IonSearchbar,
  IonChip,
  IonLabel
} from '@ionic/vue';
import { 
  cartOutline, 
  cubeOutline, 
  shapesOutline, 
  peopleOutline, 
  arrowUndoOutline,
  arrowForwardOutline 
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'ManualUploads',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon,
    IonButton,
    IonBadge,
    IonSearchbar,
    IonChip,
    IonLabel
  },
  setup() {
    const router = useRouter();
    const categories = ['All', 'Shopify', 'NetSuite', 'Orders', 'Inventory'];
    const selectedCategory = ref('All');

    const uploadTypes = [
      {
        id: 'sales-orders',
        title: 'Sales Orders',
        description: 'Import new sales orders (CSV/JSON)',
        fileType: 'CSV',
        icon: cartOutline
      },
      {
        id: 'inventory-counts',
        title: 'Inventory Counts',
        description: 'Update inventory levels by SKU',
        fileType: 'CSV',
        icon: cubeOutline
      },
      {
        id: 'product-catalog',
        title: 'Product Catalog',
        description: 'Create or update product details',
        fileType: 'JSON',
        icon: shapesOutline
      },
      {
        id: 'customer-data',
        title: 'Customer Data',
        description: 'Import customer profiles and addresses',
        fileType: 'CSV',
        icon: peopleOutline
      },
      {
        id: 'returns',
        title: 'Returns (RMA)',
        description: 'Import return authorizations',
        fileType: 'CSV',
        icon: arrowUndoOutline
      }
    ];

    const startImport = (typeId: string) => {
      router.push({ name: 'ImportDetail', params: { type: typeId }});
    };

    return {
      uploadTypes,
      startImport,
      translate,
      arrowForwardOutline,
      categories,
      selectedCategory
    };
  }
});
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
