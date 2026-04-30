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

const parseCsv = async (file: File, options?: any) => {
  return new Promise ((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results: any) {
        if (results.errors.length) {
          reject(results.error)
        } else {
          resolve(results.data)
        }
      },
      ...options
    });
  })
}

export {
  getQueueType,
  getStatusDesc,
  parseCsv
}