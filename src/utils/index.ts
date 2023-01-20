import saveAs from "file-saver";
import { toastController } from '@ionic/vue';
import Papa from 'papaparse'
import { DateTime } from "luxon";

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_;
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

const generateFrequencyOptions = (type?: string) => {
  const optionDefault = [{
      "value": "EVERY_1_MIN",
      "label": "Every 1 minute"
    },{
      "value": "EVERY_5_MIN",
      "label": "Every 5 minutes"
    },{
      "value": "EVERY_15_MIN",
      "label": "Every 15 minutes"
    },{
      "value": "EVERY_30_MIN",
      "label": "Every 30 minutes"
    },{
      "value": "HOURLY",
      "label": "Hourly"
    },{
      "value": "EVERY_6_HOUR",
      "label": "Every 6 hours"
    },{
      "value": "EVERYDAY",
      "label": "Every day"
    }
  ]

  const slow = [{
      "value": "HOURLY",
      "label": "Hourly"
    },{
      "value": "EVERY_6_HOUR",
      "label": "Every 6 hours"
    },{
      "value": "EVERYDAY",
      "label": "Every day"
    }
  ]
  return type === 'slow' ? slow : optionDefault;
}

export { handleDateTimeInput, showToast, hasError , parseCsv , jsonToCsv, JsonToCsvOption, isFutureDate, prepareRuntime, generateFrequencyOptions }
