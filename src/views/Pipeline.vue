<template>
  <ion-page>
    <Filters content-id="filter-content" :segmentSelected="segmentSelected" :queryString="queryString" />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Pipeline") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="end">
            <ion-icon :icon="filterOutline" :color="filterIconColor" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>

      <div>
        <ion-searchbar :placeholder="translate('Search jobs')" @ionClear="queryString = ''; segmentSelected === 'pending' ? getPendingJobs() : ( segmentSelected === 'running' ? getRunningJobs() : getJobHistory())" v-model="queryString" @keyup.enter="queryString = $event.target.value; segmentSelected === 'pending' ? getPendingJobs() : ( segmentSelected === 'running' ? getRunningJobs() : getJobHistory())" />

        <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
          <ion-segment-button value="pending">
            <ion-label>{{ translate("Pending") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="running">
            <ion-label>{{ translate("Running") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history">
            <ion-label>{{ translate("History") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="filter-content">
      <main>
        <section v-if="segmentSelected === 'pending'">
          <!-- Empty state -->
          <div v-if="pendingJobs?.length === 0">
            <p class="ion-text-center">{{ translate("There are no jobs pending right now")}}</p>
            <div class="ion-text-center">
              <ion-button fill="outline" @click="refreshJobs(undefined, true)">
                {{ translate('retry') }}
                <ion-spinner v-if="isRetrying" name="crescent" />
              </ion-button>
            </div>
          </div>

          <div v-else>
            <ion-card v-for="job in pendingJobs" :key="job.jobId" @click="viewJobConfiguration(job)" :button="isDesktop">
              <ion-card-header>
                <ion-card-title>{{ job.enumName }}</ion-card-title>
                <ion-badge v-if="job.runTime" color="dark">{{ timeFromNow(job.runTime)}}</ion-badge>
              </ion-card-header>

              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p>{{ job.description }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label class="ion-text-wrap">{{ job.runTime ? getTime(job.runTime) : "-"  }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timerOutline" />
                <ion-label class="ion-text-wrap">{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
              </ion-item>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="refreshOutline" />
                <ion-label class="ion-text-wrap">{{ job.currentRetryCount }}</ion-label>
              </ion-item>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="codeWorkingOutline" />
                <ion-label class="ion-text-wrap">{{ job.systemJobEnumId }}</ion-label>
                <ion-icon :icon="helpCircleOutline" @click.stop.prevent="openLearnMoreModal(job)"/>
              </ion-item>

              <div class="actions">
                <div>
                  <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" fill="clear" @click.stop="skipJob(job)">{{ translate("Skip") }}</ion-button>
                  <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" color="danger" fill="clear" @click.stop="cancelJob(job)">{{ translate("Cancel") }}</ion-button>
                </div>
                <div>
                  <ion-button fill="clear" color="medium" slot="end" @click.stop="openJobActions(job, $event)">
                    <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                  </ion-button>
                </div>
              </div> 
            </ion-card>
            <ion-refresher slot="fixed" @ionRefresh="refreshJobs($event)">
              <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
            </ion-refresher>
              <!--
                When searching for a keyword, and if the user moves to the last item, then the didFire value inside infinite scroll becomes true and thus the infinite scroll does not trigger again on the same page(https://github.com/hotwax/users/issues/84).
                Also if we are at the section that has been loaded by infinite-scroll and then move to the details page then the list infinite scroll does not work after coming back to the page
                In ionic v7.6.0, an issue related to infinite scroll has been fixed that when more items can be added to the DOM, but infinite scroll does not fire as the window is not completely filled with the content(https://github.com/ionic-team/ionic-framework/issues/18071).
                The above fix in ionic 7.6.0 is resulting in the issue of infinite scroll not being called again.
                To fix this we have maintained another variable `isScrollingEnabled` to check whether the scrolling can be performed or not.
                If we do not define an extra variable and just use v-show to check for `isScrollable` then when coming back to the page infinite-scroll is called programatically.
                We have added an ionScroll event on ionContent to check whether the infiniteScroll can be enabled or not by toggling the value of isScrollingEnabled whenever the height < 0.
              -->
            <ion-infinite-scroll @ionInfinite="loadMorePendingJobs($event)" threshold="100px" v-show="isPendingJobsScrollable" ref="infiniteScrollRef">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
            </ion-infinite-scroll>
          </div>
        </section>

        <section v-if="segmentSelected === 'running'">
          <!-- Empty state -->
          <div v-if="runningJobs?.length === 0">
            <p class="ion-text-center">{{ translate("There are no jobs running right now")}}</p>
            <div class="ion-text-center">
              <ion-button fill="outline" @click="refreshJobs(undefined, true)">
                {{ translate('retry') }}
                <ion-spinner slot="end" v-if="isRetrying" name="crescent" />
              </ion-button>
            </div>
          </div>

          <div v-else>
            <ion-card v-for="job in runningJobs" :key="job.jobId">
              <ion-card-header>
                <div>
                  <ion-card-subtitle class="overline">{{ job.parentJobId }}</ion-card-subtitle>
                  <ion-card-title>{{ job.enumName }}</ion-card-title>
                </div>
                <ion-badge color="dark">{{ job.statusDesc }}</ion-badge>
              </ion-card-header>

              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p>{{ job.description }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label class="ion-text-wrap">{{ job.runTime ? getTime(job.runTime) : "-"  }}</ion-label>
                <ion-note v-if="job.startDateTime" slot="end">{{ translate('Started') }} {{ timeFromNow(job.startDateTime) }}</ion-note>
                <ion-note v-else slot="end">-</ion-note>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timerOutline" />
                <ion-label class="ion-text-wrap">{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
              </ion-item>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="codeWorkingOutline" />
                <ion-label class="ion-text-wrap">{{ job.serviceName }}</ion-label>
              </ion-item>

              <div class="actions">
                <div></div>
                <div>
                  <ion-button fill="clear" color="medium" @click.stop="copyJobInformation(job)">
                    <ion-icon slot="icon-only" :icon="copyOutline" />
                  </ion-button>
                  <ion-button fill="clear" color="medium" @click.stop="viewJobHistory(job)">
                    <ion-icon slot="icon-only" :icon="timeOutline" />
                  </ion-button>
                </div>
              </div>
            </ion-card>

            <ion-refresher slot="fixed" @ionRefresh="refreshJobs($event)">
              <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
            </ion-refresher>
            <ion-infinite-scroll @ionInfinite="loadMoreRunningJobs($event)" threshold="100px" v-show="isRunningJobsScrollable" ref="infiniteScrollRef">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
            </ion-infinite-scroll>
          </div> 
        </section>

        <section v-if="segmentSelected === 'history'">
          <!-- Empty state -->
          <div v-if="jobHistory?.length === 0">
            <p class="ion-text-center">{{ translate("No jobs have run yet")}}</p>
            <div class="ion-text-center">
              <ion-button fill="outline" @click="refreshJobs(undefined, true)">
                {{ translate('retry') }}
                <ion-spinner v-if="isRetrying" name="crescent" />
              </ion-button>
            </div>
          </div>

          <div v-else>
          <ion-card v-for="job in jobHistory" :key="job.jobId">
            <ion-card-header>
              <div>
                <ion-card-subtitle class="overline">{{ job.parentJobId }}</ion-card-subtitle>
                <ion-card-title>{{ job.enumName }}</ion-card-title>
              </div>
              <div>
                <ion-badge v-if="job.cancelDateTime || job.finishDateTime" color="dark">{{ job.statusId == "SERVICE_CANCELLED" || job.statusId == "SERVICE_CRASHED" ?  timeFromNow(job.cancelDateTime) : timeFromNow(job.finishDateTime) }}</ion-badge>
                <ion-badge v-if="job.statusId" :color="job.statusId === 'SERVICE_FINISHED' ? 'success' : 'danger'" @click="job.statusId === 'SERVICE_FAILED' ? openFailedJobReason(job) : ''">{{ job.statusDesc }}</ion-badge>
              </div>
            </ion-card-header>

            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ job.description }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="timeOutline" />
              <ion-label class="ion-text-wrap">
                {{ job.runTime ? getTime(job.runTime) : "-"  }}
              </ion-label>
              <ion-note slot="end">{{ job.statusId == "SERVICE_CANCELLED" || job.statusId == "SERVICE_CRASHED" ? getJobExecutionTime(job.startDateTime, job.cancelDateTime) : getJobExecutionTime(job.startDateTime, job.finishDateTime) }}</ion-note>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" :icon="timerOutline" />
              <ion-label class="ion-text-wrap">{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
            </ion-item>

            <ion-item lines="full">
              <ion-icon slot="start" :icon="codeWorkingOutline" />
              <ion-label class="ion-text-wrap">{{ job.serviceName }}</ion-label>
            </ion-item>

            <div class="actions">
              <div></div>
              <div>
                <ion-button fill="clear" color="medium" @click.stop="copyJobInformation(job)">
                  <ion-icon slot="icon-only" :icon="copyOutline" />
                </ion-button>
                <ion-button fill="clear" color="medium" @click.stop="viewJobHistory(job)">
                  <ion-icon slot="icon-only" :icon="timeOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card>

          <ion-refresher slot="fixed" @ionRefresh="refreshJobs($event)">
            <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
          </ion-refresher>   
          <ion-infinite-scroll @ionInfinite="loadMoreJobHistory($event)" threshold="100px"  v-show="isHistoryJobsScrollable" ref="infiniteScrollRef">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
          </div>          
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="segmentSelected === 'pending' && currentJob && Object.keys(currentJob).length">
          <JobConfiguration :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>

    <ion-footer v-if="getPinnedJobs && getPinnedJobs.length">
      <ion-toolbar >
        <ion-title slot="start" class="desktop-only">
          {{ translate("Pinned jobs") }}
        </ion-title>
      
        <ion-icon slot="start" class="mobile-only" :icon="pinOutline" />  

        <div>
          <ion-chip v-for="(job, index) in getPinnedJobs" :key="index" @click="updateSelectedPinnedJob(job)" :outline="!isPinnedJobSelected(job)">
            <ion-label>{{ getEnumName(job) }}</ion-label>
            <ion-icon @click.stop="updatePinnedJobs(job)" :icon="closeCircleOutline" />
          </ion-chip>  
        </div>     
      </ion-toolbar>  
    </ion-footer>
  </ion-page>
</template>
<script lang="ts">
import { DateTime } from 'luxon';
import { mapGetters, useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { defineComponent, ref } from "vue";
import {
  IonBadge,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
  IonTitle,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  alertController,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  isPlatform,
  modalController,
  popoverController,
  IonButtons
} from "@ionic/vue";
import JobConfiguration from '@/components/JobConfiguration.vue'
import { closeCircleOutline, codeWorkingOutline, copyOutline, ellipsisVerticalOutline, filterOutline, helpCircleOutline, pinOutline, refreshOutline, timeOutline, timerOutline } from "ionicons/icons";
import emitter from '@/event-bus';
import JobHistoryModal from '@/components/JobHistoryModal.vue';
import { Plugins } from '@capacitor/core';
import { showToast } from '@/utils'
import JobActionsPopover from '@/components/JobActionsPopover.vue'
import { Actions, hasPermission } from '@/authorization'
import Filters from '@/components/Filters.vue';
import FailedJobReasonModal from '@/views/FailedJobReasonModal.vue'
import { translate } from '@hotwax/dxp-components';
import LeareMoreModal from '@/components/LeareMoreModal.vue';

export default defineComponent({
  name: "Pipeline",
  components: {
    IonBadge,
    IonButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonToolbar,
    IonTitle,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonButtons,
    JobConfiguration,
    Filters
},
  data() {
    return {
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      jobEnums: {
        ...JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      },
      currentJobStatus: '',
      freqType: '' as any,
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      isRetrying: false,
      queryString: '' as any,
      isScrollingEnabled: false
    }
  },
  computed: {
    ...mapGetters({
      jobHistory: 'job/getJobHistory',
      pendingJobs: 'job/getPendingJobs',
      runningJobs: 'job/getRunningJobs',
      temporalExpr: 'job/getTemporalExpr',
      getEnumName: 'job/getEnumName',
      getCurrentEComStore:'user/getCurrentEComStore',
      isPendingJobsScrollable: 'job/isPendingJobsScrollable',
      isRunningJobsScrollable: 'job/isRunningJobsScrollable',
      isHistoryJobsScrollable: 'job/isHistoryJobsScrollable',
      getPinnedJobs: 'user/getPinnedJobs',
      currentJob: 'job/getCurrentJob',
      pipelineFilters: 'job/getPipelineFilters',
    }),
    filterIconColor: function() {
      const pipelineFilters = JSON.parse(JSON.stringify(this.pipelineFilters));
      if(this.segmentSelected !== 'history') {
        delete pipelineFilters.status;
      } 
      return Object.values(pipelineFilters).some((filter: any) => filter.length > 0) ? 'secondary' : '';
    },
  },
  async ionViewWillEnter() {
    this.isScrollingEnabled = false;
  },
  methods : {
    async openLearnMoreModal(job: any) {
      const openLearnMoreModal = await modalController.create({
        component: LeareMoreModal,
        componentProps: {currentJob: job}
      })
      return openLearnMoreModal.present()
    },
    isPinnedJobSelected(jobEnumId: any) {
      return (this as any).pipelineFilters.enum.some((jobId: any) =>  jobId === jobEnumId );
    },
    updateSelectedPinnedJob(jobEnumId: any) {
      const index = (this as any).pipelineFilters.enum.indexOf(jobEnumId);
      if ((this as any).pipelineFilters.enum.includes(jobEnumId) || !this.getPinnedJobs.includes(jobEnumId)) {
        if (index != -1) (this as any).pipelineFilters.enum.splice(index, 1)
      } else {
        (this as any).pipelineFilters.enum.push(jobEnumId)
      }

      this.segmentSelected === 'pending' ? this.getPendingJobs():
      this.segmentSelected === 'running' ? this.getRunningJobs():
      this.getJobHistory();
    },
    async openFailedJobReason(job: any) {
      const jobHistoryModal = await modalController.create({
        component: FailedJobReasonModal,
        componentProps: { job }
      });

      return jobHistoryModal.present();
    },
    getJobExecutionTime(startTime: any, endTime: any){
      if (startTime && endTime) {
        const timeDiff = DateTime.fromMillis(endTime).diff( DateTime.fromMillis(startTime))
        const hours =  timeDiff.hours
        const minutes = timeDiff.minutes
        const seconds =  timeDiff
        let format = ""
        if(hours) format += "hh 'hr' "
        if(minutes) format += "mm 'min' "
        if(seconds) format += "ss 'sec'"
        if (format) return timeDiff.toFormat(format);
      }
      return
    },
    async copyJobInformation(job: any) {
      const { Clipboard } = Plugins;
      const jobDetails = `jobId: ${job.jobId}, jobName: ${job.enumName}, jobDescription: ${job.description} ${job.runtimeData ? (", runtimeData: " + JSON.stringify(job.runtimeData)) : ""}`;

      await Clipboard.write({
        string: jobDetails
      }).then(() => {
        showToast(translate("Copied job details to clipboard"));
      })
    },
    async viewJobHistory(job: any) {
      const jobHistoryModal = await modalController.create({
        component: JobHistoryModal,
        componentProps: { currentJob: job }
      });
      return jobHistoryModal.present();
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.TIME_SIMPLE);
    },
    timeFromNow (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMoreJobHistory(event: any){
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if(!(this.isScrollingEnabled && this.isHistoryJobsScrollable)) {
        await event.target.complete();
      }
      this.getJobHistory(
        undefined,
        Math.ceil(this.jobHistory.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(async () => {
        await event.target.complete();
      });
    },
    async loadMoreRunningJobs(event: any){
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if(!(this.isScrollingEnabled && this.isRunningJobsScrollable)) {
        await event.target.complete();
      }
      this.getRunningJobs(
        undefined,
        Math.ceil(this.runningJobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(async () => {
        await event.target.complete();
      });
    },
    async loadMorePendingJobs (event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if(!(this.isScrollingEnabled && this.isPendingJobsScrollable)) {
        await event.target.complete();
      }
      this.getPendingJobs(
        undefined,
        Math.ceil(this.pendingJobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(async () => {
        await event.target.complete();
      });
    },
    async refreshJobs(event: any, isRetrying = false ) {
      this.isRetrying = isRetrying;
      if(this.segmentSelected === 'pending') {
        this.getPendingJobs().then(() => {
          if(event) event.target.complete();
          this.isRetrying = false;
        });
      } else if(this.segmentSelected === 'running') {
        this.getRunningJobs().then(() => {
          if(event) event.target.complete();
          this.isRetrying = false;
        });
      } else {
        this.getJobHistory().then(() => {
          if(event) event.target.complete();
          this.isRetrying = false;
        });
      }
    },
    segmentChanged (e: CustomEvent) {
      this.segmentSelected = e.detail.value
      this.segmentSelected === 'pending' ? this.getPendingJobs():
      this.segmentSelected === 'running' ? this.getRunningJobs():
      this.getJobHistory();
    },
    isRuntimePassed(job: any) {
      return job.runTime <= DateTime.now().toMillis()
    },
    async skipJob (job: any) {
      const alert = await alertController
        .create({
          header: translate('Skip job'),
          message: translate('Skipping will run this job at the next occurrence based on the temporal expression.'),
          buttons: [
            {
              text: translate("Don't skip"),
              role: 'cancel',
            },
            {
              text: translate('Skip'),
              handler: async () => {
                if(this.isRuntimePassed(job)) {
                  await this.refreshJobs(undefined, true)
                  showToast(translate("Job runtime has passed. The job data has refreshed. Please try again."))
                  await this.store.dispatch('job/updateCurrentJob', { job: {} });
                  return;
                }

                await this.store.dispatch('job/skipJob', job);
                await this.getPendingJobs();
              },
            }
          ]
        });
      return alert.present();
    },
    async getPendingJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchPendingJobs', { eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, systemJobEnumId: this.pipelineFilters.enum, enumTypeId: this.pipelineFilters.category, statusId: this.pipelineFilters.status });
    },
    async getRunningJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchRunningJobs', { eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, systemJobEnumId: this.pipelineFilters.enum, enumTypeId: this.pipelineFilters.category, statusId: this.pipelineFilters.status });
    },
    async getJobHistory(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchJobHistory', { eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex, queryString: this.queryString, systemJobEnumId: this.pipelineFilters.enum, enumTypeId: this.pipelineFilters.category, statusId: this.pipelineFilters.status});
    },
    async openJobActions(job: any, ev: Event) {
      const popover = await popoverController.create({
        component: JobActionsPopover,
        showBackdrop: false,
        event: ev,
        componentProps: { job }
      });
      return popover.present()
    },
    async cancelJob(job: any){
      const alert = await alertController
        .create({
          header: translate('Cancel job'),
          message: translate('Canceling this job will cancel this occurrence and all following occurrences. This job will have to be re-enabled manually to run it again.'),
          buttons: [
            {
              text: translate("DON'T CANCEL"),
              role: 'cancel',
            },
            {
              text: translate("CANCEL"),
              handler: async () => {
                if(this.isRuntimePassed(job)) {
                  await this.refreshJobs(undefined, true)
                  showToast(translate("Job runtime has passed. The job data has refreshed. Please try again."))
                  await this.store.dispatch('job/updateCurrentJob', { job: {} });
                  return;
                }

                await this.store.dispatch('job/cancelJob', job);
                await this.getPendingJobs();
              },
            }
          ],
        });

       return alert.present();
    },
    async viewJobConfiguration(job: any) {
      this.currentJobStatus = job.tempExprId
      const id = Object.entries(this.jobEnums).find((enums) => enums[1] == job.systemJobEnumId) as any
      const appFreqType =  id && (Object.entries(this.jobFrequencyType).find((freq) => freq[0] == id[0]) as any)
      this.freqType = appFreqType ? appFreqType[1] : "default"

      await this.store.dispatch('job/updateCurrentJob', { job });
      if(!this.isDesktop && job?.jobId) {
        this.router.push({ name: 'JobDetails', params: { jobId: job?.jobId, category: "pipeline" } });
        return;
      }

      if (job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    async updatePinnedJobs(enumId: any) {
      const pinnedJobs = new Set(this.getPinnedJobs);
      if (pinnedJobs.has(enumId)) {
        pinnedJobs.delete(enumId);
      }

      await this.store.dispatch('user/updatePinnedJobs', { pinnedJobs: [...pinnedJobs] });
      this.updateSelectedPinnedJob(enumId)
    },
    updateJobs() {
      if (this.isDesktop) {
        if (this.currentJob) {
          this.viewJobConfiguration(this.currentJob);
        }
        this.getPendingJobs();
      }
    },
  },
  async created() {
    this.getPendingJobs();
    this.store.dispatch('user/getPinnedJobs');
    emitter.on('jobUpdated', this.updateJobs);
    // TODO: improved this to manage the current job using local variable
    // setting the current job as empty because when coming back to the pipeline page the currentJob
    // state does not gets updated and hence the job configuration component takes it space in DOM
    await this.store.dispatch('job/updateCurrentJob', { job: {} });
  },
  mounted(){
    emitter.on("productStoreOrConfigChanged", this.refreshJobs);
    emitter.on("pinnedJobsUpdated", (this as any).updateSelectedPinnedJob);
  },
  unmounted(){
    emitter.off("productStoreOrConfigChanged", this.refreshJobs);
    emitter.off('jobUpdated', this.updateJobs);
    emitter.off("pinnedJobsUpdated", (this as any).updateSelectedPinnedJob);
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const segmentSelected = ref('pending');


    return {
      Actions,
      closeCircleOutline,
      copyOutline,
      store,
      codeWorkingOutline,
      ellipsisVerticalOutline,
      helpCircleOutline,
      pinOutline,
      refreshOutline,
      timeOutline,
      timerOutline,
      segmentSelected,
      router,
      filterOutline,
      hasPermission,
      translate
    };
  }
});
</script>

<style scoped>
ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

ion-card-header :last-child {
  display: flex;
  flex-direction: column;
  align-items: end;
  row-gap: 4px;
  flex-shrink: 0;
}

ion-item {
  --background: transparent;
}

.actions {
  display: flex;
  justify-content: space-between;
}

ion-title {
  flex-grow: 0;
}

ion-footer > ion-toolbar > ion-title,
ion-footer > ion-toolbar > ion-icon {
  position: absolute;
  z-index: 2;
  padding: var(--spacer-sm);
}

ion-footer > ion-toolbar > ion-title {
  background: linear-gradient(to right, var(--ion-toolbar-background, var(--ion-background-color, #fff)) 85%, transparent);
}

ion-footer > ion-toolbar > ion-icon {
  font-size: 24px;
  background: linear-gradient(to right, var(--ion-toolbar-background, var(--ion-background-color, #fff)) 50%, transparent);
}

ion-toolbar > div {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  max-width: max-content;
  margin-left: auto;
}

ion-toolbar > div > ion-chip:first-child {
  margin-left: var(--spacer-2xl);
}

ion-chip {
  flex: 1 0 auto;
}

@media (min-width: 991px) {
  ion-header > div {
    display: flex;
  }

  ion-toolbar > div > ion-chip:first-child {
    margin-left: var(--spacer-3xl);
  }
}
</style>
