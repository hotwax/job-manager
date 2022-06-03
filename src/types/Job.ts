import { Status } from "./Status";
import { TemporalExpression } from "./temporalExpression";
import { Enumeration } from "./Enumeration";

export interface Job {
    id: string;
    name: string;
    systemJobEnum?: Enumeration;
    parentJobId?: string;
    runTime?: string;
    serviceName?: string;
    status?: Status;
    tempExpr?: TemporalExpression;
    currentRetryCount?: number;
    finishDateTime: number;
    cancelDateTime: number;
}
