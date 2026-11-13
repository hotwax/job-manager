// Synthetic UI fixtures matching response shapes consumed by the existing stores.
export const sample = {"purchaseOrder": {"number": "AW-EDI-10428", "date": "2026-11-13T09:00:00-05:00", "currency": "usd"}, "customer": {"firstName": "Alex", "lastName": "Morgan", "email": "alex@example.com"}, "shipTo": {"address1": "123 Demo Avenue", "city": "New York", "state": "NY", "postalCode": "10001", "country": "USA"}, "lines": [{"sku": "AW-CO-BLK", "quantity": "1", "unitPrice": "275"}, {"sku": "AW-BAG-NVY", "quantity": "2", "unitPrice": "125"}]};
const remoteKey = 'away-native-remotes-v1';
let remotes = JSON.parse(localStorage.getItem(remoteKey) || 'null') || [{ systemMessageRemoteId: 'SPS_AWAY', description: 'SPS Commerce · Away wholesale orders', receiveUrl: 'https://example.invalid/inbound/edi', sendServiceName: '', remoteAppCode: 'SPS', remoteIdType: 'EDI' }];
const messageKey = 'away-native-messages-v1';
const initialMessages = ['MSG10428', 'MSG10429'].map((id, index) => ({ systemMessageId: id, systemMessageRemoteId: 'SPS_AWAY', systemMessageTypeId: 'EDI_850', statusId: index ? 'SmsgError' : 'SmsgReceived', initDate: '2026-11-13T09:05:00-05:00', messageText: JSON.stringify(index ? { ...sample, lines: [{ sku: 'AW-CO-BLK', unitPrice: '275' }] } : sample), isOutgoing: 'N' }));
let messages = JSON.parse(localStorage.getItem(messageKey) || 'null') || initialMessages;
export async function fixtureResponse({ url, method = 'GET', params = {}, data }: any): Promise<any> {
 const verb = method.toUpperCase();
 const updateId = url.match(/^admin\/systemMessages\/([^/]+)\/update$/)?.[1];
 if(updateId && verb === 'POST') { const index=messages.findIndex((m:any)=>m.systemMessageId===updateId); if(index<0)throw new Error('Message not found'); messages[index]={...messages[index],...data};localStorage.setItem(messageKey,JSON.stringify(messages));return {}; }

 if (url === 'oms/systemMessageRemotes') return { systemMessageRemoteList: remotes.filter((r: any) => !params.systemMessageRemoteId || r.systemMessageRemoteId === params.systemMessageRemoteId) };
 if (url.startsWith('oms/systemMessageRemotes/') && ['PUT','POST','PATCH','DELETE'].includes(verb)) { const id = decodeURIComponent(url.split('/').pop()); remotes = remotes.filter((r: any) => r.systemMessageRemoteId !== id); if (verb !== 'DELETE') remotes.push({ ...data, systemMessageRemoteId: id }); localStorage.setItem(remoteKey, JSON.stringify(remotes)); return { ...data }; }
 if (url === 'admin/systemMessages') { const rows = messages.filter((m: any) => (!params.systemMessageId || m.systemMessageId === params.systemMessageId) && (!params.systemMessageRemoteId || m.systemMessageRemoteId === params.systemMessageRemoteId) && (!params.statusId || m.statusId === params.statusId) && (!params.parentMessageId || m.parentMessageId === params.parentMessageId)); return { systemMessages: rows, systemMessagesCount: rows.length }; }
 if (url === 'admin/systemMessages/types') return [{ systemMessageTypeId: 'EDI_850', description: 'Wholesale purchase order · normalized JSON', consumeServiceName: '' }];
 if (url === 'admin/status') return [{statusId:'SmsgReceived',statusTypeId:'SystemMessage',description:'Received'},{statusId:'SmsgError',statusTypeId:'SystemMessage',description:'Error'}];
 if (url === 'admin/statusFlows/transitions' || /\/(errors|statusHistory)$/.test(url)) return [];
 if (url === 'admin/maarg') return { version: '6.0.0' };
 throw new Error('No local fixture for ' + verb + ' ' + url);
}
