import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { alertCreateMock } = vi.hoisted(() => ({
  alertCreateMock: vi.fn()
}));

vi.mock("@common", async () => {
  const { commonApiMock, createCommonMock } = await import("@/test/commonMock");
  return createCommonMock({ api: commonApiMock });
});

vi.mock("@ionic/vue", () => ({
  alertController: { create: alertCreateMock }
}));

vi.mock("@/utils", () => ({
  showToast: vi.fn()
}));

import { guardUnsavedDataDocumentGraph } from "@/router/dataDocumentGraphLeaveGuard";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { commonApiMock } from "@/test/commonMock";

describe("data document graph leave guard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    alertCreateMock.mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: "save" })
    });
  });

  it("awaits a pending toolbar save without prompting when the route leaves", async () => {
    let releaseSave!: (response: { data: { dataDocumentId: string } }) => void;
    const pendingSave = new Promise<{ data: { dataDocumentId: string } }>((resolve) => {
      releaseSave = resolve;
    });
    commonApiMock.mockImplementation(({ url, method }: { url: string; method: string }) => {
      if (url === "moqui/dataDocuments" && method === "POST") return pendingSave;
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "GuardDocument",
      documentName: "Guard document",
      primaryEntityName: "Product"
    });
    const to = { name: "DataDocumentCatalog", params: {} } as any;
    const from = { name: "DataDocumentGraphBuilder", params: { id: "GuardDocument" } } as any;
    const toolbarSave = store.saveGraph();
    let guardSettled = false;
    const leaveGuard = guardUnsavedDataDocumentGraph(to, from);
    leaveGuard.finally(() => {
      guardSettled = true;
    });

    await vi.waitFor(() => expect(commonApiMock).toHaveBeenCalledTimes(1));
    expect(alertCreateMock).not.toHaveBeenCalled();
    expect(guardSettled).toBe(false);
    releaseSave({ data: { dataDocumentId: "GuardDocument" } });

    await expect(toolbarSave).resolves.toBe("GuardDocument");
    await expect(leaveGuard).resolves.toBe(true);
    expect(commonApiMock.mock.calls.filter(([request]) => request.method === "POST")).toHaveLength(1);
  });
});
