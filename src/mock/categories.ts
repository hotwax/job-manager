export const mockCategories = [
  { productCategoryId: 'ALL', productCategoryTypeId: 'CATALOG_CATEGORY', primaryParentCategoryId: 'SYSTEM_JOB', categoryName: 'All', description: 'All jobs', showInSelect: 'Y' },
  { productCategoryId: 'SHOPIFY', productCategoryTypeId: 'CATALOG_CATEGORY', primaryParentCategoryId: 'SYSTEM_JOB', categoryName: 'Shopify', description: 'Shopify jobs', showInSelect: 'Y' },
  { productCategoryId: 'NETSUITE', productCategoryTypeId: 'CATALOG_CATEGORY', primaryParentCategoryId: 'SYSTEM_JOB', categoryName: 'NetSuite', description: 'NetSuite jobs', showInSelect: 'Y' },
  { productCategoryId: 'ORDERS', productCategoryTypeId: 'CATALOG_CATEGORY', primaryParentCategoryId: 'SYSTEM_JOB', categoryName: 'Orders', description: 'Order jobs', showInSelect: 'Y' },
  { productCategoryId: 'INVENTORY', productCategoryTypeId: 'CATALOG_CATEGORY', primaryParentCategoryId: 'SYSTEM_JOB', categoryName: 'Inventory', description: 'Inventory jobs', showInSelect: 'Y' },
  { productCategoryId: 'TRANSFER_ORDER', productCategoryTypeId: 'CATALOG_CATEGORY', primaryParentCategoryId: 'SYSTEM_JOB', categoryName: 'Transfer Order', description: 'Transfer Order jobs', showInSelect: 'Y' }
];

export const mockCategoryRollups = [
  { productCategoryId: 'ORDERS', parentProductCategoryId: 'SHOPIFY', fromDate: '2020-01-01 00:00:00.000', thruDate: null, sequenceNum: 1 },
  { productCategoryId: 'ORDERS', parentProductCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null, sequenceNum: 1 },
  { productCategoryId: 'INVENTORY', parentProductCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null, sequenceNum: 2 },
  { productCategoryId: 'TRANSFER_ORDER', parentProductCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null, sequenceNum: 3 }
];

export const mockCategoryMembers = [
  { productId: 'Import Sales Orders (Shopify)', productCategoryId: 'SHOPIFY', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Import Sales Orders (Shopify)', productCategoryId: 'ORDERS', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Import Sales Orders (NetSuite)', productCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Import Sales Orders (NetSuite)', productCategoryId: 'ORDERS', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Sync Order Status to NS', productCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Sync Order Status to NS', productCategoryId: 'ORDERS', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Import Transfer Orders', productCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Import Transfer Orders', productCategoryId: 'ORDERS', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Import Transfer Orders', productCategoryId: 'INVENTORY', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Export Fulfillments to NS', productCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Export Fulfillments to NS', productCategoryId: 'ORDERS', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Sync Customer Deposits', productCategoryId: 'NETSUITE', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Sync Inventory to Shopify', productCategoryId: 'SHOPIFY', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Sync Inventory to Shopify', productCategoryId: 'INVENTORY', fromDate: '2020-01-01 00:00:00.000', thruDate: null },
  { productId: 'Import Bulk Orders', productCategoryId: 'ALL', fromDate: '2020-01-01 00:00:00.000', thruDate: null }
];
