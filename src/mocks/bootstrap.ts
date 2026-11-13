import { Settings } from 'luxon';
import { useUserStore } from '@/store/user';
import Actions from '@/authorization/actions';
const fixturePermissions = [...new Set(Object.values(Actions).flatMap(value => value.split(/ OR | AND /)).filter(Boolean))];
const fixtureStore = { productStoreId: 'AWAY_US', storeName: 'Away US' };
import { useEdiOrderMappingStore } from '@/store/ediOrderMapping';
import { defaultEdiMapping } from '@/utils/ediOrderMapping';
import { sample } from './fixtures';
export async function installFixtures() {
 Settings.defaultZone = 'America/New_York';
 const user = useUserStore();
 user.$patch({ current: { userId: 'demo-operator', username: 'Demo operator', firstName: 'Demo', lastName: 'Operator', timeZone: 'America/New_York', stores: [fixtureStore] }, oms: 'local-ui-fixtures', appVersion: '', permissions: [...fixturePermissions, import.meta.env.VITE_APP_PERMISSION_ID] } as any);
 user.currentProductStore = fixtureStore;
 const mapping = useEdiOrderMappingStore();
 if (!mapping.byRemote.SPS_AWAY) mapping.save('SPS_AWAY', { rows: defaultEdiMapping('AWAY_US'), linesPath: 'lines', sampleText: JSON.stringify(sample, null, 2) });
}
