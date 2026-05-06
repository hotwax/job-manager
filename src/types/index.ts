export interface StatusItem {
  statusId: string
  description: string
  statusTypeId: string
  statusCode: string
  sequenceNum: string
  statusAge: string
  lastUpdatedStamp: string
  createdStamp: string
}

export interface StatusType {
  statusTypeId: string
  parentTypeId: string
  description: string
  lastUpdatedStamp: string
  createdStamp: string
}

export interface StatusItemAndType extends StatusItem, StatusType {}