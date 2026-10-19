import { api } from '@common';

export interface TaskAssignee {
  partyId: string;
  name: string;
}

export interface SystemTask {
  workEffortId: string;
  workEffortName?: string;
  description?: string;
  workEffortPurposeTypeId?: string;
  purposeDescription?: string;
  statusId: string;
  statusDescription?: string;
  createdDate?: number | string;
  actualCompletionDate?: number | string;
  assignees: TaskAssignee[];
}

export interface SystemTaskQuery {
  status: 'open' | 'resolved' | 'all';
  search: string;
  searchField: 'workEffortName' | 'workEffortId' | 'description';
  purposeId: string;
  pageIndex: number;
  pageSize: number;
}

export async function fetchSystemTasks(params: SystemTaskQuery): Promise<{
  tasks: SystemTask[]; total: number; purposes: { enumId: string; description: string }[];
}> {
  const filters: Record<string, string | number> = {
    workEffortTypeId: 'SYSTEM_TASK', pageIndex: params.pageIndex, pageSize: params.pageSize,
    orderByField: '-createdDate,workEffortId',
  };
  if (params.status !== 'all') {
    filters.statusId = params.status === 'resolved' ? 'TASK_COMPLETED' : 'TASK_CREATED,TASK_IN_PROGRESS,TASK_ON_HOLD';
    filters.statusId_op = 'in';
  }
  if (params.purposeId) filters.workEffortPurposeTypeId = params.purposeId;
  if (params.search.trim()) {
    filters[params.searchField] = params.search.trim();
    filters[`${params.searchField}_op`] = 'contains';
    filters[`${params.searchField}_ic`] = 'Y';
  }
  const [response, purposeResponse, statusResponse] = await Promise.all([
    api({ url: 'admin/workEfforts', method: 'GET', params: filters }),
    api({ url: 'admin/enums', method: 'GET', params: { enumTypeId: 'SYSTEM_TASK', orderByField: 'description', pageNoLimit: true } }),
    api({ url: 'admin/status', method: 'GET', params: { statusTypeId: 'WORK_EFFORT_STATUS', pageNoLimit: true } }),
  ]);
  const purposes: { enumId: string; description: string }[] = purposeResponse.data;
  const statuses: { statusId: string; description: string }[] = statusResponse.data;
  const now = Date.now();
  return {
    total: Number(response.headers['x-total-count']),
    purposes,
    tasks: response.data.map((task: WorkEffort) => ({
      ...task,
      purposeDescription: purposes.find(purpose => purpose.enumId === task.workEffortPurposeTypeId)?.description || task.workEffortPurposeTypeId,
      statusDescription: statuses.find(status => status.statusId === task.statusId)?.description || task.statusId,
      assignees: (task.partyAssignments || [])
        .filter(assignment => assignment.roleTypeId === 'TASK_ASSIGNEE'
          && (!assignment.fromDate || timestamp(assignment.fromDate) <= now)
          && (!assignment.thruDate || timestamp(assignment.thruDate) > now))
        .sort((a, b) => timestamp(b.fromDate) - timestamp(a.fromDate))
        .map(assignment => ({
          partyId: assignment.partyId,
          name: [assignment.person?.firstName, assignment.person?.lastName].filter(Boolean).join(' ') || assignment.partyId,
        })),
    })),
  };
}

interface WorkEffort extends Omit<SystemTask, 'assignees'> {
  partyAssignments?: {
    partyId: string; roleTypeId: string; fromDate?: number | string; thruDate?: number | string;
    person?: { firstName?: string; lastName?: string };
  }[];
}
function timestamp(value?: number | string) {
  return typeof value === 'number' ? value : value ? new Date(value).getTime() : 0;
}

export async function fetchTaskAssignees(search: string, pageIndex: number): Promise<{
  users: TaskAssignee[]; hasMore: boolean;
}> {
  const pageSize = 25;
  const response = await api({ url: 'oms/parties', method: 'GET', params: {
    partyTypeId: 'PERSON', userId_op: 'empty', userId_not: 'Y',
    firstName: search.trim(), firstName_op: 'contains', firstName_ic: 'Y',
    orderByField: 'firstName,lastName,partyId', pageIndex, pageSize,
  } });
  return {
    users: response.data.map((person: { partyId: string; firstName?: string; lastName?: string }) => ({
      partyId: person.partyId,
      name: [person.firstName, person.lastName].filter(Boolean).join(' ') || person.partyId,
    })),
    hasMore: (pageIndex + 1) * pageSize < Number(response.headers['x-total-count']),
  };
}

export async function assignSystemTask(workEffortId: string, partyId: string) {
  const url = 'admin/workEffortPartyAssignments';
  const response = await api({ url, method: 'GET', params: {
    workEffortId, roleTypeId: 'TASK_ASSIGNEE', pageNoLimit: true,
  } });
  const now = Date.now();
  const assignments = (response.data as { partyId: string; fromDate: number | string; thruDate?: number | string }[])
    .filter(assignment => timestamp(assignment.fromDate) <= now
      && (!assignment.thruDate || timestamp(assignment.thruDate) > now));
  // Create first so a failed create leaves the current assignee in place.
  // Reloading assignments on each save also lets a retry finish a partial reassignment.
  if (partyId && !assignments.some(assignment => assignment.partyId === partyId)) {
    await api({ url, method: 'POST', data: { workEffortId, partyId, roleTypeId: 'TASK_ASSIGNEE', fromDate: now } });
  }
  for (const assignment of assignments.filter(assignment => assignment.partyId !== partyId)) {
    await api({ url, method: 'PUT', data: {
      workEffortId, partyId: assignment.partyId, roleTypeId: 'TASK_ASSIGNEE', fromDate: assignment.fromDate, thruDate: now,
    } });
  }
}

export async function resolveSystemTask(workEffortId: string) {
  const now = Date.now();
  await api({ url: `admin/workEfforts/${encodeURIComponent(workEffortId)}`, method: 'PUT',
    data: { statusId: 'TASK_COMPLETED', actualCompletionDate: now, lastStatusUpdate: now } });
}
