export default interface WebhookState {
  cached: Object
  key: {
    topic: string,
    list: Array<any>
  }
}