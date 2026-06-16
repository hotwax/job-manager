<template>
  <ion-page>
    <ion-header>
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
            <h1>Job catalog</h1>
            <p>Manage and configure integration tasks.</p>
          </div>
        </div>

        <ion-card>
          <ion-searchbar
            :value="queryString"
            @ionInput="queryString = $event.detail.value || ''"
            :debounce="300"
            :placeholder="translate('Search jobs')"
          ></ion-searchbar>

          <!-- Primary Categories (Row 1) -->
          <div class="categories">
            <ion-chip
              @click="selectParentCategory('ALL')"
              :outline="selectedParentCategoryId !== 'ALL'"
              :color="selectedParentCategoryId === 'ALL' ? 'primary' : ''"
            >
              <ion-label>{{ translate("All") }}</ion-label>
            </ion-chip>
            <ion-chip
              v-for="category in primaryCategories"
              :key="category.productCategoryId"
              @click="selectParentCategory(category.productCategoryId)"
              :outline="selectedParentCategoryId !== category.productCategoryId"
              :color="
                selectedParentCategoryId === category.productCategoryId
                  ? 'primary'
                  : ''
              "
            >
              <ion-label>{{ category.categoryName }}</ion-label>
            </ion-chip>
          </div>

          <!-- Sub Categories (Row 2) - Visible only if children exist -->
          <div v-if="subCategories.length > 0" class="sub-categories">
            <span class="sub-categories-label">{{ translate("Sub-options") }}:</span>
            <ion-chip
              v-for="sub in subCategories"
              :key="sub.productCategoryId"
              @click="selectSubCategory(sub.productCategoryId)"
              :outline="selectedSubCategoryId !== sub.productCategoryId"
              :color="
                selectedSubCategoryId === sub.productCategoryId ? 'primary' : ''
              "
              class="sub-category-chip"
            >
              <ion-label>{{ sub.categoryName }}</ion-label>
            </ion-chip>
          </div>

          <!-- Status Filters (Row 3) -->
          <div class="status-filters">
            <ion-chip
              @click="selectedStatus = 'ALL'"
              :outline="selectedStatus !== 'ALL'"
              :color="selectedStatus === 'ALL' ? 'primary' : ''"
            >
              <ion-label>{{ translate("All") }}</ion-label>
            </ion-chip>
            <ion-chip
              @click="selectedStatus = 'SCHEDULED'"
              :outline="selectedStatus !== 'SCHEDULED'"
              :color="selectedStatus === 'SCHEDULED' ? 'primary' : ''"
            >
              <ion-label>{{ translate("Scheduled") }}</ion-label>
            </ion-chip>
            <ion-chip
              @click="selectedStatus = 'PAUSED'"
              :outline="selectedStatus !== 'PAUSED'"
              :color="selectedStatus === 'PAUSED' ? 'primary' : ''"
            >
              <ion-label>{{ translate("Paused") }}</ion-label>
            </ion-chip>
            <ion-chip
              @click="selectedStatus = 'NO_SCHEDULE'"
              :outline="selectedStatus !== 'NO_SCHEDULE'"
              :color="selectedStatus === 'NO_SCHEDULE' ? 'primary' : ''"
            >
              <ion-label>{{ translate("No schedule") }}</ion-label>
            </ion-chip>
          </div>
        </ion-card>

        <div class="jobs">
          <template v-if="jobStore.isLoading">
            <ion-card v-for="i in 6" :key="i">
              <ion-card-header>
                <ion-card-title
                  ><ion-skeleton-text animated style="width: 60%"
                /></ion-card-title>
                <div class="job-card-metadata">
                  <ion-skeleton-text animated style="width: 40%" />
                  <ion-skeleton-text animated style="width: 80%" />
                </div>
              </ion-card-header>
              <ion-item lines="none">
                <ion-label>
                  <ion-skeleton-text animated style="width: 30%" />
                  <p><ion-skeleton-text animated style="width: 50%" /></p>
                </ion-label>
              </ion-item>
            </ion-card>
          </template>
          <template v-else>
            <ion-card
              v-for="(job, index) in filteredJobs"
              :key="job.jobId ? job.jobId : `${job.jobName}-${index}`"
              :class="{ 'paused-job': job.paused === 'Y' }"
              :color="job.isDraftJob ? 'light' : ''"
            >
              <ion-card-header>
                <div class="job-card-header">
                  <ion-card-title
                    v-html="highlightText(job.jobName, queryString)"
                  ></ion-card-title>
                </div>
                <div class="job-card-metadata">
                  <code
                    >ID:
                    <span
                      v-html="
                        highlightText(job.instanceOfProductId, queryString)
                      "
                    ></span
                  ></code>
                  <code
                    v-html="highlightText(job.serviceName, queryString)"
                  ></code>
                </div>
              </ion-card-header>
              <ion-item
                lines="none"
                detail
                button
                @click="router.push(`/job/${job.jobName}`)"
              >
                <template v-if="job.isDraftJob">
                  <ion-icon slot="start" :icon="lockClosedOutline" />
                  <ion-label>
                    {{ translate("Draft") }}
                  </ion-label>
                </template>
                <template v-else>
                  <ion-icon
                    v-if="job.paused === 'Y'"
                    slot="start"
                    :icon="pauseCircleOutline"
                    color="warning"
                  />
                  <ion-icon
                    v-else-if="job.cronExpression"
                    slot="start"
                    :icon="playCircleOutline"
                    color="success"
                  />
                  <ion-icon
                    v-else
                    slot="start"
                    :icon="ellipseOutline"
                    color="medium"
                  />
                  <ion-label>
                    {{
                      job.paused === "Y"
                        ? translate("Paused")
                        : translate("Enabled")
                    }}
                    <p v-if="job.cronString">{{ job.cronString }}</p>
                  </ion-label>
                </template>
              </ion-item>
            </ion-card>
          </template>
        </div>

        <div
          class="empty-state"
          v-if="!jobStore.isLoading && !filteredJobs.length"
        >
          <p>{{ translate("No jobs found") }}</p>
          <p
            v-if="
              selectedParentCategoryId !== 'ALL' ||
              selectedStatus !== 'ALL' ||
              queryString
            "
            class="helper-text"
          >
            {{
              translate("Try clearing filters or search to see more results.")
            }}
          </p>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
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
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  modalController,
  onIonViewWillEnter,
  onIonViewWillLeave,
} from "@ionic/vue";
import { ref, computed } from "vue";
import router from "@/router";
import {
  ellipseOutline,
  lockClosedOutline,
  pauseCircleOutline,
  playCircleOutline,
} from "ionicons/icons";
import { emitter, translate } from "@common";
import CreateJobModal from "@/components/CreateJobModal.vue";
import { useJobStore } from "@/store/jobs";

const jobStore = useJobStore();

const jobs = computed(() => jobStore.getJobs);
const categories = computed(() => jobStore.getCategories);
const categoryMembers = computed(() => jobStore.getCategoryMembers);
const categoryRollups = computed(() => jobStore.getCategoryRollups);

onIonViewWillEnter(async () => {
  emitter.on("productStoreUpdated", jobStore.fetchJobs);
  if (router.currentRoute.value.query?.status) {
    selectedStatus.value = router.currentRoute.value.query.status as string;
  } else {
    selectedStatus.value = "ALL";
  }
  await Promise.allSettled([
    jobStore.fetchJobs(),
    jobStore.fetchCategories(),
    jobStore.fetchCategoryRollup(),
  ]);
});

onIonViewWillLeave(() => {
  emitter.off("productStoreUpdated", jobStore.fetchJobs);
});

const selectedParentCategoryId = ref("ALL");
const selectedSubCategoryId = ref("");
const queryString = ref("");
const selectedStatus = ref("ALL");

const primaryCategories = computed(() => {
  const rollupChildIds = categoryRollups.value.map((rollup: any) => rollup.productCategoryId);
  return categories.value.filter(
    (category: any) =>
      category.primaryParentCategoryId === "SYSTEM_JOB" &&
      !rollupChildIds.includes(category.productCategoryId),
  );
});

const subCategories = computed(() => {
  if (selectedParentCategoryId.value === "ALL") return [];

  const subCategoryIds = categoryRollups.value
    .filter(
      (rollup: any) =>
        rollup.parentProductCategoryId === selectedParentCategoryId.value,
    )
    .map((rollup: any) => rollup.productCategoryId);

  return categories.value.filter((category: any) =>
    subCategoryIds.includes(category.productCategoryId),
  );
});

const selectParentCategory = (productCategoryId: string) => {
  selectedParentCategoryId.value = productCategoryId;
  selectedSubCategoryId.value = ""; // Reset sub-category on parent change
};

const selectSubCategory = (subCategoryId: string) => {
  selectedSubCategoryId.value = selectedSubCategoryId.value === subCategoryId ? "" : subCategoryId;
};

const filteredJobs = computed(() => {
  let filtered = jobs.value;
  if (selectedParentCategoryId.value !== "ALL") {
    const targetCategoryIds = [selectedParentCategoryId.value];
    if (!selectedSubCategoryId.value) {
      // Add all subcategories of this parent
      const subCategoryIds = categoryRollups.value
        .filter((rollup: any) => rollup.parentProductCategoryId === selectedParentCategoryId.value)
        .map((rollup: any) => rollup.productCategoryId);
      targetCategoryIds.push(...subCategoryIds);
    } else {
      targetCategoryIds.length = 0;
      targetCategoryIds.push(selectedSubCategoryId.value);
    }

    const matchingProductIds = categoryMembers.value
      .filter((member: any) => targetCategoryIds.includes(member.productCategoryId))
      .map((member: any) => member.productId);

    filtered = filtered.filter((job: any) => matchingProductIds.includes(job.instanceOfProductId));
  }

  if (selectedStatus.value !== "ALL") {
    if (selectedStatus.value === "PAUSED") {
      filtered = filtered.filter((job: any) => job.paused === "Y");
    } else if (selectedStatus.value === "SCHEDULED") {
      filtered = filtered.filter(
        (job: any) => job.paused === "N" && !!job.cronExpression,
      );
    } else if (selectedStatus.value === "NO_SCHEDULE") {
      filtered = filtered.filter((job: any) => !job.cronExpression);
    }
  }

  if (queryString.value.trim()) {
    const queryTokens = queryString.value.toLowerCase().trim().split(/\s+/);
    filtered = filtered.filter((job: any) => {
      // For each token, it must match at least one of the fields
      return queryTokens.every(
        (token) =>
          (job.jobName && job.jobName.toLowerCase().includes(token)) ||
          (job.serviceName && job.serviceName.toLowerCase().includes(token)) ||
          (job.jobId && job.jobId.toString().toLowerCase().includes(token)) ||
          (job.instanceOfProductId &&
            job.instanceOfProductId.toLowerCase().includes(token)),
      );
    });
  }

  return filtered;
});

const highlightText = (text: string | number, query: string) => {
  if (!text) return "";
  const textStr = String(text);
  if (!query || !query.trim()) return textStr;

  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return textStr;

  // Escape special regex characters to prevent regex injection errors
  const escapeRegExp = (string: string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedTokens = tokens.map(escapeRegExp);

  // Create a regex matching any of the tokens, case-insensitive
  const regex = new RegExp(`(${escapedTokens.join("|")})`, "gi");

  // Replace matched tokens with mark tag
  return textStr.replace(regex, '<mark class="search-highlight">$1</mark>');
};

const openCreateJobModal = async () => {
  const modal = await modalController.create({
    component: CreateJobModal,
    componentProps: {
      categories: categories.value, // Passing all flat categories
      existingJobNames: jobs.value.map((job: any) => job.jobName),
    },
  });
  modal.present();

  const { data, role } = await modal.onDidDismiss();
  if (role === "confirm") {
    console.log("Job created:", data);
  }
};
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.categories,
.status-filters {
  padding: 0 8px 8px;
  display: flex;
  flex-wrap: wrap;
}

.sub-categories {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background-color: var(--ion-color-light);
  border-radius: 8px;
  margin: 0 16px 16px;
}

.sub-categories-label {
  font-size: 0.85em;
  color: var(--ion-color-medium);
  font-weight: 500;
  margin-right: 4px;
}

.sub-category-chip {
  --background: var(--ion-card-background);
  margin: 0;
}

.status-filters {
  border-top: 1px solid var(--ion-color-light);
  padding-top: 8px;
}

.categories ion-chip,
.sub-categories ion-chip,
.status-filters ion-chip {
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

.job-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  word-break: break-all;
}

.job-card-metadata {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-xs);
}

.paused-job {
  opacity: 0.8;
}

.empty-state {
  text-align: center;
  margin-top: 40px;
  color: var(--ion-color-medium);
}

.empty-state .helper-text {
  font-size: 0.9em;
  margin-top: 8px;
}

.search-highlight {
  background-color: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
  border-radius: 2px;
  padding: 0 2px;
  font-weight: bold;
}
</style>
