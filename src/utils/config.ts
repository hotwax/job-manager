const getQueueType = (priority: any) => {
  return priority > 6 ? "Priority" : "Normal"
}

export {
  getQueueType
}