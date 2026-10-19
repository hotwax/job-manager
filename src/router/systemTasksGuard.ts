import { useUtilStore } from '@/store/util';

export async function systemTasksGuard() {
  const utilStore = useUtilStore();
  await utilStore.fetchSystemInformation();
  if (!utilStore.supportsSystemTasks) return { path: '/pipeline', replace: true };
}
