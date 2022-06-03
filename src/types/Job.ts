import { Status } from "./Status";
import { TemporalExpression } from "./temporalExpression";
import { Enumeration } from "./Enumeration";

export interface Job {
    id: string;
    name: string;
    systemJobEnum?: Array<Enumeration>;
    parentJobId?: string;
    runTime?: string;
    serviceName?: string;
    status?: Array<Status>;
    tempExpr?: Array<TemporalExpression>;
    currentRetryCount?: number;
    finishDateTime: number;
    cancelDateTime: number;
}
