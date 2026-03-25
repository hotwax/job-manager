<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile.username }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile.userFullName || userProfile.partyId }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>

      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate('OMS instance') }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ cookieHelper().get("oms") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
          </ion-card-content>
          <ion-button :standalone-hidden="!hasPermission(Actions.APP_PWA_STANDALONE_ACCESS)" @click="commonUtil.goToOms()" fill="clear" :disabled="!hasPermission(Actions.APP_COMMERCE_VIEW)">
            {{ translate('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate("Product Store") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ translate("Store") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("A store represents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores sellling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.") }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="translate('Select store')" interface="popover" :value="currentProductStore.productStoreId" @ionChange="setEComStore($event)">
              <ion-select-option v-for="store in (userProfile ? userProfile.stores : [])" :key="store.productStoreId" :value="store.productStoreId" >{{ store.storeName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
      <hr />
      <div class="section-header">
        <div>
          <h1>{{ translate('App') }}</h1>
          <p class="overline">{{ translate("Version: ", { appVersion }) }}</p>
        </div>
        <div class="ion-text-end">
          <p class="overline">{{ translate("Built: ", { builtDateTime: getDateTime(appInfo.builtTime) }) }}</p>
          <ion-button v-if="userStore.getPwaState.updateExists" @click="refreshApp()" fill="outline" color="dark" size="small">{{ translate("Update") }}</ion-button>
        </div>
      </div>

      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Timezone') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>
          <ion-item v-if="showBrowserTimeZone">
            <ion-label>
              <p class="overline">{{ translate("Browser TimeZone") }}</p>
              {{ browserTimeZone.id }}
              <p v-if="showDateTime">{{ commonUtil.getCurrentTime(browserTimeZone.id, dateTimeFormat) }}</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ translate("Selected TimeZone") }}</p>
              {{ currentTimeZoneId }}
              <p v-if="showDateTime">{{ commonUtil.getCurrentTime(currentTimeZoneId, dateTimeFormat) }}</p>
            </ion-label>
            <ion-button id="time-zone-modal" slot="end" fill="outline" color="dark">{{ translate("Change") }}</ion-button>
          </ion-item>
        </ion-card>
        <!-- Using inline modal(as recommended by ionic), also using it inline as the component inside modal is not getting mounted when using modalController -->
        <ion-modal ref="timeZoneModal" trigger="time-zone-modal" @didPresent="search()" @didDismiss="clearSearch()">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="closeModal">
                  <ion-icon :icon="closeOutline" />
                </ion-button>
              </ion-buttons>
              <ion-title>{{ translate("Select time zone") }}</ion-title>
            </ion-toolbar>
            <ion-toolbar>
              <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search time zones')"  v-model="queryString" @keyup.enter="queryString = $event.target.value; findTimeZone()" />
            </ion-toolbar>
          </ion-header>

          <ion-content>
            <div>
              <ion-radio-group value="rd" v-model="timeZoneId">
                <ion-list v-if="showBrowserTimeZone">
                  <ion-list-header>{{ translate("Browser time zone") }}</ion-list-header>
                  <ion-item>
                    <ion-radio label-placement="end" justify="start" :value="browserTimeZone.id">
                      <ion-label>
                        {{ browserTimeZone.label }} ({{ browserTimeZone.id }})
                        <p v-if="showDateTime">{{ commonUtil.getCurrentTime(browserTimeZone.id, dateTimeFormat) }}</p>
                      </ion-label>
                    </ion-radio>
                  </ion-item>
                </ion-list>
                <ion-list>
                  <ion-list-header v-if="showBrowserTimeZone">{{ translate("Select a different time zone") }}</ion-list-header>
                  <!-- Loading state -->
                  <div class="empty-state" v-if="isLoading">
                    <ion-item lines="none">
                      <ion-spinner color="secondary" name="crescent" slot="start" />
                      {{ translate("Fetching time zones") }}
                    </ion-item>
                  </div>
                  <!-- Empty state -->
                  <div class="empty-state" v-else-if="filteredTimeZones.length === 0">
                    <p>{{ translate("No time zone found") }}</p>
                  </div>
                  <div v-else>
                    <ion-item :key="timeZone.id" v-for="timeZone in filteredTimeZones">
                      <ion-radio label-placement="end" justify="start" :value="timeZone.id">
                        <ion-label>
                          {{ timeZone.label }} ({{ timeZone.id }})
                          <p v-if="showDateTime">{{ commonUtil.getCurrentTime(timeZone.id, dateTimeFormat) }}</p>
                        </ion-label>
                      </ion-radio>
                    </ion-item>
                  </div>
                </ion-list>
              </ion-radio-group>
            </div>

            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
              <ion-fab-button :disabled="!currentTimeZoneId" @click="setUserTimeZone">
                <ion-icon :icon="saveOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonModal, IonFab, IonFabButton, IonRadioGroup, IonSpinner, IonList, IonListHeader, IonRadio, IonSearchbar, IonLabel } from '@ionic/vue';
import { computed, onBeforeMount, ref } from 'vue';
import { closeOutline, openOutline, saveOutline } from 'ionicons/icons'
import router from '@/router';
import { useUserStore } from '@/store/user';
import Image from '@/components/Image.vue'
import { cookieHelper, commonUtil, translate } from '@common';
import { useAuth } from '@/composables/auth';
import Actions from '@/authorization/Actions';
import { hasPermission } from '@/authorization';
import { DateTime } from 'luxon';

const userStore = useUserStore();
const userProfile = computed(() => userStore.getUserProfile)
const currentProductStore = computed(() => userStore.getCurrentProductStore)

const appInfo = (import.meta.env.VUE_APP_VERSION_INFO ? JSON.parse(import.meta.env.VUE_APP_VERSION_INFO) : {}) as any;
const appVersion = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag;
const getDateTime = (time: any) => time ? DateTime.fromMillis(time).setZone(userStore.current.timezoneId).toLocaleString(DateTime.DATETIME_MED) : DateTime.now();

const refreshApp = () => {
  userStore.updatePwaState({ registration: userStore.getPwaState.registration, updateExists: false })
  if (!userStore.getPwaState.registration || !userStore.getPwaState.registration.waiting) return
  userStore.getPwaState.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
}

const setEComStore = (event: any) => {
  // If the value is same, no need to update
  // Handled case for programmatical changes
  // https://github.com/ionic-team/ionic-framework/discussions/25532
  // https://github.com/ionic-team/ionic-framework/issues/20106
  // https://github.com/ionic-team/ionic-framework/pull/25858
  if(userProfile && currentProductStore?.value.productStoreId !== event.detail.value) {
    userStore.setCurrentProductStore({ 'productStoreId': event.detail.value })
  }
}
const setShopifyConfig = (event: any) => {
  userStore.setCurrentShopifyConfig({ 'shopifyConfigId': event.detail.value });
}

const logout = () => {
  useAuth().logout({ isUserUnauthorised: false }).then((redirectionUrl) => {
    // redirectionUrl is only present when SSO enables, thus when not present redirect user to login
    if(!redirectionUrl) {
      router.replace("/login");
    } else {
      window.location.href = redirectionUrl
    }
  })
}
const goToLaunchpad = () => {
  window.location.href = `${import.meta.env.VUE_APP_LOGIN_URL}`
}

const timeZones = computed(() => userStore.getAvailableTimeZones)
const currentTimeZoneId = computed(() => userStore.getUserTimeZone)

const isLoading = ref(true);
const timeZoneModal = ref();
const queryString = ref('');
const filteredTimeZones = ref<any[]>([])
const timeZoneId = ref("")
// Fetching timeZone of the browser
const browserTimeZone = ref({
  label: '',
  id: Intl.DateTimeFormat().resolvedOptions().timeZone
})

const props = defineProps({
  showBrowserTimeZone: {
    type: Boolean,
    default: true
  },
  showDateTime: {
    type: Boolean,
    default: true
  },
  dateTimeFormat: {
    type: String,
    default: 't ZZZZ'
  }
})

const closeModal = () => {
  timeZoneModal.value.$el.dismiss(null, 'cancel');
}

onBeforeMount(async () => {
  isLoading.value = true;
  await userStore.fetchAvailableTimeZones();

  if(userProfile.value && userProfile.value.userTimeZone) {
    userProfile.value.timeZone = userProfile.value.userTimeZone
    timeZoneId.value = userProfile.value.userTimeZone
  }

  if(props.showBrowserTimeZone) {
    browserTimeZone.value.label = timeZones.value.find((timeZone: any) => timeZone.id.toLowerCase().match(browserTimeZone.value.id.toLowerCase()))?.label
  }

  findTimeZone();
  isLoading.value = false;
})

async function setUserTimeZone() {
  await userStore.setUserTimeZone(timeZoneId.value)
  closeModal();
}

function findTimeZone() {
  const searchedString = queryString.value.toLowerCase();
  filteredTimeZones.value = timeZones.value.filter((timeZone: any) => timeZone.id.toLowerCase().match(searchedString) || timeZone.label.toLowerCase().match(searchedString));

  if(props.showBrowserTimeZone) {
    filteredTimeZones.value = filteredTimeZones.value.filter((timeZone: any) => !timeZone.id.toLowerCase().match(browserTimeZone.value.id.toLowerCase()));
  }
}

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement()
  element.select();
}

function search() {
  isLoading.value = true;
  findTimeZone();
  isLoading.value = false;
}

// clearing the data explicitely as the modal is mounted due to the component being mounted always
function clearSearch() {
  queryString.value = ''
  filteredTimeZones.value = []
  isLoading.value = true
}


</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  hr {
    border-top: 1px solid var(--ion-color-medium);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
</style>