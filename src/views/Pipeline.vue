<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Dashboard") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="dashboard-content">
      <main class="dashboard-container">
        <!-- Global Dashboard Header -->
        <div class="dashboard-header">
          <div>
            <h1>{{ translate("Global Dashboard") }}</h1>
            <p>{{ translate("System status overview and quick triage.") }}</p>
          </div>
          <ion-chip color="success" :outline="true">
            <ion-icon :icon="ellipse" />
            <ion-label>{{ translate("Live Updates Active") }}</ion-label>
          </ion-chip>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Active Integrations") }}</ion-card-subtitle>
              <div class="icon-wrapper blue">
                <ion-icon :icon="gitNetworkOutline" />
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="card-value">24</div>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("24H Success Rate") }}</ion-card-subtitle>
              <div class="icon-wrapper green">
                <ion-icon :icon="pulseOutline" />
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="card-value green-text">94.2%</div>
            </ion-card-content>
          </ion-card>

          <ion-card class="error-card">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Open Errors") }}</ion-card-subtitle>
              <div class="icon-wrapper red">
                <ion-icon :icon="alertCircleOutline" />
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="card-value red-text">3</div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Partner Systems -->
        <h2 class="section-title">
          <ion-icon :icon="serverOutline" />
          {{ translate("Partner Systems") }}
        </h2>

        <div class="partner-grid">
          <ion-card v-for="(system, index) in partnerSystems" :key="index" class="partner-card" button @click="viewPartnerDetails(system.name)">
            <ion-item lines="none" class="partner-item">
              <ion-thumbnail slot="start">
                {{ system.code }}
              </ion-thumbnail>
              <ion-label>
                <h3>{{ system.name }}</h3>
                <p>{{ system.type }}</p>
              </ion-label>
              <ion-badge slot="end" :color="system.statusColor">{{ system.status }}</ion-badge>
            </ion-item>
            <ion-card-content>
              <div class="metric">
                <span>{{ translate("Success Rate") }}</span>
                <strong>{{ system.successRate }}%</strong>
              </div>
              
              <ion-progress-bar :value="system.successRate / 100" :color="system.statusColor"></ion-progress-bar>
               <!-- Mock chart line placeholder -->
               <div class="mini-chart">
                 <svg viewBox="0 0 100 20" preserveAspectRatio="none">
                    <polyline fill="none" :stroke="getStrokeColor(system.statusColor)" stroke-width="2" points="0,15 10,12 20,16 30,10 40,14 50,8 60,12 70,14 80,6 90,10 100,8" />
                 </svg>
               </div>
            </ion-card-content>
          </ion-card>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonChip,
  IonBadge,
  IonProgressBar,
  IonMenuButton,
  IonItem,
  IonThumbnail
} from '@ionic/vue';
import { 
  ellipse, 
  gitNetworkOutline, 
  pulseOutline, 
  alertCircleOutline, 
  serverOutline 
} from 'ionicons/icons';
import router from '@/router'
import { translate } from '@common';

export default defineComponent({
  name: "Dashboard",
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonLabel,
    IonChip,
    IonBadge,
    IonProgressBar,
    IonMenuButton,
    IonItem,
    IonThumbnail
  },
  setup() {
    const partnerSystems = [
      {
        code: 'SH',
        name: 'Shopify',
        type: 'eCommerce',
        status: 'Healthy',
        statusColor: 'success',
        successRate: 99.1
      },
      {
        code: 'NE',
        name: 'NetSuite',
        type: 'ERP',
        status: 'Warning',
        statusColor: 'warning',
        successRate: 88.5
      },
      {
        code: 'IN',
        name: 'Internal FTP',
        type: 'Legacy',
        status: 'Critical',
        statusColor: 'danger',
        successRate: 65.4
      },
      {
        code: 'AV',
        name: 'Avalara',
        type: 'Tax',
        status: 'Healthy',
        statusColor: 'success',
        successRate: 100
      }
    ];

    const getStrokeColor = (status: string) => {
        const colors: any = {
            success: '#2dd36f',
            warning: '#ffc409',
            danger: '#eb445a'
        };
        return colors[status] || '#ccc';
    }

    const viewPartnerDetails = (name: string) => {
      router.push({ name: 'PartnerDetails', params: { name } });
    }

    return {
      translate,
      ellipse,
      gitNetworkOutline,
      pulseOutline,
      alertCircleOutline,
      serverOutline,
      partnerSystems,
      getStrokeColor,
      viewPartnerDetails
    };
  }
});
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.summary-cards ion-card {
  margin: 0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.icon-wrapper.blue { background: rgba(66, 133, 244, 0.2); color: #8ab4f8; }
.icon-wrapper.green { background: rgba(52, 168, 83, 0.2); color: #81c995; }
.icon-wrapper.red { background: rgba(234, 67, 53, 0.2); color: #f28b82; }

.card-value {
  font-size: 36px;
  font-weight: 700;
  color: #202124;
}

.card-value.green-text { color: #34a853; }
.card-value.red-text { color: #ea4335; }

@media (prefers-color-scheme: dark) {
  .card-value { color: #e8eaed; }
  .card-value.green-text { color: #81c995; }
  .card-value.red-text { color: #f28b82; }
}



/* Partner Systems */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.partner-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.partner-card {
  margin: 0;
  position: relative;
}

.metric {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.mini-chart {
  height: 40px;
  opacity: 0.5;
}

.mini-chart svg {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
