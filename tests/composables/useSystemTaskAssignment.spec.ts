import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@common';
import { useSystemTaskAssignment } from '@/composables/useSystemTaskAssignment';
vi.mock('@common', () => ({ api: vi.fn(), commonUtil: { hasError: (response: any) => !!response.data?.errors } }));
const request = vi.mocked(api);
const oldAssignment = { partyId: 'old-user', fromDate: 1 };
beforeEach(() => request.mockReset());
describe('System task assignment prerequisites', () => {
  it('creates the required party role before assignment, then expires the previous assignee', async () => {
    request.mockResolvedValue({ data: {} } as any).mockResolvedValueOnce({ data: [oldAssignment] } as any);
    await useSystemTaskAssignment().assignSystemTask('QA', 'new-user');
    expect(request.mock.calls.map(([c]) => [c.method, c.url])).toEqual([
      ['GET', 'admin/workEffortPartyAssignments'], ['POST', 'oms/parties/new-user/roles'],
      ['POST', 'admin/workEffortPartyAssignments'], ['PUT', 'admin/workEffortPartyAssignments'],
    ]);
    expect(request.mock.calls[1][0].data).toEqual({ roleTypeId: 'TASK_ASSIGNEE' });
    expect(request.mock.calls[2][0].data).toMatchObject({ partyId: 'new-user', workEffortId: 'QA' });
    expect(request.mock.calls[3][0].data).toMatchObject({ ...oldAssignment, thruDate: expect.any(Number) });
  });
  it.each(['rejection', 'error-body'])('keeps the old assignee if the role store fails with %s', async (failure) => {
    request.mockResolvedValueOnce({ data: [oldAssignment] } as any);
    if (failure === 'rejection') request.mockRejectedValueOnce(new Error('Forbidden'));
    else request.mockResolvedValueOnce({ data: { errors: 'Forbidden' } } as any);
    await expect(useSystemTaskAssignment().assignSystemTask('QA', 'new-user')).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('keeps the old assignee when creating the new assignment fails', async () => {
    request.mockResolvedValueOnce({ data: [oldAssignment] } as any)
      .mockResolvedValueOnce({ data: {} } as any).mockRejectedValueOnce(new Error('Assignment rejected'));
    await expect(useSystemTaskAssignment().assignSystemTask('QA', 'new-user')).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('does not create another role or assignment when retrying the current assignee', async () => {
    request.mockResolvedValueOnce({ data: [oldAssignment] } as any);
    await useSystemTaskAssignment().assignSystemTask('QA', 'old-user');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('unassigns without creating a party role', async () => {
    request.mockResolvedValueOnce({ data: [oldAssignment] } as any).mockResolvedValue({ data: {} } as any);
    await useSystemTaskAssignment().assignSystemTask('QA', '');
    expect(request.mock.calls.map(([c]) => c.method)).toEqual(['GET', 'PUT']);
  });
});
