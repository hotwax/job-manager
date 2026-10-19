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
  purposeId: string;
  pageIndex: number;
  pageSize: number;
}

export async function fetchSystemTasks(params: SystemTaskQuery): Promise<{
  tasks: SystemTask[]; total: number; purposes: { enumId: string; description: string }[];
}> {
  const response = await api({ url: 'admin/systemTasks', method: 'GET', params });
  return response.data;
}

export async function fetchTaskAssignees(search: string, pageIndex: number): Promise<{
  users: TaskAssignee[]; hasMore: boolean;
}> {
  const response = await api({ url: 'admin/systemTasks/assignees', method: 'GET', params: { search, pageIndex } });
  return response.data;
}

export async function assignSystemTask(workEffortId: string, partyId: string) {
  await api({ url: `admin/systemTasks/${encodeURIComponent(workEffortId)}/assignee`, method: 'PUT', data: { partyId } });
}

export async function resolveSystemTask(workEffortId: string) {
  await api({ url: `admin/systemTasks/${encodeURIComponent(workEffortId)}/resolve`, method: 'POST', data: {} });
}
