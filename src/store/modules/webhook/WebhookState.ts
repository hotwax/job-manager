export default interface WebhookState {
  cached: any
  key: {
    topic: string,
    list: Array<any>
  }
}