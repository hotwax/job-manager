import { computed, Ref } from 'vue';
import { DateTime } from 'luxon';
import { MDM_PENDING_STATUSES, getTimeInMillis, hasFailedRecords, hasSystemMessageError, getFileSize, getLogFileName } from '@/utils';
import { translate } from '@common';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  documentOutline,
  cloudUploadOutline,
  warningOutline
} from 'ionicons/icons';

// Utility functions that don't need reactivity
export const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

export const getRunDuration = (run: any) => {
  if (!run.startTime || !run.endTime) return 0;
  const startDt = typeof run.startTime === 'number' ? DateTime.fromMillis(run.startTime) : DateTime.fromISO(run.startTime);
  const endDt = typeof run.endTime === 'number' ? DateTime.fromMillis(run.endTime) : DateTime.fromISO(run.endTime);
  if (!startDt.isValid || !endDt.isValid) return 0;
  const diff = endDt.diff(startDt, 'seconds').seconds;
  return diff > 0 ? diff : 0;
};

export const getJobLastDayAverageDuration = (jobName: string, jobRunsMapValue: Record<string, any[]>) => {
  const runs = jobRunsMapValue[jobName] || [];
  const completedRuns = runs.filter((run: any) => run.startTime && run.endTime);
  if (completedRuns.length === 0) return 0;

  const oneDayAgo = DateTime.now().minus({ days: 1 });
  const lastDayRuns = completedRuns.filter((run: any) => {
    const end = typeof run.endTime === 'number' ? DateTime.fromMillis(run.endTime) : DateTime.fromISO(run.endTime);
    return end.isValid && end >= oneDayAgo;
  });

  const targetRuns = lastDayRuns.length > 0 ? lastDayRuns : completedRuns;
  const total = targetRuns.reduce((sum: number, run: any) => sum + getRunDuration(run), 0);
  return total / targetRuns.length;
};

export const formatJobResult = (results: any) => {
  if (!results) return "";
  const str = typeof results === 'object' ? JSON.stringify(results) : String(results);
  return str.length > 180 ? str.substring(0, 180) + "..." : str;
};

const getAvgProcessingTime = (logsList: any[]) => {
  const finishedLogs = logsList.filter((log: any) => log.statusId === 'DmlsFinished');
  if (finishedLogs.length === 0) return 0;
  const totalSeconds = finishedLogs.reduce((acc: number, log: any) => {
    const start = log.createdDate;
    const end = log.finishDateTime;
    if (!start || !end) return acc;
    const startDt = typeof start === 'number' ? DateTime.fromMillis(start) : DateTime.fromISO(start);
    const endDt = typeof end === 'number' ? DateTime.fromMillis(end) : DateTime.fromISO(end);
    if (!startDt.isValid || !endDt.isValid) return acc;
    const diff = endDt.diff(startDt, 'seconds').seconds;
    return acc + (diff > 0 ? diff : 0);
  }, 0);
  return totalSeconds / finishedLogs.length;
};

const getAvgMessageProcessingTime = (messagesList: any[]) => {
  const finishedMessages = messagesList.filter((msg: any) => ['SmsgSent', 'SmsgConsumed', 'SmsgConfirmed'].includes(msg.statusId));
  if (finishedMessages.length === 0) return 0;
  const totalSeconds = finishedMessages.reduce((acc: number, msg: any) => {
    const start = msg.initDate;
    const end = msg.processedDate;
    if (!start || !end) return acc;
    const startDt = typeof start === 'number' ? DateTime.fromMillis(start) : DateTime.fromISO(start);
    const endDt = typeof end === 'number' ? DateTime.fromMillis(end) : DateTime.fromISO(end);
    if (!startDt.isValid || !endDt.isValid) return acc;
    const diff = endDt.diff(startDt, 'seconds').seconds;
    return acc + (diff > 0 ? diff : 0);
  }, 0);
  return totalSeconds / finishedMessages.length;
};

export const getOldestMillis = (list: any[], timeFieldGetter: (item: any) => any) => {
  const stamps = list.map(timeFieldGetter).map(getTimeInMillis).filter(Boolean);
  return stamps.length ? Math.min(...(stamps as number[])) : 0;
};

export const getRelativeTimeSpan = (list: any[], timeFieldGetter: (item: any) => any, baseTime: DateTime) => {
  const oldest = getOldestMillis(list, timeFieldGetter);
  return oldest ? (DateTime.fromMillis(oldest).toRelative({ base: baseTime }) || "") : "";
};


export function useDashboardProjections(
  jobsRef: Ref<any[]>,
  jobRunsMapRef: Ref<Record<string, any[]>>,
  logsRef: Ref<any[]>,
  configsRef: Ref<any[]>,
  systemMessagesRef: Ref<any[]>,
  systemMessageTypesRef: Ref<any[]>,
  getStatusItemDesc: (statusId: string) => string
) {

  const jobProjections = computed(() => {
    const jobs = jobsRef.value;
    const jobRunsMap = jobRunsMapRef.value;
    const totalJobsCount = jobs.length;
    let scheduledJobsCount = 0;
    let pausedJobsCount = 0;
    let noScheduleJobsCount = 0;
    let draftJobsCount = 0;

    const stuckJobs: any[] = [];
    const slowJobs: any[] = [];
    const failedRunJobs: any[] = [];
    const configErrorJobs: any[] = [];

    const activeJobs: any[] = [];

    jobs.forEach((job: any) => {
      // Basic counts
      if (job.isDraftJob) {
        draftJobsCount++;
      } else {
        if (job.paused === 'Y') {
          pausedJobsCount++;
        }
        if (!job.cronExpression) {
          noScheduleJobsCount++;
        }
        if (job.paused === 'N' && !!job.cronExpression) {
          scheduledJobsCount++;
          activeJobs.push(job);
        }
      }

      // A missing service marks a deliberately deactivated job. Only runtime-data
      // errors belong in the dashboard's configuration-error projection.
      if (job.runtimeData?._ERROR_MESSAGE_) {
        configErrorJobs.push(job);
      }
    });

    const stuckJobNames = new Set<string>();

    activeJobs.forEach((job: any) => {
      const runs = jobRunsMap[job.jobName] || [];
      const activeRun = runs.find((run: any) => run.startTime && !run.endTime);

      let isStuck = false;
      if (activeRun) {
        const startDt = typeof activeRun.startTime === 'number' ? DateTime.fromMillis(activeRun.startTime) : DateTime.fromISO(activeRun.startTime);
        if (startDt.isValid) {
          const currentDuration = DateTime.now().diff(startDt, 'seconds').seconds;
          const avgDuration = getJobLastDayAverageDuration(job.jobName, jobRunsMap);
          isStuck = (avgDuration > 10 && currentDuration > Math.max(300, avgDuration * 3)) || currentDuration > 7200;

          if (isStuck) {
            stuckJobs.push({
              ...job,
              activeRunId: activeRun.jobRunId,
              currentDuration: formatDuration(currentDuration),
              avgDuration: formatDuration(avgDuration),
              runMessage: activeRun.messages,
              runResults: activeRun.results
            });
            stuckJobNames.add(job.jobName);
          }
        }
      }

      if (!isStuck) {
        const completedRuns = runs.filter((run: any) => run.startTime && run.endTime);
        if (completedRuns.length > 0) {
          const latestRun = completedRuns[0];
          const latestDuration = getRunDuration(latestRun);

          const otherRuns = completedRuns.slice(1);
          if (otherRuns.length > 0) {
            const total = otherRuns.reduce((sum: number, run: any) => sum + getRunDuration(run), 0);
            const avgDuration = total / otherRuns.length;

            const isSlow = latestDuration > 60 && avgDuration > 10 && latestDuration > avgDuration * 1.5;

            if (isSlow) {
              slowJobs.push({
                ...job,
                latestRunId: latestRun.jobRunId,
                latestDuration: formatDuration(latestDuration),
                avgDuration: formatDuration(avgDuration),
                runMessage: latestRun.messages,
                runResults: latestRun.results
              });
            }
          }

          if (latestRun.hasError === 'Y') {
            failedRunJobs.push({
              ...job,
              latestRunId: latestRun.jobRunId,
              runMessage: latestRun.messages,
              runResults: latestRun.results,
              runErrors: latestRun.errors
            });
          }
        }
      }
    });

    return {
      totalJobsCount,
      scheduledJobsCount,
      pausedJobsCount,
      noScheduleJobsCount,
      draftJobsCount,
      stuckJobs,
      slowJobs,
      failedRunJobs,
      configErrorJobs,
      stuckJobsCount: stuckJobs.length,
      slowJobsCount: slowJobs.length,
      failedJobsCount: failedRunJobs.length
    };
  });

  const logProjections = computed(() => {
    const logs = logsRef.value;
    const configs = configsRef.value;

    const configPriorityMap = new Map<string, number>();
    configs.forEach((c: any) => {
      configPriorityMap.set(c.configId, c.priority ? Number(c.priority) : 0);
    });

    const highPriorityLogs: any[] = [];
    const standardLogs: any[] = [];
    const erroredLogs: any[] = [];
    let pendingLogsCount = 0;

    logs.forEach((log: any) => {
      const priority = configPriorityMap.get(log.configId) || 0;
      if (priority > 6) {
        highPriorityLogs.push(log);
      } else {
        standardLogs.push(log);
      }

      if (hasFailedRecords(log)) {
        erroredLogs.push(log);
      }
      if (MDM_PENDING_STATUSES.includes(log.statusId)) {
        pendingLogsCount++;
      }
    });

    const highPriorityPendingCount = highPriorityLogs.filter((log: any) => MDM_PENDING_STATUSES.includes(log.statusId)).length;
    const standardPendingCount = standardLogs.filter((log: any) => MDM_PENDING_STATUSES.includes(log.statusId)).length;

    const highPrioritySuccessCount = highPriorityLogs.filter((log: any) => log.statusId === 'DmlsFinished').length;
    const standardSuccessCount = standardLogs.filter((log: any) => log.statusId === 'DmlsFinished').length;
    const highPriorityFailedCount = highPriorityLogs.filter(hasFailedRecords).length;
    const standardFailedCount = standardLogs.filter(hasFailedRecords).length;

    const highPriorityAvgTime = formatDuration(getAvgProcessingTime(highPriorityLogs));
    const standardAvgTime = formatDuration(getAvgProcessingTime(standardLogs));

    const highPriorityWindowStart = getOldestMillis(highPriorityLogs, (log: any) => log.createdDate);
    const standardWindowStart = getOldestMillis(standardLogs, (log: any) => log.createdDate);

    return {
      highPriorityLogs,
      standardLogs,
      highPriorityPendingCount,
      standardPendingCount,
      highPrioritySuccessCount,
      standardSuccessCount,
      highPriorityFailedCount,
      standardFailedCount,
      highPriorityAvgTime,
      standardAvgTime,
      erroredLogs,
      failedLogsCount: erroredLogs.length,
      pendingLogsCount,
      highPriorityWindowStart,
      standardWindowStart
    };
  });

  const messageProjections = computed(() => {
    const messages = systemMessagesRef.value;

    const incomingMessages: any[] = [];
    const outgoingMessages: any[] = [];
    const erroredMessages: any[] = [];
    let pendingMessagesCount = 0;
    let successMessagesCount = 0;

    let incomingPendingCount = 0;
    let incomingSuccessCount = 0;
    let incomingErrorCount = 0;

    let outgoingPendingCount = 0;
    let outgoingSuccessCount = 0;
    let outgoingErrorCount = 0;

    messages.forEach((msg: any) => {
      const isOutgoing = msg.isOutgoing === 'Y';
      const isPending = ['SmsgProduced', 'SmsgCreated', 'SmsgSending'].includes(msg.statusId) && !(msg.statusId === 'SmsgProduced' && Number(msg.failCount) > 0);
      const isSuccess = ['SmsgSent', 'SmsgConsumed', 'SmsgConfirmed'].includes(msg.statusId);
      const isError = hasSystemMessageError(msg);

      if (isOutgoing) {
        outgoingMessages.push(msg);
        if (isPending) outgoingPendingCount++;
        if (isSuccess) outgoingSuccessCount++;
        if (isError) outgoingErrorCount++;
      } else {
        incomingMessages.push(msg);
        if (isPending) incomingPendingCount++;
        if (isSuccess) incomingSuccessCount++;
        if (isError) incomingErrorCount++;
      }

      if (isError) erroredMessages.push(msg);
      if (isPending) pendingMessagesCount++;
      if (isSuccess) successMessagesCount++;
    });

    const incomingAvgTime = formatDuration(getAvgMessageProcessingTime(incomingMessages));
    const outgoingAvgTime = formatDuration(getAvgMessageProcessingTime(outgoingMessages));

    return {
      incomingMessages,
      outgoingMessages,
      incomingPendingCount,
      incomingSuccessCount,
      incomingErrorCount,
      outgoingPendingCount,
      outgoingSuccessCount,
      outgoingErrorCount,
      erroredMessages,
      erroredMessagesCount: erroredMessages.length,
      pendingMessagesCount,
      successMessagesCount,
      incomingAvgTime,
      outgoingAvgTime
    };
  });

  // Shared with the component: the errored-messages list names its rows with this too, so it
  // cannot stay a local of activityTimeline.
  const systemMessageTypeNames = computed(() => {
    const map = new Map<string, string>();
    systemMessageTypesRef.value.forEach((t: any) => map.set(t.systemMessageTypeId, t.description || t.systemMessageTypeId));

    return map;
  });

  const getSystemMessageTypeName = (typeId: string) => systemMessageTypeNames.value.get(typeId) || typeId;

  const activityTimeline = computed(() => {
    const list: any[] = [];

    systemMessagesRef.value.forEach((msg: any) => {
      const time = msg.lastAttemptDate || msg.initDate;
      if (!time) return;
      const date = typeof time === "number" ? DateTime.fromMillis(time) : DateTime.fromISO(time);

      let icon = documentOutline;
      let color = "primary";
      if (msg.statusId === "SmsgError") {
        icon = alertCircleOutline;
        color = "danger";
      } else if (msg.statusId === "SmsgSent" || msg.statusId === "SmsgConsumed") {
        icon = checkmarkCircleOutline;
        color = "success";
      }

      list.push({
        id: `msg-${msg.systemMessageId}`,
        type: "message",
        targetId: msg.systemMessageId,
        title: `${getSystemMessageTypeName(msg.systemMessageTypeId)} (${msg.isOutgoing === 'Y' ? translate('Outbound') : translate('Inbound')})`,
        description: `#${msg.systemMessageId} | Remote: ${msg.systemMessageRemoteId || "Internal"} | Status: ${getStatusItemDesc(msg.statusId) || msg.statusId}`,
        date,
        timeRelative: date.toRelative(),
        icon,
        statusColor: color
      });
    });

    const configs = configsRef.value;
    const configPriorityMap = new Map<string, number>();
    configs.forEach((c: any) => {
      configPriorityMap.set(c.configId, c.priority ? Number(c.priority) : 0);
    });

    const getLogPriority = (log: any) => configPriorityMap.get(log.configId) || 0;

    logsRef.value.forEach((log: any) => {
      const time = log.createdDate;
      if (!time) return;
      const date = typeof time === "number" ? DateTime.fromMillis(time) : DateTime.fromISO(time);

      const hasErrorRecords = Number(log.failedRecordCount || 0) > 0;

      let icon = cloudUploadOutline;
      let color = "secondary";
      let statusText = getStatusItemDesc(log.statusId) || log.statusId;

      if (["DmlsFailed", "DmlsCrashed"].includes(log.statusId)) {
        icon = alertCircleOutline;
        color = "danger";
      } else if (log.statusId === "DmlsFinished") {
        if (hasErrorRecords) {
          icon = warningOutline;
          color = "warning";
          statusText = translate("Finished with errors");
        } else {
          icon = checkmarkCircleOutline;
          color = "success";
        }
      }

      const priorityVal = getLogPriority(log);
      const queueName = priorityVal > 6 ? translate("High-Priority") : translate("Standard");

      let recordStats = "";
      if (log.totalRecordCount != null) {
        recordStats = ` | ${translate("Failed")}: ${log.failedRecordCount || 0} / ${translate("Total")}: ${log.totalRecordCount}`;
      }

      list.push({
        id: `log-${log.logId}`,
        type: "log",
        targetId: log.logId,
        title: `${getLogFileName(log)} (${queueName})`,
        description: `File processed: ${getFileSize(log.fileSize)}${recordStats} | Status: ${statusText}`,
        date,
        timeRelative: date.toRelative(),
        icon,
        statusColor: color
      });
    });

    return list.sort((a, b) => b.date.toMillis() - a.date.toMillis()).slice(0, 15);
  });

  return {
    jobProjections,
    logProjections,
    messageProjections,
    activityTimeline,
    getSystemMessageTypeName
  };
}
