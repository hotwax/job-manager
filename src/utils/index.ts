import saveAs from "file-saver";
import { toastController } from '@ionic/vue';
import Papa from 'papaparse'
import { DateTime } from "luxon";
import logger from "@/logger";
import { translate } from "@common";
import {Clipboard} from "@capacitor/clipboard";
import cronstrue from "cronstrue"

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

  if (typeof response === 'object') {
    data = JSON.stringify(response)
  } else {
    data = response
  }

  const blob = new Blob([data], {type: "text/plain;charset=utf-8"})
  saveAs(blob, fileName);
}

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

export {
  getCronString,
  getDateAndTime,
  handleDateTimeInput,
  hasJobDataError,
  showToast,
  saveDataFile,
  timeTillRun,
  getFileSize
}
