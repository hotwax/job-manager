import { vi } from "vitest";

export const commonApiMock = vi.fn();

type CommonMockOptions = {
  api?: ReturnType<typeof vi.fn>;
  commonUtil?: Record<string, unknown>;
};

export const createCommonMock = ({ api = commonApiMock.mockResolvedValue({
  data: {
    entityDefinition: {
      fields: [],
      relationships: []
    }
  }
}), commonUtil = {} }: CommonMockOptions = {}) => {
  const cookies = {
    get: vi.fn().mockReturnValue(""),
    set: vi.fn(),
    remove: vi.fn()
  };

  return {
    api,
    axios: {},
    client: {},
    commonUtil: {
      getMaargURL: vi.fn(),
      getOmsURL: vi.fn(),
      getStatusColor: vi.fn(),
      getTokenExpiration: vi.fn(),
      goToOms: vi.fn(),
      hasError: vi.fn(() => false),
      isAppEmbedded: vi.fn(() => false),
      isMoqui: vi.fn(() => false),
      showToast: vi.fn(),
      ...commonUtil
    },
    cookieHelper: vi.fn(() => cookies),
    emitter: {
      emit: vi.fn(),
      off: vi.fn(),
      on: vi.fn()
    },
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    },
    translate: (key: string) => key
  };
};
