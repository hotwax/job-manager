import { computed, ref } from 'vue';
import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  getRunDuration,
  getJobLastDayAverageDuration,
  formatJobResult,
  useDashboardProjections
} from './useDashboardProjections';
import { DateTime } from 'luxon';

describe('useDashboardProjections - utilities', () => {
  it('formatDuration should format seconds correctly', () => {
    expect(formatDuration(0)).toBe('--');
    expect(formatDuration(-5)).toBe('--');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(65)).toBe('1m 5s');
    expect(formatDuration(3600)).toBe('60m 0s');
  });

  it('getRunDuration should return correct duration in seconds', () => {
    const start = DateTime.now().minus({ minutes: 5 }).toMillis();
    const end = DateTime.now().toMillis();
    expect(getRunDuration({ startTime: start, endTime: end })).toBeCloseTo(300, -1);

    expect(getRunDuration({})).toBe(0);
    expect(getRunDuration({ startTime: start })).toBe(0);
  });

  it('getJobLastDayAverageDuration should calculate average correctly', () => {
    const now = DateTime.now();
    const map = {
      'job1': [
        { startTime: now.minus({ days: 2 }).toMillis(), endTime: now.minus({ days: 2, minutes: -10 }).toMillis() }, // 600s
        { startTime: now.minus({ hours: 5 }).toMillis(), endTime: now.minus({ hours: 5, minutes: -20 }).toMillis() }, // 1200s
        { startTime: now.minus({ hours: 1 }).toMillis(), endTime: now.minus({ hours: 1, minutes: -10 }).toMillis() }  // 600s
      ],
      'job2': []
    };

    // For job1, it should only consider the last two runs (within 1 day)
    expect(getJobLastDayAverageDuration('job1', map)).toBeCloseTo(900, -1);
    expect(getJobLastDayAverageDuration('job2', map)).toBe(0);
    expect(getJobLastDayAverageDuration('job3', map)).toBe(0);
  });

  it('formatJobResult should truncate long strings', () => {
    expect(formatJobResult(null)).toBe('');
    expect(formatJobResult('short')).toBe('short');
    const long = 'a'.repeat(200);
    expect(formatJobResult(long)).toHaveLength(183);
    expect(formatJobResult(long).endsWith('...')).toBe(true);
  });
});


describe('useDashboardProjections - projections', () => {
  it('should calculate job projections correctly including active/paused/noschedule overlaps', () => {
    const jobs = ref([
      { jobName: 'draftJob', isDraftJob: true, paused: 'Y' },
      { jobName: 'pausedAndNoSched', paused: 'Y', cronExpression: '' },
      { jobName: 'activeJob', paused: 'N', cronExpression: '* * * * *' },
      { jobName: 'configErr', paused: 'Y', cronExpression: '', serviceName: '_NA_' }
    ]);
    const jobRunsMap = ref({
      'activeJob': [
        { jobRunId: 'run1', startTime: DateTime.now().toMillis() - 5000, endTime: null } // Stuck run
      ]
    });

    // Using mock function since we mock the internal getJobLastDayAverageDuration
    const { jobProjections } = useDashboardProjections(
      computed(() => jobs.value),
      jobRunsMap,
      computed(() => []),
      computed(() => []),
      computed(() => []),
      computed(() => []),
      (s: string) => s
    );

    expect(jobProjections.value.draftJobsCount).toBe(1);
    expect(jobProjections.value.pausedJobsCount).toBe(2);
    expect(jobProjections.value.noScheduleJobsCount).toBe(2);
    expect(jobProjections.value.scheduledJobsCount).toBe(1);
    expect(jobProjections.value.configErrorJobs).toHaveLength(1);
  });

  it('should handle edge cases for log projections with missing config data', () => {
    const logs = ref([
      { logId: 'log1', configId: 'conf1', statusId: 'DmlsFinished', createdDate: 123 },
      { logId: 'log2', configId: 'missing', statusId: 'DmlsPending', createdDate: 456, failedRecordCount: 1 }
    ]);
    const configs = ref([
      { configId: 'conf1', priority: '7' } // High priority
    ]);

    const { logProjections } = useDashboardProjections(
      computed(() => []),
      ref({}),
      computed(() => logs.value),
      computed(() => configs.value),
      computed(() => []),
      computed(() => []),
      (s: string) => s
    );

    // log1 goes to highPriority, log2 defaults to standard priority
    expect(logProjections.value.highPriorityLogs).toHaveLength(1);
    expect(logProjections.value.standardLogs).toHaveLength(1);
    expect(logProjections.value.highPrioritySuccessCount).toBe(1);
    expect(logProjections.value.standardPendingCount).toBe(1); // Assuming DmlsPending is mocked in MDM_PENDING_STATUSES
    expect(logProjections.value.failedLogsCount).toBe(1); // log2 has failed records
  });
});
