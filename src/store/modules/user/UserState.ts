export default interface UserState {
    token: string;
    current: object | null;
    currentEComStore: object;
    instanceUrl: string;
    shopifyConfig: object;
}