import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useJobRuns } from './useJobRuns';
import { ref, effectScope } from 'vue';

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

  it('initializes with default state', () => {
    const jobNameRef = ref('TestJob');
    const scope = effectScope();
    scope.run(() => {
      const { runs, isRunsLoading, hasLoadedRuns, hasMoreRuns } = useJobRuns(jobNameRef);
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

    await new Promise<void>((resolve) => {
      const scope = effectScope();
      scope.run(async () => {
        const { loadRuns, runs, isRunsLoading, hasLoadedRuns, hasMoreRuns } = useJobRuns(jobNameRef);

        const loadPromise = loadRuns();
        expect(isRunsLoading.value).toBe(true);
        expect(hasLoadedRuns.value).toBe(false);

        await loadPromise;

        expect(runs.value.length).toBe(20);
        expect(isRunsLoading.value).toBe(false);
        expect(hasLoadedRuns.value).toBe(true);
        expect(hasMoreRuns.value).toBe(true); // 20 results indicates maybe more
        resolve();
      });
      scope.stop();
    });
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
      const { loadRuns, loadMoreRuns, runs, hasMoreRuns } = useJobRuns(jobNameRef);

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
      const { loadRuns, runs, hasMoreRuns } = useJobRuns(jobNameRef);

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
      const { loadRuns, runs } = useJobRuns(jobNameRef);

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
    scope.run(() => {
      const { loadRuns, runs } = useJobRuns(jobNameRef);
      runsRef = runs;
      loadRuns();
    });

    // Dispose scope before request resolves
    scope.stop();
    resolveReq([{ jobRunId: '1' }]);

    // Wait for microtasks
    await new Promise(r => setTimeout(r, 0));

    expect(runsRef.value).toEqual([]);
  });

  it('clears pinned run and reloads', async () => {
    const jobNameRef = ref('TestJob');
    const scope = effectScope();

    await scope.run(async () => {
      const { pinnedRunId, clearPinnedRun } = useJobRuns(jobNameRef);
      pinnedRunId.value = '123';

      await clearPinnedRun();

      expect(pinnedRunId.value).toBe('');
      expect(mockFetchJobRuns).toHaveBeenCalledTimes(1);
    });
    scope.stop();
  });
});
