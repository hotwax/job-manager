const getQueueType = (priority: any) => {
  return priority > 7 ? "Priority" : priority > 5 ? "Normal" : "Low"
}
export {
  getQueueType
}