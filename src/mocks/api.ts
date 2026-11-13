import axios from 'axios';
import { fixtureResponse } from './fixtures';
// Every call stays in this browser. Unknown operations fail rather than reaching a real OMS.
async function api(config: any) {
 const data = await fixtureResponse(config);
 return { status: 200, data, headers: { 'x-total-count': String(Array.isArray(data) ? data.length : 1) }, config };
}
export default api;
export { api as client, axios };
