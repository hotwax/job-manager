<template>
  <ion-menu side="end" content-id="main-content" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <section v-if="segmentSelected === 'history'">
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>
                {{ $t("Status") }}
              </p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(filter, index) in statusFilters" :key="index" @click="handleFilterApply(filter, 'statusFilter')">
            <ion-icon slot="start" :ios="filter.iosIcon" :md="filter.mdIcon" />
            <ion-label>{{ $t(filter.name) }}</ion-label>
            <ion-checkbox slot="end" :checked="selectedStatusFilters.includes(filter.statusId)" />
          </ion-item>
        </section>

        <section>
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>
                {{ $t("Category") }}
              </p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(filter, index) in categoryFilters" :key="index"
            @click="handleFilterApply(filter, 'categoryFilter')">
            <ion-icon slot="start" :ios="filter.iosIcon" :md="filter.mdIcon" />
            <ion-label>{{ $t(filter.name) }}</ion-label>
            <ion-checkbox slot="end" :checked="selectedCategoryFilters.includes(filter.enumTypeId)" />
          </ion-item>
        </section>

        <section v-if="pinnedJobs.length > 0">
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>
                {{ $t("Pinned") }}
              </p>
            </ion-label>
          </ion-item>
          <ion-item button v-for="(job, index) in pinnedJobs" :key="index" @click="handleFilterApply(job, 'pinnedFilter')">
            <ion-label>{{ getEnumName(job) }}</ion-label>
            <ion-checkbox slot="end" :checked="selectedPinnedJobs.includes(job)" />
          </ion-item>
        </section>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { albumsOutline, banOutline, calendarNumberOutline, checkmarkDoneOutline, closeOutline, compassOutline, filterOutline, iceCreamOutline, libraryOutline, pulseOutline, sendOutline, settings, shirtOutline, ticketOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'

export default defineComponent({
  name: "Filters",
  components: {
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar
  },
  props: ["segmentSelected", "queryString", "selectedPinnedJobs"],
  setup() {
    const store = useStore();
    const statusFilters = [
      {
        name: "Finished",
        statusId: "SERVICE_FINISHED",
        iosIcon: checkmarkDoneOutline,
        mdIcon: checkmarkDoneOutline,
      },
      {
        name: "Cancelled",
        statusId: "SERVICE_CANCELLED",
        iosIcon: banOutline,
        mdIcon: banOutline,
      },
      {
        name: "Failed",
        statusId: "SERVICE_FAILED",
        iosIcon: closeOutline,
        mdIcon: closeOutline,
      },
    ];
    const categoryFilters = [
      {
        name: "Orders",
        iosIcon: ticketOutline,
        mdIcon: ticketOutline,
        enumTypeId: "ORDER_SYS_JOB"
      },
      {
        name: "Pre-orders",
        iosIcon: calendarNumberOutline,
        mdIcon: calendarNumberOutline,
        enumTypeId: "PRE_ORD_SYS_JOB"
      },
      {
        name: "Inventory",
        iosIcon: albumsOutline,
        mdIcon: albumsOutline,
        enumTypeId: "INVENTORY_SYS_JOB"
      },
      {
        name: "Brokering",
        iosIcon: compassOutline,
        mdIcon: compassOutline,
        enumTypeId: "BROKERING_SYS_JOB"
      },
      {
        name: "Fulfillment",
        iosIcon: sendOutline,
        mdIcon: sendOutline,
        enumTypeId: "FULFILLMENT_SYS_JOB"
      },
      {
        name: "Product",
        iosIcon: shirtOutline,
        mdIcon: shirtOutline,
        enumTypeId: "PRODUCT_SYS_JOB"
      },
      {
        name: "Miscellaneous",
        iosIcon: libraryOutline,
        mdIcon: libraryOutline,
        enumTypeId: "MISC_SYS_JOB"
      },
    ];
    return {
      albumsOutline,
      banOutline,
      calendarNumberOutline,
      checkmarkDoneOutline,
      categoryFilters,
      closeOutline,
      filterOutline,
      iceCreamOutline,
      libraryOutline,
      pulseOutline,
      settings,
      shirtOutline,
      statusFilters,
      store,
      ticketOutline
    };
  },
  data() {
    return {
      selectedStatusFilters: [] as Array<string>,
      selectedCategoryFilters: [] as Array<string>,
    }
  },
  computed: {
    ...mapGetters({
      getEnumName: 'job/getEnumName',
      currentEComStore: 'user/getCurrentEComStore',
      pinnedJobs: 'user/getPinnedJobs',
    })
  },
  unmounted() {
    this.store.dispatch('job/clearPipelineFilters', { status: [], category: [] });
  },
  methods: {
    updatePinnedJobs(filterArray: Array<string>, filterProperty: any) {
      // check if the filter is being applied, 
      // if not - apply, if already there - remove.
      filterArray.includes(filterProperty) 
      ? filterArray.splice(filterArray.indexOf(filterProperty), 1) 
      : filterArray.push(filterProperty);
    },
    handleFilterApply(filter: any, type: string) {
      if(type === 'pinnedFilter') {
        this.updatePinnedJobs(this.selectedPinnedJobs, filter);
      }
      this.store.dispatch('job/setPipelineFilters', { status: this.selectedStatusFilters, category: this.selectedCategoryFilters, type, filter });
      this.segmentSelected === 'pending' ? this.getFilteredPendingJobs() :
      this.segmentSelected === 'running' ? this.getFilteredRunningJobs() :
      this.getFilteredJobHistory();
    },
    async getFilteredPendingJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchPendingJobs', { eComStoreId: this.currentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.selectedCategoryFilters, systemJobEnumId: this.selectedPinnedJobs, statusId: this.selectedStatusFilters });
    },
    async getFilteredRunningJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchRunningJobs', { eComStoreId: this.currentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.selectedCategoryFilters, systemJobEnumId: this.selectedPinnedJobs, statusId: this.selectedStatusFilters });
    },
    async getFilteredJobHistory(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchJobHistory', { eComStoreId: this.currentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, enumTypeId: this.selectedCategoryFilters, systemJobEnumId: this.selectedPinnedJobs, statusId: this.selectedStatusFilters });
    },
  },
});
</script>