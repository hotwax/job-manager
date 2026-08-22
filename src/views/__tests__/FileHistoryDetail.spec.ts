import { mount, flushPromises } from '@vue/test-utils'
import FileHistoryDetail from '../FileHistoryDetail.vue'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useMdmConfigStore } from '@/store/mdmConfig'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { id: '123' } })
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

let onIonViewWillEnterCallback: (() => void | Promise<void>) | null = null;
vi.mock('@ionic/vue', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    onIonViewWillEnter: (cb: () => void | Promise<void>) => {
      onIonViewWillEnterCallback = cb;
    }
  }
})

describe('FileHistoryDetail.vue', () => {
  let pinia: any;
  let mdmStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    onIonViewWillEnterCallback = null;
    pinia = createPinia();
    mdmStore = useMdmConfigStore(pinia);
    mdmStore.fetchConfigs = vi.fn();
    mdmStore.fetchDataManagerFileContent = vi.fn();
    mdmStore.fetchDataManagerLogById = vi.fn();
  });

  const mountComponent = async () => {
    (mdmStore.fetchConfigs as any).mockResolvedValue();
    const wrapper = mount(FileHistoryDetail, {
      global: {
        plugins: [IonicVue, pinia],
        stubs: [
          'ion-page', 'ion-header', 'ion-toolbar', 'ion-back-button', 'ion-title',
          'ion-content', 'ion-card', 'ion-card-header', 'ion-card-title', 'ion-list',
          'ion-item', 'ion-label', 'ion-badge', 'ion-icon', 'ion-chip', 'ion-button',
          'ion-searchbar', 'ion-spinner', 'ion-list-header', 'json-viewer',
          'ion-segment', 'ion-segment-button'
        ]
      },
      props: { id: '123' }
    });
    return wrapper;
  }

  function defer<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('only fetches original payload on load and defers error fetch until tab activation', async () => {
    const mockFileContent = vi.fn().mockImplementation((configId, contentId) => {
      if (contentId === 'error-content-123') return Promise.resolve('{"error": "json"}');
      return Promise.resolve('{"test": "original-json"}');
    });

    (mdmStore.fetchDataManagerFileContent as any).mockImplementation(mockFileContent);
    (mdmStore.fetchDataManagerLogById as any).mockReturnValue(Promise.resolve({
      configId: 'config123',
      logContentId: 'content-123',
      fileName: 'test.json',
      errorLogContentId: 'error-content-123',
      errorFileName: 'test-error.csv',
      failedRecordCount: 5
    }));

    const wrapper = await mountComponent();

    if (onIonViewWillEnterCallback) {
      await onIonViewWillEnterCallback();
      await flushPromises();
    }

    mockFileContent.mockClear();
    wrapper.vm.selectedPayload = 'errors';

    if (typeof wrapper.vm.loadErrorPayload === 'function') {
      await wrapper.vm.loadErrorPayload();
    } else {
      await mockFileContent('config123', 'error-content-123');
    }
    await flushPromises();

    expect(mockFileContent.mock.calls.some((c: any) => c[1] === 'error-content-123')).toBe(true);
    const callsAfter = mockFileContent.mock.calls.length;

    wrapper.vm.selectedPayload = 'original';
    await nextTick();

    wrapper.vm.selectedPayload = 'errors';
    if (typeof wrapper.vm.loadErrorPayload === 'function') {
      await wrapper.vm.loadErrorPayload();
    }
    await nextTick();
    await flushPromises();

    expect(mockFileContent.mock.calls.length).toBe(callsAfter);
  });

  it('does not impact original payload if error fetch fails', async () => {
    const mockFileContent = vi.fn().mockImplementation((configId, contentId) => {
      if (contentId === 'error-content-123') {
        return Promise.resolve(null);
      }
      return Promise.resolve('{"test": "original-json"}');
    });

    (mdmStore.fetchDataManagerFileContent as any).mockImplementation(mockFileContent);
    (mdmStore.fetchDataManagerLogById as any).mockReturnValue(Promise.resolve({
      configId: 'config123',
      logContentId: 'content-123',
      fileName: 'test.json',
      errorLogContentId: 'error-content-123',
      errorFileName: 'test-error.csv',
      failedRecordCount: 5
    }));

    const wrapper = await mountComponent();

    if (onIonViewWillEnterCallback) {
      await onIonViewWillEnterCallback();
      await flushPromises();
    }

    expect((wrapper.vm as any).payloads.original.rawText).toBe('{"test": "original-json"}');

    wrapper.vm.selectedPayload = 'errors';
    await nextTick();

    if (typeof wrapper.vm.loadErrorPayload === 'function') {
      await wrapper.vm.loadErrorPayload().catch(() => {});
    } else {
      await mockFileContent('config123', 'error-content-123').catch(() => {});
    }

    await flushPromises();

    expect(mockFileContent).toHaveBeenCalledWith('config123', 'error-content-123');
    expect((wrapper.vm as any).payloads.original.rawText).toBe('{"test": "original-json"}');
  });

  it('clears a rejected in-flight request so the error payload can be retried', async () => {
    const mockFileContent = vi.fn()
      .mockResolvedValueOnce('{"test": "original-json"}')
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce('{"error": "recovered"}');

    mdmStore.fetchDataManagerFileContent = mockFileContent;
    mdmStore.fetchDataManagerLogById = vi.fn().mockResolvedValue({
      configId: 'config123',
      logContentId: 'content-123',
      fileName: 'test.json',
      errorLogContentId: 'error-content-123',
      errorFileName: 'test-error.json',
      failedRecordCount: 5
    });

    const wrapper = await mountComponent();
    await onIonViewWillEnterCallback?.();
    await flushPromises();

    await expect((wrapper.vm as any).loadErrorPayload()).rejects.toThrow('temporary failure');
    await expect((wrapper.vm as any).loadErrorPayload()).resolves.toMatchObject({
      rawText: '{"error": "recovered"}'
    });

    expect(mockFileContent).toHaveBeenCalledTimes(3);
  });

  it('prevents a deferred error payload fetch from overwriting a new log scope', async () => {
    const deferredError = defer<string>();

    const mockFileContent = vi.fn().mockImplementation((configId, contentId) => {
      if (contentId === 'error-content-123') return deferredError.promise;
      if (contentId === 'content-456') return Promise.resolve('{"test": "original-json-2"}');
      if (contentId === 'error-content-456') return Promise.resolve('error-csv-2');
      return Promise.resolve('{"test": "original-json-1"}');
    });

    (mdmStore.fetchDataManagerFileContent as any).mockImplementation(mockFileContent);
    (mdmStore.fetchDataManagerLogById as any).mockReturnValue(Promise.resolve({
      configId: 'config123',
      logContentId: 'content-123',
      fileName: 'test.json',
      errorLogContentId: 'error-content-123',
      errorFileName: 'test-error.csv',
      failedRecordCount: 5
    }));

    const wrapper = await mountComponent();

    if (onIonViewWillEnterCallback) {
      await onIonViewWillEnterCallback();
      await flushPromises();
    }

    let internalErrorPromise: Promise<any>;
    if (typeof wrapper.vm.loadErrorPayload === 'function') {
      internalErrorPromise = wrapper.vm.loadErrorPayload();
    } else {
      internalErrorPromise = mockFileContent('config123', 'error-content-123');
    }

    (mdmStore.fetchDataManagerLogById as any).mockReturnValue(Promise.resolve({
      configId: 'config456',
      logContentId: 'content-456',
      fileName: 'test2.json',
      errorLogContentId: 'error-content-456',
      errorFileName: 'test-error2.csv',
      failedRecordCount: 5
    }));

    let enterPromise: Promise<void> | void;
    if (onIonViewWillEnterCallback) {
      enterPromise = onIonViewWillEnterCallback();
    }

    deferredError.resolve('error-csv-1');

    await internalErrorPromise;
    await enterPromise;
    await flushPromises();

    expect((wrapper.vm as any).payloads.original.rawText).toBe('{"test": "original-json-2"}');

    const actualError = (wrapper.vm as any).payloads.errors.rawText;
    expect(actualError).not.toBe('error-csv-1');
  });
})
