import logger from "@/logger";
import { parseCsv } from '@/utils/config';
import { api } from "@common";
import { ref } from "vue";

export function useMdmLog() {
  const currentLogInfo = ref({} as Record<string, any>)
  const errorLogs = ref([])
  const errorCsvRecords = ref(null) as any

  async function fetchLogDetails(logId: string) {
    try {
      let resp = await api({
        url: "admin/dataManager/details",
        method: "get",
        params: {
          logId
        }
      })

      if(resp.data?.dataManagerLogsCount) {
        currentLogInfo.value = resp.data.dataManagerLogs[0]
      }

      if(currentLogInfo.value.errorLogContentId) {
        await fetchFailedRecords()
      }

      currentLogInfo.value["successRecordCount"] = (Number(currentLogInfo.value.totalRecordCount) || 0) - (Number(currentLogInfo.value.failedRecordCount) || 0)
    } catch(err) {
      logger.error(`Failed to fetch log with id ${logId}`, err)
    }
  }

  async function fetchFailedRecords() {
    try {
      const resp = await api({
        url: "admin/dataManager/downloadDataManagerFile",
        method: "GET",
        params: {
          configId: currentLogInfo.value.configId,
          logContentId: currentLogInfo.value.errorLogContentId
        }
      })

      errorCsvRecords.value = resp?.data?.csvData || resp.data;
      parseCsv(errorCsvRecords.value).then((resp: any) => errorLogs.value = resp)
    } catch(err) {
      logger.error("Failed to download the error records", err)
    }
  }

  return {
    currentLogInfo,
    errorCsvRecords,
    errorLogs,
    fetchFailedRecords,
    fetchLogDetails
  }
}