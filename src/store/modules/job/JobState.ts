export default interface JobState {
    cached: any;
    pending: {
      list: any,
      total: 0
    }
    temporalExp: any;
    enumIds: any;
}