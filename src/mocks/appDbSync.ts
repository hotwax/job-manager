// Fixtures have no worker or live synchronization. Production uses the real module.
export const startAppDbSync = async () => {};
export const stopAppDbSync = async () => {};
export const refreshAfterMutation = async () => {};
export const waitForSeedData = async () => {};
export const ensureAppDbSync = async () => {};

export const resyncDomain = async () => {};
export const resyncReferenceData = async () => {};
export const syncService = { getStatus: async () => ({}), subscribe: () => () => {} };
