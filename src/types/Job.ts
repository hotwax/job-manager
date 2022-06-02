import { Status } from "./Status";
import { TemporalExpression } from "./temporalExpression";
import { Enumeration } from "./Enumeration";

export interface PendingJobsTypes {
    id: string;
    name: string;
    systemJobEnum?: Array<Enumeration>;
    parentJobId?: string;
    runTime?: string;
    serviceName?: string;
    status?: Array<Status>;
    tempExpr?: Array<TemporalExpression>;
    currentRetryCount?: number;
}

export interface RunningJobsTypes {
    id: string;
    name: string;
    systemJobEnum?: Array<Enumeration>;
    parentJobId?: string;
    runTime?: string;
    serviceName?: string;
    status?: Array<Status>;
    tempExpr?: Array<TemporalExpression>;
    currentRetryCount?: number;
}

export interface JobsHistoryTypes {
    id: string;
    name: string;
    systemJobEnum?: Array<Enumeration>;
    parentJobId?: string;
    runTime?: string;
    serviceName?: string;
    status?: Array<Status>;
    tempExpr?: Array<TemporalExpression>;
    finishDateTime: number;
    cancelDateTime: number;
}