import { useUtilStore } from '@/store/util';

export function systemTasksGuard() {
  const utilStore = useUtilStore();
  if (utilStore.supportsSystemTasks === false) return { path: '/pipeline', replace: true };
}
