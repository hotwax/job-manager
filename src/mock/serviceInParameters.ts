export const serviceInParameters: { [key: string]: string[] } = {
  'shopify.OrderServices.import#ShopifySalesOrders': ['shopId', 'shopifyConfigId', 'fromDate', 'thruDate'],
  'netsuite.OrderServices.import#NetSuiteSalesOrders': ['externalId', 'nsAccount', 'status'],
  'common.OrderServices.import#BulkOrders': ['filePath', 'validateOnly'],
  'moqui.example.Service#CustomParams': ['param1', 'param2', 'param3'],
  'netsuite.OrderServices.update#NetSuiteOrderStatus': ['orderId', 'status'],
  'shopify.InventoryServices.sync#ShopifyInventory': ['shopId', 'productId']
};
