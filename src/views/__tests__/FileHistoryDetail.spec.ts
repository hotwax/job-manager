import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import FileHistoryDetail from '../FileHistoryDetail.vue'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useMdmConfigStore } from '@/store/mdmConfig'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { id: '123' } })
}))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

let enterView: () => void | Promise<void>;
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...await importOriginal<typeof import('@ionic/vue')>(),
  onIonViewWillEnter: (callback: () => void | Promise<void>) => { enterView = callback; }
}))
enableAutoUnmount(afterEach);

describe('FileHistoryDetail lazy error payloads', () => {
  let pinia: ReturnType<typeof createPinia>;
  let mdmStore: ReturnType<typeof useMdmConfigStore>;
  const original = '{"test":"original"}';
  const error = '{"error":"first"}';
  const log = {
    configId: 'config123', logContentId: 'content-123', fileName: 'test.json',
    errorLogContentId: 'error-content-123', errorFileName: 'test-error.json', failedRecordCount: 5
  };
  beforeEach(() => {
    vi.resetAllMocks();
    enterView = () => { throw new Error('View did not register its entry hook'); };
    pinia = createPinia();
    mdmStore = useMdmConfigStore(pinia);
    mdmStore.fetchConfigs = vi.fn();
    mdmStore.fetchDataManagerLogById = vi.fn().mockResolvedValue(log);
    mdmStore.fetchDataManagerFileContent = vi.fn().mockImplementation((_configId, contentId) =>
      Promise.resolve({ text: contentId === log.errorLogContentId ? error : original })
    );
  });
  const mountComponent = async () => {
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
    await enterView();
    await flushPromises();
    // Vue Test Utils exposes setup state at runtime; it is private in Vue's public type.
    return wrapper.vm as unknown as {
      selectedPayload: 'original' | 'errors' | 'parameters';
      payloads: Record<'original' | 'errors', { rawText: string }>;
      errorPayloadLoading: boolean;
    };
  };
  function defer<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => { resolve = res; });
    return { promise, resolve };
  }

  it('fetches only the original on entry and caches errors after selecting their tab', async () => {
    const view = await mountComponent();
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenCalledTimes(1);
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenLastCalledWith('config123', 'content-123');
    expect(view.payloads.original.rawText).toBe(original);
    expect(view.payloads.errors.rawText).toBe('');
    view.selectedPayload = 'errors';
    await flushPromises();
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenCalledTimes(2);
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenLastCalledWith('config123', 'error-content-123');
    expect(view.payloads.errors.rawText).toBe(error);
    view.selectedPayload = 'original';
    await nextTick();
    view.selectedPayload = 'errors';
    await flushPromises();
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenCalledTimes(2);
  });

  it('shares an in-flight error request while preserving the original payload', async () => {
    const pending = defer<{ text: string }>();
    vi.mocked(mdmStore.fetchDataManagerFileContent)
      .mockResolvedValueOnce({ text: original }).mockReturnValueOnce(pending.promise);
    const view = await mountComponent();
    view.selectedPayload = 'errors';
    await nextTick();
    expect(view.errorPayloadLoading).toBe(true);
    view.selectedPayload = 'original';
    await nextTick();
    expect(view.payloads.original.rawText).toBe(original);
    view.selectedPayload = 'errors';
    await nextTick();
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenCalledTimes(2);
    pending.resolve({ text: error });
    await flushPromises();
    expect(view.payloads.errors.rawText).toBe(error);
    expect(view.errorPayloadLoading).toBe(false);
  });

  it('keeps the original intact when the store returns no error content', async () => {
    vi.mocked(mdmStore.fetchDataManagerFileContent)
      .mockResolvedValueOnce({ text: original }).mockResolvedValueOnce(null);
    const view = await mountComponent();
    view.selectedPayload = 'errors';
    await flushPromises();
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenCalledTimes(2);
    expect(view.payloads.original.rawText).toBe(original);
    expect(view.payloads.errors.rawText).toBe('');
    expect(view.errorPayloadLoading).toBe(false);
  });

  it('allows reopening errors to retry an unexpected rejected request', async () => {
    vi.mocked(mdmStore.fetchDataManagerFileContent)
      .mockResolvedValueOnce({ text: original })
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ text: error });
    const view = await mountComponent();
    view.selectedPayload = 'errors';
    await flushPromises();
    expect(view.errorPayloadLoading).toBe(false);
    view.selectedPayload = 'original';
    await nextTick();
    view.selectedPayload = 'errors';
    await flushPromises();
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenCalledTimes(3);
    expect(view.payloads.errors.rawText).toBe(error);
  });

  it('ignores old error content after entering a fresh log scope', async () => {
    const pending = defer<{ text: string }>();
    vi.mocked(mdmStore.fetchDataManagerFileContent)
      .mockResolvedValueOnce({ text: original })
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ text: '{"test":"second"}' })
      .mockResolvedValueOnce({ text: '{"error":"second"}' });
    const view = await mountComponent();
    view.selectedPayload = 'errors';
    await nextTick();
    vi.mocked(mdmStore.fetchDataManagerLogById).mockResolvedValue({
      ...log, configId: 'config456', logContentId: 'content-456', errorLogContentId: 'error-content-456'
    });
    await enterView();
    await flushPromises();
    pending.resolve({ text: error });
    await flushPromises();
    expect(view.payloads.original.rawText).toBe('{"test":"second"}');
    expect(view.payloads.errors.rawText).toBe('');
    expect(view.errorPayloadLoading).toBe(false);
    view.selectedPayload = 'errors';
    await flushPromises();
    expect(mdmStore.fetchDataManagerFileContent).toHaveBeenLastCalledWith('config456', 'error-content-456');
    expect(view.payloads.errors.rawText).toBe('{"error":"second"}');
  });
})
