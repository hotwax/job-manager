import saveAs from "file-saver";
import { toastController } from '@ionic/vue';
import Papa from 'papaparse'
import { DateTime, Duration } from "luxon";
import logger from "@/logger";
import { cookieHelper, translate } from "@common";
import {Clipboard} from "@capacitor/clipboard";
import cronstrue from "cronstrue"
import { useUtilStore } from "@/store/util";
import { useUserStore } from "@/store/user";
import { useDataDocumentStore } from "@/store/dataDocuments";

const showToast = async (message: string) => {
  const toast = await toastController
    .create({
      message,
      duration: 3000,
      position: 'bottom',
    })
  return toast.present();
}

// Here we have created a JsonToCsvOption which contains the properties which we can pass to jsonToCsv function

export interface JsonToCsvOption {
  parse?: object | null;
  encode?: object | null;
  name?: string;
  download?: boolean;
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { setZone: true}).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

// defined this method as we need to convert values to string for trimming and correctly parse the data
const convertToString = (parameter: any) => {
  const value = parameter.value;

  if(!value) {
    return ''
  }

  try {
    if(parameter.type === 'Map' || parameter.type === 'List' || parameter.type === 'Object') {
      return JSON.stringify(value)
    } else if(parameter.type === 'String') {
      return value
    } else {
      return '' + value;
    }
  } catch {
    logger.error('Unable to parse the defined value', value)
    return value;
  }
}

// converts the entered value to the expected type used by the service
const convertValue = (parameter: any) => {
  const value = parameter.value.toString().trim();

  if(!value) {
    return ''
  }

  // TODO: add support to convert timestamp and double
  try {
    if(parameter.type === 'Map' || parameter.type === 'List' || parameter.type === 'Object') {
      return JSON.parse(value)
    } else if(parameter.type === 'String' || parameter.type === 'Date' || parameter.type === 'Time') {
      return value
    } else {
      return JSON.parse(value);
    }
  } catch {
    logger.error('Unable to parse the defined value', value)
    return value;
  }
}

const hasJobDataError = (job: any) => {
  let warning = '';
  let message = '';

  if (job?.serviceName === '_NA_') {
    warning = `${job.systemJobEnumId} :: This job does not have any service data configuration.`;
    message = 'This job does not have any service data configuration.';
  } else if (job?.runtimeData?._ERROR_MESSAGE_) {
    warning = `${job.systemJobEnumId}(${job.serviceName}) has runtimeData error :: ${job.runtimeData._ERROR_MESSAGE_}`;
    message = 'This job does not have any runtime data configuration.';
  }

  if(message) {
    logger.warn(warning);
    showToast(translate(message));
    return true;
  }
  return false;
}

const saveDataFile = async (response: any, fileName: string) => {
  let data;

  if (response instanceof Blob) {
    saveAs(response, fileName);
    return;
  }

  if (typeof response === 'object') {
    data = JSON.stringify(response)
  } else {
    data = response
  }

  const blob = new Blob([data], {type: "text/plain;charset=utf-8"})
  saveAs(blob, fileName);
}

const extractExportFilename = (message: any) => {
  if(message?.messageText) {
    const parts = message.messageText.split("/")
    return parts[parts.length - 1] || ""
  }
  return ""
}

// The export endpoint returns JSON shaped as { csvData: "..." }, not a file stream
const downloadDataDocumentExport = async (message: any) => {
  try {
    const resp = await useDataDocumentStore().downloadExport(message.systemMessageId);
    const csvData = resp?.data?.csvData;
    if(!csvData) {
      showToast(translate("Failed to download linked file."));
      return;
    }
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, extractExportFilename(message) || `${message.systemMessageId}.csv`);
  } catch (error) {
    showToast(translate("Failed to download linked file."));
  }
}

// Map a Data Document export SystemMessage to a friendly status. The export send never
// reaches SmsgError — a failure is a message stuck in SmsgProduced with failCount > 0
// (no errorSummary/recordCount are populated). Success is SmsgSent with a .csv messageText.
const getExportStatus = (message: any) => {
  const statusId = message?.statusId;
  const failed = statusId === "SmsgError" || (statusId === "SmsgProduced" && Number(message?.failCount) > 0);
  if (failed) return { key: "failed", label: "Failed", color: "danger" };
  if (statusId === "SmsgSent") return { key: "ready", label: "Ready", color: "success" };
  if (statusId === "SmsgSending") return { key: "sending", label: "Sending", color: "warning" };
  if (statusId === "SmsgProduced" || statusId === "SmsgCreated") return { key: "processing", label: "Processing", color: "warning" };
  return { key: "unknown", label: statusId || "-", color: "medium" };
};

const isExportTerminal = (message: any) => {
  const key = getExportStatus(message).key;
  return key === "ready" || key === "failed";
};

function getDateAndTime(time: any) {
  if (!time) return "-";
  
  let dt = typeof time === "number" ? DateTime.fromMillis(time) : DateTime.fromFormat(time, 'yyyy-MM-dd HH:mm:ss.SSS');
  if (!dt.isValid) dt = DateTime.fromSQL(time);
  if (!dt.isValid) dt = DateTime.fromISO(time);

  return dt.isValid ? dt.toLocaleString({ ...DateTime.DATETIME_MED, hourCycle: "h12" }) : time.toString();
}

function timeTillRun(endTime: any) {
  if (!endTime) return "-";

  let dt = typeof endTime === "number" ? DateTime.fromMillis(endTime) : DateTime.fromFormat(endTime, 'yyyy-MM-dd HH:mm:ss.SSS');
  if (!dt.isValid) dt = DateTime.fromSQL(endTime);
  if (!dt.isValid) dt = DateTime.fromISO(endTime);

  if (!dt.isValid) return "-";

  const timeDiff = dt.diff(DateTime.local());
  return DateTime.local().plus(timeDiff).toRelative();
}

function getCronString(cronExpression: any) {
  try {
    return cronstrue.toString(cronExpression)
  } catch(e) {
    logger.error(e)
    return ""
  }
}

const getFileSize = (size: string) => {
  return size ? `${(Number(size) / (1024 * 1024)).toFixed(3)} MB` : "-"
}

const getDuration = (start: number, end: number) => {
  const diff = end - start;
  if (diff < 0) return "-";
  const duration = Duration.fromMillis(diff).shiftTo("minutes", "seconds");
  const minutes = duration.minutes;
  const seconds = Math.floor(duration.seconds);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

const isAppCompatible = () => {
  const currentVersion = useUtilStore().systemInformation?.instanceInfo?.componentRelease;
  const requiredVersion = import.meta.env.VITE_MAARG_COMPATIBLE_VERSION;
  
  // If no compatibility requirement is configured or current version is not available, allow access by default
  if(!requiredVersion || !currentVersion) return true;
  
  const currentParts = currentVersion.split('.');
  const requiredParts = requiredVersion.split('.');

  // In all the cases the release will have a version split in 3 parts, and if instance is on some
  // custom branch then in that case it will have a single part and thus assuming
  // its on custom branch and allow accessing new app
  if(currentParts.length < 3) return true;

  // There might be cases when the version in api has a `v` prefixed with it
  currentParts[0] = currentParts[0].replace("v", "")
  
  for(let i = 0; i < 3; i++) {
    const part1 = Number(currentParts[i]) || 0;
    const part2 = Number(requiredParts[i]) || 0;
    if(part1 >= part2) return true;
    if(part1 < part2) return false;
  }
  return false;
}

const redirectToLegacyApp = () => {
  const oms = useUserStore().oms
  const token = cookieHelper().get("token")!
  const expirationTime = cookieHelper().get("expirationTime")!
  const maarg = decodeURIComponent(cookieHelper().get("maarg")!)
  const link = import.meta.env.VITE_LEGACY_APP_URL
  window.location.href = link.replace("{oms}", oms).replace("{token}", token).replace("{expirationTime}", expirationTime).replace("{omsRedirectionUrl}", maarg)
}

// Data manager log status groups, shared so a dashboard count and the list it
// drills into cannot disagree about what the count meant.
const MDM_PENDING_STATUSES = ["DmlsPending", "DmlsQueued", "DmlsRunning"];
const MDM_FAILED_STATUSES = ["DmlsCrashed", "DmlsFailed"];

// A file import counts as errored when it crashed outright or carries rejected
// records, whatever stage it reached.
// Not every import arrives as an upload. RESTlet-backed configs record the payload at
// contentLocation and never set fileName, so a row keyed off fileName alone renders blank.
// Fall back to the basename of the stored path, then the error file, then the script title,
// so an import always names itself.
const getLogFileName = (log: any) => {
  if(log?.fileName) {
    return log.fileName;
  }

  const fromLocation = String(log?.contentLocation || "").split("/").pop();

  return fromLocation || log?.errorFileName || log?.scriptTitle || "";
};

const hasFailedRecords = (log: any) => MDM_FAILED_STATUSES.includes(log?.statusId) || Number(log?.failedRecordCount || 0) > 0;

// A message counts as errored when it failed outright, or is still sitting produced with
// failed delivery attempts behind it. Shared so a dashboard count and the list it links to
// can never disagree about what "error" means.
const hasSystemMessageError = (msg: any) =>
  msg?.statusId === "SmsgError" || (msg?.statusId === "SmsgProduced" && Number(msg?.failCount || 0) > 0);

const getTimeInMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const isoDateTime = DateTime.fromISO(value);
  if (isoDateTime.isValid) return isoDateTime.toMillis();
  const sqlDateTime = DateTime.fromSQL(value);
  return sqlDateTime.isValid ? sqlDateTime.toMillis() : 0;
};

// The Shopify Admin API app a shop talks through. A shop can be mapped to several
// SystemMessageRemote rows and only purposeTypeId separates them, so the purpose has to be
// part of the lookup rather than taking whichever row comes first.
const SHOP_REMOTE_DEFAULT_APP_PURPOSE = "SsctShopifyDefaultApp";

/**
 * Reads a shop's default-app remote id out of the shopRemotes detail that the ShopifyShop
 * master nests into the shops response.
 *
 * @param shop - A shop row from the shops endpoint.
 * @returns The mapped systemMessageRemoteId, or "" when the shop has no default-app mapping.
 */
const getShopDefaultAppRemoteId = (shop: any): string =>
  (shop?.shopRemotes || []).find((remote: any) => remote.purposeTypeId === SHOP_REMOTE_DEFAULT_APP_PURPOSE)?.systemMessageRemoteId || "";

export {
  downloadDataDocumentExport,
  getExportStatus,
  isExportTerminal,
  getCronString,
  getDateAndTime,
  handleDateTimeInput,
  hasJobDataError,
  isAppCompatible,
  redirectToLegacyApp,
  showToast,
  saveDataFile,
  timeTillRun,
  getDuration,
  getFileSize,
  getLogFileName,
  getShopDefaultAppRemoteId,
  getTimeInMillis,
  hasFailedRecords,
  hasSystemMessageError,
  MDM_FAILED_STATUSES,
  MDM_PENDING_STATUSES
}
