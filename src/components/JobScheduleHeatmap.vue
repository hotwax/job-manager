<template>
  <ion-card class="jsh-card" data-testid="job-schedule-heatmap-card">
    <ion-card-header class="jsh-head">
      <div>
        <ion-card-title>{{ translate("Today's job schedule in {minutes}-minute intervals", { minutes: SLOT_MINUTES }) }}</ion-card-title>
        <ion-card-subtitle>{{ todayLabel }} · {{ translate("Jobs scheduled to run, read from their cron expressions.") }}</ion-card-subtitle>
      </div>
      <div class="jsh-legend" aria-hidden="true">
        <span>{{ translate("Fewer") }} · {{ minJobs }}</span>
        <span class="jsh-swatches">
          <i class="lv0" /><i class="lv1" /><i class="lv2" /><i class="lv3" /><i class="lv4" /><i class="lv5" />
        </span>
        <span>{{ maxJobs }} · {{ translate("More") }}</span>
      </div>
    </ion-card-header>

    <div class="jsh-wrap">
      <div class="jsh-scroll">
        <!-- hour axis -->
        <div class="jsh-axis" aria-hidden="true">
          <span class="jsh-gutter" />
          <span v-for="hour in hours" :key="`axis-${hour}`" class="jsh-axcell" :class="{ 'jsh-axnow': hour === nowHour }">
            <span v-if="hour % 3 === 0 || hour === 23">{{ axisLabel(hour) }}</span>
          </span>
        </div>

        <!-- one row for each slot of the hour, one column for each hour -->
        <div class="jsh-grid" role="grid" :style="{ '--jsh-cell-height': `${cellHeight}px` }" data-testid="job-schedule-heatmap-grid">
          <div v-for="slot in slots" :key="`row-${slot}`" class="jsh-row" role="row" :data-testid="`job-schedule-heatmap-row-${slot}`">
            <span class="jsh-minute" aria-hidden="true">:{{ String(slot * SLOT_MINUTES).padStart(2, "0") }}</span>
            <button
              v-for="hour in hours"
              :key="`cell-${hour}-${slot}`"
              type="button"
              role="gridcell"
              class="jsh-cell"
              :class="[`lv${cellLevel(hour, slot)}`, { 'jsh-now': isNow(hour, slot), 'jsh-sel': isSelected(hour, slot) }]"
              :aria-label="cellLabel(hour, slot)"
              :title="cellLabel(hour, slot)"
              :data-testid="`job-schedule-heatmap-cell-${hour}-${slot}`"
              @click="toggleSelected(hour, slot)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="jsh-stats">
      <ion-item class="jsh-stat" lines="none" data-testid="job-schedule-heatmap-busiest">
        <ion-label class="ion-text-wrap">
          <ion-note>{{ translate("Busiest interval") }}</ion-note>
          <span class="jsh-stat-v">{{ busiest.jobs ? translate("{jobs} at {time}", { jobs: jobsLabel(busiest.jobs), time: timeLabel(busiest.hour, busiest.slot) }) : "—" }}</span>
        </ion-label>
      </ion-item>
      <ion-item class="jsh-stat" lines="none" data-testid="job-schedule-heatmap-idle">
        <ion-label class="ion-text-wrap">
          <ion-note>{{ translate("Idle intervals") }}</ion-note>
          <span class="jsh-stat-v">{{ idleIntervals === 0 ? translate("None") : translate("{count} of {total}", { count: idleIntervals, total: hours.length * slots.length }) }}</span>
        </ion-label>
      </ion-item>
      <ion-item class="jsh-stat" lines="none" data-testid="job-schedule-heatmap-jobs">
        <ion-label class="ion-text-wrap">
          <ion-note>{{ translate("Jobs running today") }}</ion-note>
          <span class="jsh-stat-v">{{ jobsRunningToday }} / {{ jobs.length }}</span>
        </ion-label>
      </ion-item>
    </div>

    <p v-if="unreadableJobs.length" class="jsh-note" data-testid="job-schedule-heatmap-unreadable">
      {{ unreadableJobs.length === 1 ? translate("{count} schedule could not be read and is left out.", { count: unreadableJobs.length }) : translate("{count} schedules could not be read and are left out.", { count: unreadableJobs.length }) }}
    </p>

    <!-- drill panel -->
    <div aria-live="polite">
      <ion-list lines="full">
        <ion-item-divider color="light">
          <ion-label>{{ selected ? translate("{start} to {end}", { start: timeLabel(selected.hour, selected.slot), end: timeLabel(selected.hour, selected.slot, SLOT_MINUTES) }) : translate("Schedule detail") }}</ion-label>
          <ion-note v-if="selected" slot="end">
            {{ jobsLabel(selectedEntries.length) }}
          </ion-note>
        </ion-item-divider>
        <ion-item
          v-for="entry in selectedEntries"
          :key="entry.job.jobName"
          button
          :detail="true"
          :data-testid="`job-schedule-heatmap-job-${entry.job.jobName}`"
          @click="router.push(`/job/${entry.job.jobName}`)"
        >
          <ion-label>
            {{ entry.job.jobName }}
            <p v-if="entry.job.cronString">
              {{ entry.job.cronString }}
            </p>
          </ion-label>
          <ion-badge slot="end" color="medium">
            {{ runsLabel(entry.runs) }}
          </ion-badge>
        </ion-item>
        <ion-item v-if="!selectedEntries.length" lines="none" data-testid="job-schedule-heatmap-detail-empty">
          <ion-label color="medium">
            {{ selected ? translate("No jobs scheduled in this interval.") : translate("Select an interval to see which jobs run then.") }}
          </ion-label>
        </ion-item>
      </ion-list>
    </div>
  </ion-card>
</template>

<script setup lang="ts">
import { translate } from "@common";
import {
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonNote
} from "@ionic/vue";
import { DateTime } from "luxon";
import { computed, ref } from "vue";
import router from "@/router";
import { getRunCounts } from "@/utils/cronSchedule";

const props = defineProps<{
  // The scheduled jobs: not a draft, not paused, with a cron expression (the dashboard's active jobs)
  jobs: any[];
  // Current time, so the current interval stays marked as the dashboard keeps its clock ticking
  now?: DateTime;
}>();

const SLOT_MINUTES = 15;
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const slots = Array.from({ length: 60 / SLOT_MINUTES }, (_, slot) => slot);
// Cells share about 170px of height between the rows, between 14px and 26px each, so few rows are not stretched thin
const cellHeight = Math.min(26, Math.max(14, Math.floor(170 / slots.length)));
const selected = ref<{ hour: number; slot: number } | null>(null);

// Luxon's default zone is the zone the user chose in Settings, so "today" is the user's today
const clock = computed(() => props.now ?? DateTime.now());
const today = computed(() => clock.value.startOf("day"));
const todayLabel = computed(() => today.value.toLocaleString({ weekday: "short", day: "numeric", month: "short" }));
const nowHour = computed(() => clock.value.hour);
const nowSlot = computed(() => Math.floor(clock.value.minute / SLOT_MINUTES));

const jobRuns = computed(() => props.jobs.map((job: any) => ({ job, counts: getRunCounts(job.cronExpression, today.value, SLOT_MINUTES) })));
const unreadableJobs = computed(() => jobRuns.value.filter((entry) => !entry.counts));

const slotIndex = (hour: number, slot: number) => hour * slots.length + slot;

// Slot -> the jobs that run in it, with their number of runs there
const slotEntries = computed(() => {
  const bySlot: Array<Array<{ job: any; runs: number }>> = Array.from({ length: hours.length * slots.length }, () => []);
  jobRuns.value.forEach(({ job, counts }) => {
    counts?.forEach((runs, index) => {
      if(runs > 0) {bySlot[index].push({ job, runs });}
    });
  });

  return bySlot;
});

const jobsPerSlot = computed(() => slotEntries.value.map((entries) => entries.length));
const jobsIn = (hour: number, slot: number) => jobsPerSlot.value[slotIndex(hour, slot)];
const maxJobs = computed(() => Math.max(0, ...jobsPerSlot.value));
const minJobs = computed(() => Math.min(...jobsPerSlot.value));

// Shade by the number of distinct jobs that run in the interval, scaled between the quietest and the busiest
// interval of the day: the quietest gets the lightest shade and the busiest the darkest, so a small spread over
// a large always-on baseline still shows. A job that runs many times in the interval counts once. An interval
// with no job stays unshaded, and a day where every interval has the same jobs gets one even shade
const cellLevel = (hour: number, slot: number) => {
  const jobs = jobsIn(hour, slot);
  if(jobs <= 0) {return 0;}
  if(maxJobs.value === minJobs.value) {return 3;}

  return 1 + Math.round(((jobs - minJobs.value) / (maxJobs.value - minJobs.value)) * 4);
};

const busiest = computed(() => {
  const index = jobsPerSlot.value.indexOf(maxJobs.value);

  return { hour: Math.floor(index / slots.length), slot: index % slots.length, jobs: maxJobs.value };
});

const idleIntervals = computed(() => jobsPerSlot.value.filter((jobs) => jobs === 0).length);
const jobsRunningToday = computed(() => jobRuns.value.filter((entry) => entry.counts?.some((runs) => runs > 0)).length);

const selectedEntries = computed(() => {
  if(!selected.value) {return [];}

  return [...slotEntries.value[slotIndex(selected.value.hour, selected.value.slot)]].sort((a, b) => b.runs - a.runs || a.job.jobName.localeCompare(b.job.jobName));
});

const isNow = (hour: number, slot: number) => hour === nowHour.value && slot === nowSlot.value;
const isSelected = (hour: number, slot: number) => selected.value?.hour === hour && selected.value?.slot === slot;
// Selecting the selected interval again clears it, which collapses the job list
const toggleSelected = (hour: number, slot: number) => {
  selected.value = isSelected(hour, slot) ? null : { hour, slot };
};

const jobsLabel = (jobs: number) => jobs === 1 ? translate("{count} job", { count: jobs }) : translate("{count} jobs", { count: jobs });
const runsLabel = (runs: number) => runs === 1 ? translate("{count} run", { count: runs }) : translate("{count} runs", { count: runs });
// Start of the slot, or of the slot `offsetMinutes` later (its end)
const timeLabel = (hour: number, slot: number, offsetMinutes = 0) => today.value.set({ hour, minute: slot * SLOT_MINUTES }).plus({ minutes: offsetMinutes }).toLocaleString({ hour: "numeric", minute: "2-digit" });
const axisLabel = (hour: number) => {
  if(hour === 0) {return "12a";}
  if(hour === 12) {return "12p";}

  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
};
const cellLabel = (hour: number, slot: number) => {
  const label = `${timeLabel(hour, slot)}, ${jobsLabel(jobsIn(hour, slot))}`;

  return isNow(hour, slot) ? `${label}, ${translate("current interval")}` : label;
};
</script>

<style scoped>
.jsh-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacer-xs);
}
.jsh-legend {
  display: flex;
  align-items: center;
  gap: var(--spacer-2xs);
  font-size: 11px;
  color: var(--ion-color-medium);
}
.jsh-swatches {
  display: inline-flex;
  gap: 3px;
}
.jsh-swatches i {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--ion-color-light);
}
.jsh-swatches i.lv1, .jsh-cell.lv1 { background: rgba(var(--ion-color-primary-rgb), 0.16); }
.jsh-swatches i.lv2, .jsh-cell.lv2 { background: rgba(var(--ion-color-primary-rgb), 0.34); }
.jsh-swatches i.lv3, .jsh-cell.lv3 { background: rgba(var(--ion-color-primary-rgb), 0.55); }
.jsh-swatches i.lv4, .jsh-cell.lv4 { background: rgba(var(--ion-color-primary-rgb), 0.80); }
.jsh-swatches i.lv5, .jsh-cell.lv5 { background: var(--ion-color-primary-shade); }

/* Raw CSS grid themed from Ionic variables, like the routing heatmap: it fills the width and only scrolls on phones */
.jsh-wrap {
  padding: var(--spacer-2xs) var(--spacer-sm) var(--spacer-xs);
  overflow-x: auto;
}
.jsh-axis,
.jsh-row {
  display: grid;
  grid-template-columns: 28px repeat(24, minmax(14px, 1fr));
  gap: 2px;
}
.jsh-axis {
  align-items: end;
  margin-bottom: 4px;
}
.jsh-axcell {
  position: relative;
  height: 14px;
  font-size: 10px;
  line-height: 1;
  text-align: center;
  color: var(--ion-color-medium);
  white-space: nowrap;
}
.jsh-axcell span {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
}
.jsh-axcell.jsh-axnow {
  color: var(--ion-color-primary);
  font-weight: 700;
}
.jsh-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.jsh-row {
  align-items: center;
}
.jsh-minute {
  padding-inline-end: 4px;
  font-size: 10px;
  line-height: 1;
  text-align: end;
  color: var(--ion-color-medium);
}
.jsh-cell {
  appearance: none;
  border: 0;
  padding: 0;
  height: var(--jsh-cell-height, 14px);
  border-radius: 3px;
  cursor: pointer;
  background: var(--ion-color-light);
  transition: transform 0.08s ease;
}
.jsh-cell:hover {
  transform: scale(1.16);
}
.jsh-cell:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 1px;
}
.jsh-cell.jsh-now {
  box-shadow: inset 0 0 0 2px var(--ion-color-primary);
}
.jsh-cell.jsh-sel,
.jsh-cell.jsh-now.jsh-sel {
  box-shadow: inset 0 0 0 2px var(--ion-text-color);
}

.jsh-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacer-xs);
  padding: var(--spacer-2xs) var(--spacer-sm) 0;
}
@media (max-width: 480px) {
  .jsh-stats {
    grid-template-columns: 1fr;
  }
}
.jsh-stat {
  min-width: 0;
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
  --background: transparent;
  --border-radius: 8px;
  --padding-start: var(--spacer-sm);
  --inner-padding-end: var(--spacer-sm);
}
.jsh-stat ion-note {
  display: block;
  margin-bottom: 2px;
}
.jsh-stat .jsh-stat-v {
  display: block;
}
.jsh-note {
  margin: var(--spacer-xs) var(--spacer-sm) 0;
  font-size: 12px;
  color: var(--ion-color-medium);
}
</style>
