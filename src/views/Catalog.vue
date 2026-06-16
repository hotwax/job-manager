<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main class="catalog-container">
        <!-- Modernized Header -->
        <div class="header">
          <div class="title">
            <h1>{{ translate("Job catalog") }}</h1>
            <p>{{ translate("Manage and configure integration tasks.") }}</p>
          </div>
        </div>

        <!-- Glassmorphic Filter & Search Panel -->
        <div class="filter-panel">
          <!-- Search Section -->
          <div class="search-section">
            <ion-searchbar
              :value="queryString"
              @ionInput="queryString = $event.detail.value || ''"
              :debounce="300"
              :placeholder="translate('Search jobs')"
            ></ion-searchbar>
          </div>

          <!-- Primary Options Row -->
          <div class="filter-row">
            <div class="filter-row-title">
              {{ translate("Classification") }}
            </div>
            <div class="chips-container">
              <ion-chip
                class="custom-chip"
                :class="{ active: selectedParentCategoryId === 'ALL' }"
                @click="selectParentCategory('ALL')"
              >
                <ion-label>{{ translate("All") }}</ion-label>
              </ion-chip>
              <ion-chip
                v-for="category in primaryCategories"
                :key="category.productCategoryId"
                class="custom-chip"
                :class="{
                  active:
                    selectedParentCategoryId === category.productCategoryId,
                }"
                @click="selectParentCategory(category.productCategoryId)"
              >
                <ion-label>{{ category.categoryName }}</ion-label>
                <ion-icon
                  v-if="hasSubCategories(category.productCategoryId)"
                  :icon="
                    selectedParentCategoryId === category.productCategoryId
                      ? chevronDownOutline
                      : chevronForwardOutline
                  "
                  style="font-size: 14px; margin-left: 4px"
                />
              </ion-chip>
            </div>
          </div>

          <!-- Sub-Options Panel (Row 2) -->
          <transition name="slide-fade">
            <div v-if="subCategories.length > 0" class="sub-options-panel">
              <div class="chips-container">
                <ion-chip
                  v-for="sub in subCategories"
                  :key="sub.productCategoryId"
                  class="custom-chip"
                  :class="{
                    active: selectedSubCategoryId === sub.productCategoryId,
                  }"
                  @click="selectSubCategory(sub.productCategoryId)"
                >
                  <ion-label>{{ sub.categoryName }}</ion-label>
                </ion-chip>
              </div>
            </div>
          </transition>

          <!-- Status Filters Row -->
          <div
            class="filter-row"
            style="
              margin-bottom: 0;
              border-top: 1px solid var(--ion-color-step-100, #eee);
              padding-top: 12px;
            "
          >
            <div class="filter-row-title">{{ translate("Status") }}</div>
            <div class="chips-container">
              <ion-chip
                class="custom-chip"
                :class="{ active: selectedStatus === 'ALL' }"
                @click="selectedStatus = 'ALL'"
              >
                <ion-label>{{ translate("All") }}</ion-label>
              </ion-chip>
              <ion-chip
                class="custom-chip"
                :class="{ active: selectedStatus === 'SCHEDULED' }"
                @click="selectedStatus = 'SCHEDULED'"
              >
                <ion-label>{{ translate("Scheduled") }}</ion-label>
              </ion-chip>
              <ion-chip
                class="custom-chip"
                :class="{ active: selectedStatus === 'PAUSED' }"
                @click="selectedStatus = 'PAUSED'"
              >
                <ion-label>{{ translate("Paused") }}</ion-label>
              </ion-chip>
              <ion-chip
                class="custom-chip"
                :class="{ active: selectedStatus === 'NO_SCHEDULE' }"
                @click="selectedStatus = 'NO_SCHEDULE'"
              >
                <ion-label>{{ translate("No schedule") }}</ion-label>
              </ion-chip>
            </div>
          </div>
        </div>

        <!-- Jobs List / Grid Section -->
        <div class="jobs-wrapper">
          <!-- Skeleton Loading State -->
          <template v-if="jobStore.isLoading">
            <div class="jobs-grid">
              <div
                class="job-card"
                v-for="i in 6"
                :key="i"
                style="pointer-events: none"
              >
                <div class="card-header-row">
                  <ion-skeleton-text
                    animated
                    style="width: 70%; height: 20px; border-radius: 4px"
                  />
                  <ion-skeleton-text
                    animated
                    style="width: 22%; height: 20px; border-radius: 10px"
                  />
                </div>
                <div class="card-body">
                  <div class="meta-item">
                    <ion-skeleton-text
                      animated
                      style="width: 30%; height: 10px"
                    />
                    <ion-skeleton-text
                      animated
                      style="width: 50%; height: 16px; margin-top: 4px"
                    />
                  </div>
                  <div class="meta-item">
                    <ion-skeleton-text
                      animated
                      style="width: 25%; height: 10px"
                    />
                    <ion-skeleton-text
                      animated
                      style="width: 80%; height: 16px; margin-top: 4px"
                    />
                  </div>
                </div>
                <div class="card-footer-row">
                  <ion-skeleton-text
                    animated
                    style="width: 40%; height: 14px"
                  />
                  <ion-skeleton-text
                    animated
                    style="width: 16px; height: 16px"
                  />
                </div>
              </div>
            </div>
          </template>

          <!-- Actual Loaded Jobs -->
          <template v-else>
            <transition-group name="list" tag="div" class="jobs-grid">
              <div
                v-for="(job, index) in filteredJobs"
                :key="job.jobId ? job.jobId : `${job.jobName}-${index}`"
                class="job-card"
                :class="{
                  'status-enabled': job.paused !== 'Y' && !job.isDraftJob,
                  'status-paused': job.paused === 'Y' && !job.isDraftJob,
                  'status-draft': job.isDraftJob,
                }"
                @click="router.push(`/job/${job.jobName}`)"
              >
                <!-- Card Header -->
                <div class="card-header-row">
                  <h3
                    class="job-title"
                    v-html="highlightText(job.jobName, queryString)"
                  ></h3>

                  <!-- Status Badge -->
                  <div
                    class="status-badge-container"
                    :class="{
                      enabled: job.paused !== 'Y' && !job.isDraftJob,
                      paused: job.paused === 'Y' && !job.isDraftJob,
                      draft: job.isDraftJob,
                    }"
                  >
                    <span class="status-dot"></span>
                    <span>
                      {{
                        job.isDraftJob
                          ? translate("Draft")
                          : job.paused === "Y"
                            ? translate("Paused")
                            : translate("Enabled")
                      }}
                    </span>
                  </div>
                </div>

                <!-- Card Body (Metadata) -->
                <div class="card-body">
                  <div class="meta-item" v-if="job.instanceOfProductId">
                    <span class="meta-label">{{
                      translate("Template ID")
                    }}</span>
                    <span
                      class="meta-value"
                      v-html="
                        highlightText(job.instanceOfProductId, queryString)
                      "
                    ></span>
                  </div>
                  <div class="meta-item" v-if="job.serviceName">
                    <span class="meta-label">{{ translate("Service") }}</span>
                    <span
                      class="meta-value"
                      v-html="highlightText(job.serviceName, queryString)"
                    ></span>
                  </div>
                </div>

                <!-- Card Footer -->
                <div class="card-footer-row">
                  <span class="schedule-text">
                    <ion-icon :icon="timeOutline" style="font-size: 14px" />
                    <span>{{
                      job.cronString || translate("No schedule")
                    }}</span>
                  </span>
                  <ion-icon class="arrow-icon" :icon="chevronForwardOutline" />
                </div>
              </div>
            </transition-group>
          </template>
        </div>

        <!-- Empty State -->
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
  chevronDownOutline,
  chevronForwardOutline,
  timeOutline,
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

const primaryCategories = computed(() =>
  categories.value.filter(
    (category: any) => category.primaryParentCategoryId === "SYSTEM_JOB",
  ),
);

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
  selectedSubCategoryId.value =
    selectedSubCategoryId.value === subCategoryId ? "" : subCategoryId;
};

const hasSubCategories = (productCategoryId: string) => {
  return categoryRollups.value.some(
    (rollup: any) => rollup.parentProductCategoryId === productCategoryId,
  );
};

const filteredJobs = computed(() => {
  let filtered = jobs.value;
  if (selectedParentCategoryId.value !== "ALL") {
    const targetCategoryIds = [selectedParentCategoryId.value];
    if (selectedSubCategoryId.value) {
      targetCategoryIds.length = 0;
      targetCategoryIds.push(selectedSubCategoryId.value);
    } else {
      // Add all subcategories of this parent
      const subCategoryIds = categoryRollups.value
        .filter(
          (rollup: any) =>
            rollup.parentProductCategoryId === selectedParentCategoryId.value,
        )
        .map((rollup: any) => rollup.productCategoryId);
      targetCategoryIds.push(...subCategoryIds);
    }

    const matchingProductIds = categoryMembers.value
      .filter((member: any) =>
        targetCategoryIds.includes(member.productCategoryId),
      )
      .map((member: any) => member.productId);

    filtered = filtered.filter((job: any) =>
      matchingProductIds.includes(job.instanceOfProductId),
    );
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
.catalog-container {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  margin-bottom: 24px;
  padding: 0 8px;
}

.header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: var(--ion-color-step-900, #111);
  margin: 0 0 4px 0;
  letter-spacing: -0.02em;
}

.header p {
  font-size: 0.95rem;
  color: var(--ion-color-step-500, #666);
  margin: 0;
}

.filter-panel {
  background: var(--ion-card-background, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--ion-color-step-100, #e0e0e0);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  margin-bottom: 24px;
  padding: 16px;
}

.search-section {
  margin-bottom: 16px;
}

.search-section ion-searchbar {
  --border-radius: 12px;
  --box-shadow: none;
  border: 1px solid var(--ion-color-step-150, #e0e0e0);
  border-radius: 12px;
  padding: 0;
}

.filter-row {
  margin-bottom: 12px;
}

.filter-row-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ion-color-step-500, #666);
  margin-bottom: 8px;
  padding-left: 8px;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 8px;
}

.custom-chip {
  --background: transparent;
  --color: var(--ion-color-step-700, #333);
  border: 1px solid var(--ion-color-step-200, #ccc);
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.85rem;
  margin: 0;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-chip.active {
  --background: var(--ion-color-primary, #3880ff);
  --color: var(--ion-color-primary-contrast, #fff);
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 4px 10px rgba(56, 128, 255, 0.15);
}

.custom-chip:hover {
  transform: translateY(-1.5px);
  border-color: var(--ion-color-primary, #3880ff);
}

.sub-options-panel {
  background: var(--ion-color-step-50, #f8f9fa);
  border: 1px solid var(--ion-color-step-150, #e9ecef);
  border-radius: 12px;
  padding: 12px;
  margin: 8px 8px 16px;
}

.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr));
  gap: 20px;
  margin-top: 16px;
}

.job-card {
  background: var(--ion-card-background, #ffffff);
  border-radius: 14px;
  border: 1px solid var(--ion-color-step-100, #e0e0e0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  padding: 18px;
}

.job-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--job-status-color, #6b7280);
  transition: width 0.2s ease;
}

.job-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  border-color: var(--ion-color-step-300, #b0b0b0);
}

.job-card:hover::before {
  width: 6px;
}

.job-card.status-enabled {
  --job-status-color: var(--ion-color-success, #10b981);
}
.job-card.status-paused {
  --job-status-color: var(--ion-color-warning, #f59e0b);
}
.job-card.status-draft {
  --job-status-color: var(--ion-color-tertiary, #6366f1);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.job-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ion-color-step-900, #111);
  line-height: 1.3;
  margin: 0;
  flex: 1;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.status-badge-container {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--status-badge-bg, #f3f4f6);
  color: var(--status-badge-color, #374151);
  white-space: nowrap;
}

.status-badge-container.enabled {
  --status-badge-bg: rgba(16, 185, 129, 0.1);
  --status-badge-color: var(--ion-color-success, #10b981);
}
.status-badge-container.paused {
  --status-badge-bg: rgba(245, 158, 11, 0.1);
  --status-badge-color: var(--ion-color-warning, #f59e0b);
}
.status-badge-container.draft {
  --status-badge-bg: rgba(99, 102, 241, 0.1);
  --status-badge-color: var(--ion-color-tertiary, #6366f1);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
  flex: 1;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--ion-color-step-400, #999);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--ion-color-step-700, #444);
  word-break: break-all;
  background: var(--ion-color-step-50, #f8f9fa);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--ion-color-step-100, #eee);
  display: inline-block;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--ion-color-step-100, #eee);
  padding-top: 10px;
  margin-top: auto;
}

.schedule-text {
  font-size: 0.78rem;
  color: var(--ion-color-step-600, #555);
  display: flex;
  align-items: center;
  gap: 4px;
}

.arrow-icon {
  font-size: 1.1rem;
  color: var(--ion-color-step-400, #888);
  transition: transform 0.2s ease;
}

.job-card:hover .arrow-icon {
  transform: translateX(3px);
  color: var(--ion-color-primary, #3880ff);
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

/* Slide-fade transition */
.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.list-move {
  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
</style>
