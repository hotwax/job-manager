export default interface WebhooksState {
  cached: Object
  key: {
    topic: string,
    list: Array<any>
  }
}