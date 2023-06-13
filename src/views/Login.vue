<template>
  <ion-page>
    <ion-content>
      <div class="flex">
        <form class="login-container" @keyup.enter="login(form)" @submit.prevent="login(form)">
          <Logo />

          <ion-item lines="full" v-if="!baseURL">
            <ion-label position="fixed">{{ $t("OMS") }}</ion-label>
            <ion-input name="instanceUrl" v-model="instanceUrl" id="instanceUrl" type="text" required />
          </ion-item>
          <ion-item lines="full">
            <ion-label position="fixed">{{ $t("Username") }}</ion-label>
            <ion-input name="username" v-model="username" id="username" type="text" required />
          </ion-item>
          <ion-item lines="none">
            <ion-label position="fixed">{{ $t("Password") }}</ion-label>
            <ion-input name="password" v-model="password" id="password" type="password" required />
          </ion-item>

          <div class="ion-padding">
            <ion-button type="submit" color="primary" fill="outline" expand="block">{{ $t("Login") }}</ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  alertController,
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage } from "@ionic/vue";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "@/store";
import { mapGetters } from 'vuex';
import Logo from '@/components/Logo.vue';

export default defineComponent({
  name: "Login",
  components: {
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonPage,
    Logo
  },
  data() {
    return {
      username: "",
      password: "",
      instanceUrl: "",
      baseURL: process.env.VUE_APP_BASE_URL,
      alias: process.env.VUE_APP_ALIAS ? JSON.parse(process.env.VUE_APP_ALIAS) : {}
    };
  },
  computed: {
    ...mapGetters({
      currentInstanceUrlSaved: 'user/getInstanceUrl',
      userToken: 'user/getUserToken'
    })
  },
  async mounted() {
    this.instanceUrl = this.currentInstanceUrlSaved;
    if (Object.keys(this.$route.query).length) {
      if (!this.$route.query.oms || !this.$route.query.token) return
      // if a session/login is already active, present confirmation alert
      this.userToken ? this.confirmLoginForAcitveSession() : this.linkLogin()
    }
  },
  methods: {
    login: function () {
      const instanceURL = this.instanceUrl.trim().toLowerCase();
      if(!this.baseURL) this.store.dispatch("user/setUserInstanceUrl", this.alias[instanceURL] ? this.alias[instanceURL] : instanceURL);
      const { username, password } = this;
      this.store.dispatch("user/login", { username: username.trim(), password }).then(() => {
        // All the failure cases are handled in action, if then block is executing, login is successful
        this.username = ''
        this.password = ''
        this.$router.push('/')
      })
    },
    linkLogin: async function () {
      // clear previous user data
      await this.store.dispatch('user/logout')
      const instanceURL = this.$route.query.oms as string
      this.store.dispatch("user/setUserInstanceUrl", this.alias[instanceURL] ? this.alias[instanceURL] : instanceURL);
      this.store.dispatch("user/login", { linkToken: this.$route.query.token }).then(() => {
        this.$router.push('/')
      })
    },
    async confirmLoginForAcitveSession() {
      const sessionAlert = await alertController
        .create({
          header: this.$t("Session active"),
          message: this.$t('A session is already active, all unsaved changes will be lost. Are you sure you want to proceed with this action?'),
          backdropDismiss: false,
          buttons: [
            {
              text: this.$t("Cancel"),
              // route user to the default page if login denied
              handler: () => {
                this.$router.push('/')
              }
            },
            {
              text: this.$t('Login'),
              handler: async () => {
                this.linkLogin()
              }
            }
          ]
        });

      return sessionAlert.present();
    },
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return { router, store };
  }
});
</script>
<style scoped>

.login-container {
  width: 375px;
}

.flex {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

</style>
