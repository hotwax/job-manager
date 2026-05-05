import Papa from 'papaparse'

const getQueueType = (priority: any) => {
  return priority > 6 ? "Priority" : "Normal"
}

const getStatusDesc = (statusId: string) => {
  const statusDesc: Record<string, string> = {
    "DmlsCancelled": "Cancelled",
    "DmlsCrashed": "Crashed",
    "DmlsFailed": "Failed",
    "DmlsFinished": "Finished",
    "DmlsPending": "Pending",
    "DmlsQueued": "Queued",
    "DmlsRunning": "Running"
  }

  return statusDesc[statusId] || statusId
}

export {
  getQueueType,
  getStatusDesc
}