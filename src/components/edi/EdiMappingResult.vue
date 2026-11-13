<template>
  <div class="mapping-summary">
    <ion-card>
      <ion-card-header>
        <ion-card-subtitle>{{ translate("Errors") }}</ion-card-subtitle><ion-card-title>{{ errors.length }}</ion-card-title>
      </ion-card-header>
    </ion-card><ion-card>
      <ion-card-header>
        <ion-card-subtitle>{{ translate("Order lines") }}</ion-card-subtitle><ion-card-title>
          {{
            result.lineCount
          }}
        </ion-card-title>
      </ion-card-header>
    </ion-card><ion-card>
      <ion-card-header>
        <ion-card-subtitle>{{ translate("Mapped values") }}</ion-card-subtitle><ion-card-title>
          {{
            result.mappedFields
          }}
        </ion-card-title>
      </ion-card-header>
    </ion-card>
  </div>
  <div :class="compact ? 'mapping-stack' : 'mapping-columns'">
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          {{
            translate(errors.length ? "Incomplete payload preview" : "OMS payload preview")
          }}
        </ion-card-title>
      </ion-card-header><ion-card-content>
        <pre class="mapping-json" data-testid="edi-payload-preview">{{
          JSON.stringify(result.payload, null, 2)
        }}</pre>
      </ion-card-content>
    </ion-card>
    <div>
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            {{
              translate(
                errors.length ? "Fix before proceeding" : "Sample mapping passed"
              )
            }}
          </ion-card-title>
        </ion-card-header><ion-list>
          <ion-item v-if="!errors.length">
            <ion-icon
              slot="start"
              :icon="checkmarkCircleOutline"
              color="success"
            /><ion-label class="ion-text-wrap">
              {{
                translate("Required sample values are present and structurally valid.")
              }}
            </ion-label>
          </ion-item><ion-item
            v-for="(issue, index) in result.issues"
            :key="index"
          >
            <ion-icon
              slot="start"
              :icon="
                issue.level === 'error'
                  ? alertCircleOutline
                  : informationCircleOutline
              "
              :color="issue.level === 'error' ? 'danger' : 'medium'"
            /><ion-label class="ion-text-wrap">
              {{ issue.field }}
              <p>{{ translate(issue.message) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card><slot name="actions" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { translate } from "@common/core/i18n";
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from "@ionic/vue";
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
} from "ionicons/icons";
import { computed } from "vue";
import type { MappingResult } from "@/utils/ediOrderMapping";

const props = defineProps<{ result: MappingResult; compact?: boolean }>();
const errors = computed(() =>
  props.result.issues.filter((i) => i.level === "error"));
</script>

<style scoped>.mapping-summary{display:flex;gap:12px}.mapping-summary ion-card{flex:1;margin:12px 0}.mapping-columns{display:grid;grid-template-columns:1.2fr 1fr;gap:12px}.mapping-stack{display:flex;flex-direction:column-reverse;gap:12px}.mapping-stack ion-card{margin:0 0 12px}.mapping-json{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:440px;overflow:auto}.mapping-columns ion-card{margin:0 0 12px}@media(max-width:800px){.mapping-columns{grid-template-columns:1fr}}</style>
