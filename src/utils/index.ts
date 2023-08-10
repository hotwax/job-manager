import saveAs from "file-saver";
import { toastController } from '@ionic/vue';
import Papa from 'papaparse'
import { DateTime } from "luxon";
import logger from "@/logger";

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return typeof response.data != "object" || !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_ || !!response.data.error;
}

const showToast = async (message: string) => {
  const toast = await toastController
    .create({
      message,
      duration: 3000,
      position: 'bottom',
    })
  return toast.present();
}

// Utility for parsing CSV file 
// Package Used : PapaParse (Link to Documentation : https://www.papaparse.com/docs#config)

// In this we will be receiving the file and options in the function 
// and we are returning a promise with results in it 

// We have used the parse method of the papaparse library which will take a config object with File.
// In the config object we have passed various keys:
//   - header : It tells papaparse that there will be a header in the CSV. 
//   - skipEmptyLines : It will ignore any empty lines in the CSV.
//   - complete : A parse result always contains three objects: data, errors, and meta. 
//     data and errors are arrays, and meta is an object. In the step callback, the data 
//     array will only contain one element.

// Also, we have passed options, as if user wants to add some more properties to the method 
// or if he want to modify some pre-build keys then he can do so.

// Types of Responses

// CSV FILE :
// columnA,columnB,columnC
// "Susan",41,a
// "Mike",5,b
// "Jake",33,c
// "Jill",30,d

// For (header:true) we get
// [{columnA: 'Susan', columnB: '41', columnC: 'a'},
// {columnA: 'Mike', columnB: '5', columnC: 'b'},
// {columnA: 'Jake', columnB: '33', columnC: 'c'},
// {columnA: 'Jill', columnB: '30', columnC: 'd'}]

// // For (header:false) we get
// [['columnA', 'columnB', 'columnC'],
// ['Susan', '41', 'a'],
// ['Mike', '5', 'b'],
// ['Jake', '33', 'c'],
// ['Jill', '30', 'd']]

const parseCsv = async (file: File, options: any) => {
  return new Promise ((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: function (results: any) {
        if (results.errors.length) {
          reject(results.error)
        } else {
          resolve(results)
        }
      },
      ...options
    });
  })
}

// Here we have created a JsonToCsvOption which contains the properties which we can pass to jsonToCsv function

interface JsonToCsvOption {
  parse?: object | null;
  encode?: object | null;
  name?: string;
  download?: boolean;
}

// Utility for converting Javascript Object into blob and download it as Csv
// Package Used : PapaParse (Link to Documentation : https://www.papaparse.com/docs#config)
//                file-saver (Link to Documentation : https://www.npmjs.com/package/file-saver)

// In this we will be receiving a Javascript object and options in the function and we will be 
// returning a blob object 

// We have used a unparse method of papaparse library for converting javascript object into csv file,
// and in addition to this we are using saveAs method to download our blob file
// In the options we will be passing various keys:
//     parse: In this we will be passing a object which contains various properties (headers,skipEmptyLines) to be passed in unparse method
//     encode: In this we will be passing a object which contains various properties related to the encoding like { type }
//     name: In this we will provide a name by which we want to download the csv File, and it is necessary to provide the .csv in the name
//     download: In this we will provide a value which will decide whether we want to download the file or not

const jsonToCsv = (file: any, options: JsonToCsvOption = {}) => {
  const csv = Papa.unparse(file, {
    ...options.parse
  });
  const encoding = {
    type: String,
    default: "utf-8",
    ...options.encode
  };
  const blob = new Blob([csv], {
    type: "application/csvcharset=" + encoding 
  });
  if (options.download) {
    saveAs(blob, options.name ? options.name : "default.csv");
  }
  return blob; 
}

// returns false if the time passed is of past, otherwise true
const isFutureDate = (time: any) => {
  return DateTime.fromMillis(time).diff(DateTime.local()).milliseconds > 0;
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { setZone: true}).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

const prepareRuntime = (job: any) => {
  // For job frequency everyday, set to start of next day
  // It is not recommended to schedule all jobs at the start of the day as it will cause performance issues if too many jobs scheduled at the same time,
  // understanding the risk and assuming that only limited jobs will be scheduled, we are moving ahead as per the recommendation of Aditya P.
  if (job.jobStatus === 'EVERYDAY') {
    return DateTime.now().startOf('day').plus({days: 1}).toMillis();
  }
}

const generateAllowedFrequencies = (type?: string) => {
  const optionDefault = [{
      "id": "EVERY_5_MIN",
      "description": "Every 5 minutes"
    },{
      "id": "EVERY_15_MIN",
      "description": "Every 15 minutes"
    },{
      "id": "EVERY_30_MIN",
      "description": "Every 30 minutes"
    },{
      "id": "HOURLY",
      "description": "Hourly"
    },{
      "id": "EVERY_6_HOUR",
      "description": "Every 6 hours"
    },{
      "id": "EVERYDAY",
      "description": "Every day"
    }
  ]

  const slow = [{
      "id": "HOURLY",
      "description": "Hourly"
    },{
      "id": "EVERY_6_HOUR",
      "description": "Every 6 hours"
    },{
      "id": "EVERYDAY",
      "description": "Every day"
    }
  ]
  return type === 'slow' ? slow : optionDefault;
}

const generateAllowedRunTimes = () => {
  return [{
    "value": 0,
    "label": "Now"
  }, {
    "value": 300000,
    "label": "In 5 minutes"
  }, {
    "value": 900000,
    "label": "In 15 minutes"
  }, {
    "value": 3600000,
    "label": "In an hour"
  }, {
    "value": 86400000,
    "label": "Tomorrow"
  }, {
    "value": "CUSTOM",
    "label": "Custom"
  }]
}

// converts the entered value to the expected type used by the service
const convertValue = (parameter: any) => {
  const value = parameter.value.trim();

  if(!value) {
    return ''
  }

  // TODO: add support to convert timestamp and double
  try {
    if(parameter.type === 'Map' || parameter.type === 'List' || parameter.type === 'Object') {
      return JSON.parse(JSON.stringify(value))
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

const isCustomRunTime = (value: number) => {
  return !generateAllowedRunTimes().some((runTime: any) => runTime.value === value)
}

// preparing the parameters for the job, by checking whether the job has supported making
// changes in the custom parameters or not and honoring runTimeData properties as well
const generateJobCustomParameters = (requiredParameters: any, optionalParameters: any, runtimeData: any) => {
  // preparing the custom parameters those needs to passed with the job
  const jobCustomParameters = {} as any;
  const jobRuntimeData = runtimeData ? JSON.parse(JSON.stringify(runtimeData)) : {} // deep cloning the runtimeData as to avoid side effects in the original data

  // assigning '' (empty string) to all the runtimeData properties whose value is "null"
  Object.keys(jobRuntimeData).map((key: any) => {
    if (jobRuntimeData[key] === 'null' ) jobCustomParameters[key] = ''
    else jobCustomParameters[key] = jobRuntimeData[key] // not converting runtimeData value as the value in runtimeData will be in correct format
  })

  requiredParameters.map((parameter: any) => {
    jobCustomParameters[parameter.name] = convertValue(parameter)
  })

  optionalParameters.map((parameter: any) => {
    // added this check to not show those optional params in the configuration card whose value is left empty in the parameter modal
    if(parameter.value.trim()) {
      jobCustomParameters[parameter.name] = convertValue(parameter)
    }
  })
  return jobCustomParameters;
}

const generateJobCustomOptions = (job: any) => {
  let inputParameters = job?.serviceInParams ? JSON.parse(JSON.stringify(job?.serviceInParams)) : []
  const optionalParameters: Array<any> = [];
  const requiredParameters: Array<any> = [];

  // removing some fields that we don't want user to edit, and for which the values will be added programatically
  const excludeParameters = ['productStoreId', 'shopId', 'shopifyConfigId']
  inputParameters = inputParameters.filter((parameter: any) =>!excludeParameters.includes(parameter.name))

  inputParameters.map((parameter: any) => {
    if(parameter.optional) {
      optionalParameters.push({
        name: parameter.name,
        value: job?.runtimeData && job?.runtimeData[parameter.name] && job?.runtimeData[parameter.name] !== 'null' ? '' + job?.runtimeData[parameter.name] : '',   // added check for null as we don't want to pass null as a value in the params
        type: parameter.type
      })
    } else {
      requiredParameters.push({
        name: parameter.name,
        value: job?.runtimeData && job?.runtimeData[parameter.name] && job?.runtimeData[parameter.name] !== 'null' ? '' + job?.runtimeData[parameter.name] : '',   // added check for null as we don't want to pass null as a value in the params
        type: parameter.type
      })
    }
  })

  return {
    optionalParameters,
    requiredParameters
  }
}

export {
  isCustomRunTime,
  generateAllowedFrequencies,
  generateAllowedRunTimes,
  generateJobCustomParameters,
  generateJobCustomOptions,
  handleDateTimeInput,
  showToast,
  hasError,
  parseCsv,
  jsonToCsv,
  JsonToCsvOption,
  isFutureDate,
  prepareRuntime
}
