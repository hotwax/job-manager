import { ref, computed, onScopeDispose } from 'vue';
import { useJobStore } from '@/store/jobs';
import { useUserStore } from '@/store/user';
import { filterJobRuns } from '@/utils/jobRuns';

export function useJobRuns(jobNameRef: any) {
  const jobStore = useJobStore();
  const userStore = useUserStore();

  const runs = ref<any[]>([]);
  const isRunsLoading = ref(false);
  const hasLoadedRuns = ref(false);
  const hasMoreRuns = ref(true);
  const pageIndex = ref(0);
  const pageSize = ref(20);

  const pinnedRunId = ref('');
  const runsQueryString = ref('');
  const runsStatus = ref('');
  const runsUserId = ref('');
  const runsHasDataLogs = ref('');

  const filteredRuns = computed(() => filterJobRuns(runs.value, {
    queryString: runsQueryString.value,
    status: runsStatus.value,
    userId: runsUserId.value,
    hasDataLogs: runsHasDataLogs.value
  }));

  let currentRequestId = 0;

  const fetchRuns = async (isLoadMore = false) => {
    const jobName = jobNameRef.value;
    if (!jobName) return;

    if (!isLoadMore) {
      isRunsLoading.value = true;
      pageIndex.value = 0;
      hasMoreRuns.value = true;
      runs.value = [];
      hasLoadedRuns.value = false;
    } else {
      pageIndex.value++;
    }

    const requestId = ++currentRequestId;

    try {
      const payload = { pageSize: pageSize.value, pageIndex: pageIndex.value, orderByField: "-jobRunId" } as any;
      if (pinnedRunId.value) payload.jobRunId = pinnedRunId.value;

      const resp = await jobStore.fetchJobRuns(jobName, payload);

      // Cancellation-safe guard: If a newer request was made, discard this response
      if (requestId !== currentRequestId) return;

      if (Array.isArray(resp)) {
        if (!isLoadMore) {
          runs.value = resp;
        } else if (resp.length > 0) {
          const existingIds = new Set(runs.value.map((run: any) => run.jobRunId));
          const uniqueNewRuns = resp.filter((run: any) => !existingIds.has(run.jobRunId));
          runs.value.push(...uniqueNewRuns);
        }

        hasMoreRuns.value = !pinnedRunId.value && resp.length === pageSize.value;
        await userStore.resolveUserFullNames(resp.map((run: any) => run.userId));
      } else {
        if (!isLoadMore) runs.value = [];
        hasMoreRuns.value = false;
      }

      if (!isLoadMore) {
        hasLoadedRuns.value = true;
      }
    } catch (err) {
      console.error(err);
      if (requestId !== currentRequestId) return;
      if (!isLoadMore) hasLoadedRuns.value = true;
    } finally {
      if (requestId === currentRequestId && !isLoadMore) {
        isRunsLoading.value = false;
      }
    }
  };

  const loadRuns = async () => {
    await fetchRuns(false);
  };

  const loadMoreRuns = async (event?: any) => {
    await fetchRuns(true);
    if (event?.target?.complete) {
      event.target.complete();
    }
  };

  const clearPinnedRun = async () => {
    pinnedRunId.value = '';
    await loadRuns();
  };

  onScopeDispose(() => {
    currentRequestId++; // Invalidate any pending request
  });

  return {
    runs,
    filteredRuns,
    isRunsLoading,
    hasLoadedRuns,
    hasMoreRuns,
    pinnedRunId,
    runsQueryString,
    runsStatus,
    runsUserId,
    runsHasDataLogs,
    loadRuns,
    loadMoreRuns,
    clearPinnedRun,
  };
}
