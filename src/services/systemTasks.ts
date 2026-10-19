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
  const response = await api({ url: 'admin/workEfforts/assignees', method: 'GET', params: { search, pageIndex } });
  return response.data;
}

export async function assignSystemTask(workEffortId: string, partyId: string) {
  await api({ url: `admin/workEfforts/${encodeURIComponent(workEffortId)}/assignee`, method: 'PUT', data: { partyId } });
}

export async function resolveSystemTask(workEffortId: string) {
  const now = Date.now();
  await api({ url: `admin/workEfforts/${encodeURIComponent(workEffortId)}`, method: 'PUT',
    data: { statusId: 'TASK_COMPLETED', actualCompletionDate: now, lastStatusUpdate: now } });
}
