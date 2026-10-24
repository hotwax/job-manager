import { api, commonUtil } from '@common';

function timestamp(value?: number | string) {
  return typeof value === 'number' ? value : value ? new Date(value).getTime() : 0;
}

export function useSystemTaskAssignment() {
  async function assignSystemTask(workEffortId: string, partyId: string) {
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
      // WorkEffortPartyAssignment references PartyRole. Store is idempotent on retries.
      const roleResponse = await api({ url: `oms/parties/${encodeURIComponent(partyId)}/roles`, method: 'POST',
        data: { roleTypeId: 'TASK_ASSIGNEE' } });
      if (commonUtil.hasError(roleResponse)) throw new Error('Unable to prepare task assignee');
      await api({ url, method: 'POST', data: { workEffortId, partyId, roleTypeId: 'TASK_ASSIGNEE', fromDate: now } });
    }
    for (const assignment of assignments.filter(assignment => assignment.partyId !== partyId)) {
      await api({ url, method: 'PUT', data: {
        workEffortId, partyId: assignment.partyId, roleTypeId: 'TASK_ASSIGNEE', fromDate: assignment.fromDate, thruDate: now,
      } });
    }
  }

  return { assignSystemTask };
}
