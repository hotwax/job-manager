<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Catalog") }}</ion-title>
        <!-- <ion-buttons slot="end">
          <ion-button color="primary" @click="openCreateJobModal()">
            <ion-icon slot="end" :icon="addOutline"></ion-icon>
            {{ translate("Add job") }}
          </ion-button>
        </ion-buttons> -->
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
        </div>

        <ion-card>
          <ion-searchbar v-model="queryString" :placeholder="translate('Search jobs')"></ion-searchbar>
          
          <!-- Primary Categories (Row 1) -->
          <div class="categories">
            <ion-chip @click="selectParentCategory('ALL')" :outline="selectedParentCategoryId !== 'ALL'" :color="selectedParentCategoryId === 'ALL' ? 'primary' : ''">
              <ion-label>{{ translate("All") }}</ion-label>
            </ion-chip>
            <ion-chip v-for="category in primaryCategories" :key="category.productCategoryId" @click="selectParentCategory(category.productCategoryId)" :outline="selectedParentCategoryId !== category.productCategoryId" :color="selectedParentCategoryId === category.productCategoryId ? 'primary' : ''">
              <ion-label>{{ category.categoryName }}</ion-label>
            </ion-chip>
          </div>

          <!-- Sub Categories (Row 2) - Visible only if children exist -->
          <div v-if="subCategories.length > 0" class="sub-categories">
            <ion-chip v-for="sub in subCategories" :key="sub.productCategoryId" @click="selectedSubCategoryId = sub.productCategoryId" :outline="selectedSubCategoryId !== sub.productCategoryId" :color="selectedSubCategoryId === sub.productCategoryId ? 'primary' : ''">
              <ion-label>{{ sub.categoryName }}</ion-label>
            </ion-chip>
          </div>
        </ion-card>

        <div class="jobs">
          <!-- TODO: remove filterjobs length from key and check why the UI is not updating -->
          <ion-card v-for="job in filteredJobs" :key="job.jobName + filteredJobs.length">
            <ion-card-header>
              <ion-card-title>{{ job.jobName }}</ion-card-title>
              <code>ID: {{ job.instanceOfProductId }}</code><br>
              <code>{{ job.serviceName }}</code>
            </ion-card-header>
            <ion-item lines="none" detail button @click="router.push(`/job/${job.jobName}`)">
              <ion-label>
                {{ job.paused === 'N' ? translate('Enabled') : translate('Paused') }}
                <p v-if="job.cronExpression">{{ getCronString(job.cronExpression) }}</p>
              </ion-label>
            </ion-item>
          </ion-card>
        </div>

        <p class="empty-state" v-if="!filteredJobs.length">{{ translate("No jobs found") }}</p>

      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
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
  modalController,
  onIonViewWillEnter
} from '@ionic/vue';
import { ref, computed } from 'vue';
import router from '@/router';
import { addOutline } from 'ionicons/icons';
import { translate } from '@common';
import CreateJobModal from '@/components/CreateJobModal.vue';
import { getCronString } from '@/utils';
import { useJobStore } from '@/store/jobs';

const jobStore = useJobStore();

const jobs = computed(() => jobStore.getJobs)
const categories = computed(() => jobStore.getCategories)
const categoryMembers = computed(() => jobStore.getCategoryMembers)
const categoryRollups = computed(() => jobStore.getCategoryRollups)

onIonViewWillEnter(() => {
  Promise.allSettled([jobStore.fetchJobs(), jobStore.fetchCategories(), jobStore.fetchCategoryRollup()])
})

const selectedParentCategoryId = ref('ALL');
const selectedSubCategoryId = ref('');
const queryString = ref('') as any;

const primaryCategories = computed(() => categories.value.filter((category: any) => category.primaryParentCategoryId === 'SYSTEM_JOB'));

const subCategories = computed(() => {
  if (selectedParentCategoryId.value === 'ALL') return [];
  
  const subCategoryIds = categoryRollups.value
    .filter((rollup: any) => rollup.parentProductCategoryId === selectedParentCategoryId.value)
    .map((rollup: any) => rollup.productCategoryId);
  
  return categories.value.filter((category: any) => subCategoryIds.includes(category.productCategoryId));
});

const selectParentCategory = (productCategoryId: string) => {
  selectedParentCategoryId.value = productCategoryId;
  selectedSubCategoryId.value = ''; // Reset sub-category on parent change
};

const filteredJobs = computed(() => {
  let activeCategoryId = selectedSubCategoryId.value || selectedParentCategoryId.value;
  
  let filtered = jobs.value;

  if (activeCategoryId !== 'ALL') {
    const jobIds = categoryMembers.value
      .filter((member: any) => member.productCategoryId === activeCategoryId)
      .map((member: any) => member.productId);
    
    filtered = filtered.filter((job: any) => jobIds.includes(job.instanceOfProductId));
  }

  if (queryString.value.trim()) {
    const query = queryString.value.toLowerCase().trim();
    filtered = filtered.filter((job: any) => 
      (job.jobName && job.jobName.toLowerCase().includes(query)) ||
      (job.serviceName && job.serviceName.toLowerCase().includes(query)) ||
      (job.instanceOfProductId && job.instanceOfProductId.toLowerCase().includes(query))
    );
  }

  return filtered;
});

const openCreateJobModal = async () => {
  const modal = await modalController.create({
    component: CreateJobModal,
    componentProps: {
      categories: categories.value, // Passing all flat categories
      existingJobNames: jobs.value.map((job: any) => job.jobName)
    }
  });
  modal.present();

  const { data, role } = await modal.onDidDismiss();
  if (role === 'confirm') {
    console.log('Job created:', data);
  }
};
</script>

<style scoped>

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.categories, .sub-categories {
  padding: 0 8px 8px;
  display: flex;
  flex-wrap: wrap;
}

.sub-categories {
  border-top: 1px solid var(--ion-color-light);
  padding-top: 8px;
}

.categories ion-chip, .sub-categories ion-chip {
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