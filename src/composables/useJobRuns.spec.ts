import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useJobRuns } from './useJobRuns';
import { ref, effectScope, Ref } from 'vue';

const mockFetchJobRuns = vi.fn();
vi.mock('@/store/jobs', () => ({
  useJobStore: () => ({
    fetchJobRuns: mockFetchJobRuns
  })
}));

const mockResolveUserFullNames = vi.fn();
vi.mock('@/store/user', () => ({
  useUserStore: () => ({
    resolveUserFullNames: mockResolveUserFullNames
  })
}));

describe('useJobRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchJobRuns.mockResolvedValue([]);
    mockResolveUserFullNames.mockResolvedValue(undefined);
  });

  it('initializes with default state', async () => {
    const jobNameRef = ref('TestJob');
    const scope = effectScope();
    await scope.run(async () => {
      const { runs, isRunsLoading, hasLoadedRuns, hasMoreRuns } = useJobRuns(jobNameRef as Ref<string | undefined>);
      expect(runs.value).toEqual([]);
      expect(isRunsLoading.value).toBe(false);
      expect(hasLoadedRuns.value).toBe(false);
      expect(hasMoreRuns.value).toBe(true);
    });
    scope.stop();
  });

  it('loads initial runs correctly', async () => {
    const mockRuns = Array(20).fill({}).map((_, i) => ({ jobRunId: i.toString() }));
    mockFetchJobRuns.mockResolvedValueOnce(mockRuns);

    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    await scope.run(async () => {
      const { loadRuns, runs, isRunsLoading, hasLoadedRuns, hasMoreRuns } = useJobRuns(jobNameRef as Ref<string | undefined>);

      const loadPromise = loadRuns();
      expect(isRunsLoading.value).toBe(true);
      expect(hasLoadedRuns.value).toBe(false);

      await loadPromise;

      expect(runs.value.length).toBe(20);
      expect(isRunsLoading.value).toBe(false);
      expect(hasLoadedRuns.value).toBe(true);
      expect(hasMoreRuns.value).toBe(true); // 20 results indicates maybe more
    });
    scope.stop();
  });

  it('merges load-more runs without duplicates', async () => {
    const firstPage = [{ jobRunId: '1' }, { jobRunId: '2' }];
    const secondPage = [{ jobRunId: '2' }, { jobRunId: '3' }]; // 2 is duplicate
    mockFetchJobRuns
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    await scope.run(async () => {
      const { loadRuns, loadMoreRuns, runs, hasMoreRuns } = useJobRuns(jobNameRef as Ref<string | undefined>);

      await loadRuns();
      expect(runs.value.map(r => r.jobRunId)).toEqual(['1', '2']);

      const mockEvent = { target: { complete: vi.fn() } };
      await loadMoreRuns(mockEvent);

      expect(runs.value.map(r => r.jobRunId)).toEqual(['1', '2', '3']);
      expect(mockEvent.target.complete).toHaveBeenCalled();
      expect(hasMoreRuns.value).toBe(false); // less than 20 results indicates no more
    });
    scope.stop();
  });

  it('handles empty results and end-of-list correctly', async () => {
    mockFetchJobRuns.mockResolvedValueOnce([]);

    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    await scope.run(async () => {
      const { loadRuns, runs, hasMoreRuns } = useJobRuns(jobNameRef as Ref<string | undefined>);

      await loadRuns();

      expect(runs.value).toEqual([]);
      expect(hasMoreRuns.value).toBe(false);
    });
    scope.stop();
  });

  it('prevents stale updates on overlapping requests', async () => {
    let resolveFirst: any;
    let resolveSecond: any;

    const firstPromise = new Promise(r => { resolveFirst = r; });
    const secondPromise = new Promise(r => { resolveSecond = r; });

    mockFetchJobRuns
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    await scope.run(async () => {
      const { loadRuns, runs } = useJobRuns(jobNameRef as Ref<string | undefined>);

      const req1 = loadRuns();
      const req2 = loadRuns();

      // Resolve second request first
      resolveSecond([{ jobRunId: '2' }]);
      await req2;
      expect(runs.value).toEqual([{ jobRunId: '2' }]);

      // Resolve first request later, it should be ignored
      resolveFirst([{ jobRunId: '1' }]);
      await req1;
      expect(runs.value).toEqual([{ jobRunId: '2' }]);
    });
    scope.stop();
  });

  it('cancels pending requests on scope dispose', async () => {
    let resolveReq: any;
    const reqPromise = new Promise(r => { resolveReq = r; });
    mockFetchJobRuns.mockReturnValueOnce(reqPromise);

    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    let runsRef: any;
    const promise = scope.run(async () => {
      const { loadRuns, runs } = useJobRuns(jobNameRef as Ref<string | undefined>);
      runsRef = runs;
      return loadRuns();
    });

    // Dispose scope before request resolves
    scope.stop();
    resolveReq([{ jobRunId: '1' }]);

    await promise;
    expect(runsRef.value).toEqual([]);
  });

  it('clears pinned run and reloads', async () => {
    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    await scope.run(async () => {
      const { pinnedRunId, clearPinnedRun } = useJobRuns(jobNameRef as Ref<string | undefined>);
      pinnedRunId.value = '123';

      await clearPinnedRun();

      expect(pinnedRunId.value).toBe('');
      expect(mockFetchJobRuns).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });

  it('resets state when job identity changes, resolving only the new job', async () => {
    let resolveA: any;
    let resolveB: any;

    const promiseA = new Promise(r => { resolveA = r; });
    const promiseB = new Promise(r => { resolveB = r; });

    mockFetchJobRuns
      .mockReturnValueOnce(promiseA)
      .mockReturnValueOnce(promiseB);

    const jobNameRef = ref('JobA');
    const scope = effectScope();

    await scope.run(async () => {
      const { loadRuns, reset, runs, isRunsLoading } = useJobRuns(jobNameRef as Ref<string | undefined>);

      // Start load for JobA
      const reqA = loadRuns();

      // Job identity changes
      jobNameRef.value = 'JobB';
      reset();
      expect(runs.value).toEqual([]);
      expect(isRunsLoading.value).toBe(false);

      // Start load for JobB
      const reqB = loadRuns();

      // JobB resolves first
      resolveB([{ jobRunId: 'B-1' }]);
      await reqB;
      expect(runs.value).toEqual([{ jobRunId: 'B-1' }]);

      // JobA resolves last, should be ignored
      resolveA([{ jobRunId: 'A-1' }]);
      await reqA;

      // State should still reflect JobB
      expect(runs.value).toEqual([{ jobRunId: 'B-1' }]);
    });
    scope.stop();
  });

  it('prevents load-more overlap', async () => {
    let resolveFirst: any;
    const promiseFirst = new Promise(r => { resolveFirst = r; });

    mockFetchJobRuns.mockReturnValueOnce(promiseFirst);

    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    await scope.run(async () => {
      const { loadMoreRuns, isLoadingMore } = useJobRuns(jobNameRef as Ref<string | undefined>);

      const mockEvent1 = { target: { complete: vi.fn() } };
      const req1 = loadMoreRuns(mockEvent1);
      expect(isLoadingMore.value).toBe(true);

      const mockEvent2 = { target: { complete: vi.fn() } };
      const req2 = loadMoreRuns(mockEvent2); // Overlapping call

      // Event complete should be called immediately for overlapping call
      expect(mockEvent2.target.complete).toHaveBeenCalled();

      // Resolve the first request
      resolveFirst([{ jobRunId: '1' }]);
      await req1;
      await req2;

      expect(isLoadingMore.value).toBe(false);
      expect(mockEvent1.target.complete).toHaveBeenCalled();

      // Fetch was only called once
      expect(mockFetchJobRuns).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });
});
