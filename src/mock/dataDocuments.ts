export const mockDataDocuments = [
  {
    dataDocumentId: "PicklistRole",
    documentName: "Picklist role",
    primaryEntityName: "org.apache.ofbiz.shipment.picklist.PicklistRole",
    documentTitle: "Picklist role",
    indexName: "",
    manualDataServiceName: "",
    fieldCount: 7,
    conditionCount: 1,
    relatedFeeds: ["PicklistRoleFeed"],
    relatedJobs: ["export_PicklistRole"],
    description: "Picklist roles with shipment and order status context."
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    documentName: "Product Facility Inventory",
    primaryEntityName: "mantle.product.ProductFacility",
    documentTitle: "Inventory by facility",
    indexName: "inventory",
    manualDataServiceName: "",
    fieldCount: 6,
    conditionCount: 2,
    relatedFeeds: ["InventorySnapshotFeed"],
    relatedJobs: ["generate_InventorySnapshotFeed"],
    description: "Inventory availability with product and facility context."
  },
  {
    dataDocumentId: "NetSuiteShipmentReceiptEvent",
    documentName: "NetSuite Shipment Receipt Event",
    primaryEntityName: "mantle.shipment.ShipmentReceipt",
    documentTitle: "Shipment receipts for NetSuite",
    indexName: "netsuite",
    manualDataServiceName: "",
    fieldCount: 5,
    conditionCount: 1,
    relatedFeeds: ["NetSuiteShipmentReceiptFeed"],
    relatedJobs: ["generate_NetSuiteShipmentReceiptFeed"],
    description: "Shipment receipt export shape used by the NetSuite integration."
  },
  {
    dataDocumentId: "OrderFulfillmentExport",
    documentName: "Order Fulfillment Export",
    primaryEntityName: "mantle.order.OrderHeader",
    documentTitle: "Fulfillment export",
    indexName: "fulfillment",
    manualDataServiceName: "",
    fieldCount: 7,
    conditionCount: 3,
    relatedFeeds: ["FulfillmentExportFeed"],
    relatedJobs: ["export_Fulfillments"],
    description: "Fulfillment records with order, shipment, and facility details."
  }
];

export const mockEntityNames = [
  "mantle.product.Product",
  "mantle.product.ProductFacility",
  "mantle.facility.Facility",
  "mantle.order.OrderHeader",
  "mantle.order.OrderItem",
  "mantle.inventory.InventoryItem",
  "mantle.party.Party",
  "mantle.security.UserLogin",
  "org.apache.ofbiz.shipment.picklist.PicklistRole",
  "org.apache.ofbiz.shipment.picklist.Picklist",
  "org.apache.ofbiz.shipment.picklist.PicklistShipment",
  "org.apache.ofbiz.shipment.shipment.Shipment",
  "org.apache.ofbiz.order.order.OrderHeader",
  "Product",
  "Facility",
  "InventoryItem",
  "OrderHeader",
  "OrderItem",
  "Party",
  "UserLogin"
].sort();

export const mockEntityFields: Record<string, any[]> = {
  Product: [
    { fieldName: "productId", description: "Unique identifier for the product." },
    { fieldName: "productName", description: "The name of the product." },
    { fieldName: "description", description: "Detailed description of the product." },
    { fieldName: "internalName", description: "Internal name used for reporting and tracking." },
    { fieldName: "productTypeId", description: "Type of product." }
  ],
  "mantle.product.Product": [
    { fieldName: "productId", description: "Unique identifier for the product." },
    { fieldName: "productName", description: "The name of the product." },
    { fieldName: "description", description: "Detailed description of the product." },
    { fieldName: "internalName", description: "Internal name used for reporting and tracking." },
    { fieldName: "productTypeId", description: "Type of product." }
  ],
  Facility: [
    { fieldName: "facilityId", description: "Unique identifier for the facility." },
    { fieldName: "facilityName", description: "The name of the facility." },
    { fieldName: "facilityTypeId", description: "Type of facility." },
    { fieldName: "ownerPartyId", description: "The party that owns the facility." }
  ],
  "mantle.facility.Facility": [
    { fieldName: "facilityId", description: "Unique identifier for the facility." },
    { fieldName: "facilityName", description: "The name of the facility." },
    { fieldName: "facilityTypeId", description: "Type of facility." },
    { fieldName: "ownerPartyId", description: "The party that owns the facility." }
  ],
  InventoryItem: [
    { fieldName: "inventoryItemId", description: "Unique identifier for the inventory item." },
    { fieldName: "productId", description: "The product this inventory belongs to." },
    { fieldName: "facilityId", description: "The facility where the inventory is stored." },
    { fieldName: "quantityOnHandTotal", description: "Total quantity physically present." },
    { fieldName: "availableToPromiseTotal", description: "Quantity available for new orders." }
  ],
  "mantle.inventory.InventoryItem": [
    { fieldName: "inventoryItemId", description: "Unique identifier for the inventory item." },
    { fieldName: "productId", description: "The product this inventory belongs to." },
    { fieldName: "facilityId", description: "The facility where the inventory is stored." },
    { fieldName: "quantityOnHandTotal", description: "Total quantity physically present." },
    { fieldName: "availableToPromiseTotal", description: "Quantity available for new orders." }
  ],
  OrderHeader: [
    { fieldName: "orderId", description: "Unique identifier for the order." },
    { fieldName: "orderName", description: "The name or reference for the order." },
    { fieldName: "entryDate", description: "The date the order was entered." },
    { fieldName: "statusId", description: "Current status of the order." },
    { fieldName: "currencyUomId", description: "Currency used for the order." }
  ],
  "mantle.order.OrderHeader": [
    { fieldName: "orderId", description: "Unique identifier for the order." },
    { fieldName: "orderName", description: "The name or reference for the order." },
    { fieldName: "entryDate", description: "The date the order was entered." },
    { fieldName: "statusId", description: "Current status of the order." },
    { fieldName: "currencyUomId", description: "Currency used for the order." }
  ],
  "org.apache.ofbiz.order.order.OrderHeader": [
    { fieldName: "orderId", description: "Unique identifier for the order." },
    { fieldName: "orderName", description: "The name or reference for the order." },
    { fieldName: "entryDate", description: "The date the order was entered." },
    { fieldName: "statusId", description: "Current status of the order." },
    { fieldName: "currencyUomId", description: "Currency used for the order." }
  ],
  OrderItem: [
    { fieldName: "orderId", description: "The order ID this item belongs to." },
    { fieldName: "orderItemSeqId", description: "Sequence ID for the item within the order." },
    { fieldName: "productId", description: "The product being ordered." },
    { fieldName: "quantity", description: "Quantity of the product ordered." },
    { fieldName: "unitAmount", description: "Price per unit." }
  ],
  Party: [
    { fieldName: "partyId", description: "Unique identifier for the party." },
    { fieldName: "partyTypeId", description: "Type of party." },
    { fieldName: "statusId", description: "Current status of the party." }
  ],
  "mantle.party.Party": [
    { fieldName: "partyId", description: "Unique identifier for the party." },
    { fieldName: "partyTypeId", description: "Type of party." },
    { fieldName: "statusId", description: "Current status of the party." }
  ],
  UserLogin: [
    { fieldName: "userLoginId", description: "The username or login identifier." },
    { fieldName: "partyId", description: "The party associated with this login." },
    { fieldName: "enabled", description: "Whether the account is currently enabled." }
  ],
  "org.apache.ofbiz.shipment.picklist.PicklistRole": [
    { fieldName: "picklistId", description: "Picklist identifier." },
    { fieldName: "partyId", description: "Party assigned to the picklist." },
    { fieldName: "roleTypeId", description: "Role type for the party." },
    { fieldName: "fromDate", description: "Role start date." },
    { fieldName: "thruDate", description: "Role end date." }
  ],
  "org.apache.ofbiz.shipment.picklist.Picklist": [
    { fieldName: "picklistId", description: "Picklist identifier." },
    { fieldName: "facilityId", description: "Facility for the picklist." },
    { fieldName: "statusId", description: "Picklist status." }
  ],
  "org.apache.ofbiz.shipment.picklist.PicklistShipment": [
    { fieldName: "picklistId", description: "Picklist identifier." },
    { fieldName: "shipmentId", description: "Shipment identifier." },
    { fieldName: "shipGroupSeqId", description: "Shipment group sequence." }
  ],
  "org.apache.ofbiz.shipment.shipment.Shipment": [
    { fieldName: "shipmentId", description: "Shipment identifier." },
    { fieldName: "statusId", description: "Shipment status." },
    { fieldName: "primaryOrderId", description: "Primary order for the shipment." },
    { fieldName: "originFacilityId", description: "Origin facility." }
  ]
};

export const mockEntityRelationships: Record<string, any[]> = {
  "mantle.product.ProductFacility": [
    {
      relationshipName: "product",
      title: "Product",
      relatedEntityName: "mantle.product.Product",
      type: "one",
      keyMaps: [{ fieldName: "productId", relatedFieldName: "productId" }]
    },
    {
      relationshipName: "facility",
      title: "Facility",
      relatedEntityName: "mantle.facility.Facility",
      type: "one",
      keyMaps: [{ fieldName: "facilityId", relatedFieldName: "facilityId" }]
    },
    {
      relationshipName: "inventoryItem",
      title: "Inventory Items",
      relatedEntityName: "mantle.inventory.InventoryItem",
      type: "many",
      keyMaps: [
        { fieldName: "productId", relatedFieldName: "productId" },
        { fieldName: "facilityId", relatedFieldName: "facilityId" }
      ]
    }
  ],
  ProductFacility: [
    {
      relationshipName: "product",
      title: "Product",
      relatedEntityName: "Product",
      type: "one",
      keyMaps: [{ fieldName: "productId", relatedFieldName: "productId" }]
    },
    {
      relationshipName: "facility",
      title: "Facility",
      relatedEntityName: "Facility",
      type: "one",
      keyMaps: [{ fieldName: "facilityId", relatedFieldName: "facilityId" }]
    },
    {
      relationshipName: "inventoryItem",
      title: "Inventory Items",
      relatedEntityName: "InventoryItem",
      type: "many",
      keyMaps: [
        { fieldName: "productId", relatedFieldName: "productId" },
        { fieldName: "facilityId", relatedFieldName: "facilityId" }
      ]
    }
  ],
  "org.apache.ofbiz.shipment.picklist.PicklistRole": [
    {
      relationshipName: "org.apache.ofbiz.shipment.picklist.Picklist",
      title: "Picklist",
      relatedEntityName: "org.apache.ofbiz.shipment.picklist.Picklist",
      type: "one",
      keyMaps: [{ fieldName: "picklistId", relatedFieldName: "picklistId" }]
    }
  ],
  "org.apache.ofbiz.shipment.picklist.Picklist": [
    {
      relationshipName: "org.apache.ofbiz.shipment.picklist.PicklistShipment",
      title: "Picklist Shipments",
      relatedEntityName: "org.apache.ofbiz.shipment.picklist.PicklistShipment",
      type: "many",
      keyMaps: [{ fieldName: "picklistId", relatedFieldName: "picklistId" }]
    }
  ],
  "org.apache.ofbiz.shipment.picklist.PicklistShipment": [
    {
      relationshipName: "org.apache.ofbiz.shipment.shipment.Shipment",
      title: "Shipment",
      relatedEntityName: "org.apache.ofbiz.shipment.shipment.Shipment",
      type: "one",
      keyMaps: [{ fieldName: "shipmentId", relatedFieldName: "shipmentId" }]
    }
  ],
  "org.apache.ofbiz.shipment.shipment.Shipment": [
    {
      relationshipName: "Primary#org.apache.ofbiz.order.order.OrderHeader",
      title: "Primary Order",
      relatedEntityName: "org.apache.ofbiz.order.order.OrderHeader",
      type: "one",
      keyMaps: [{ fieldName: "primaryOrderId", relatedFieldName: "orderId" }]
    }
  ],
  "mantle.order.OrderHeader": [
    {
      relationshipName: "orderItem",
      title: "Order Items",
      relatedEntityName: "mantle.order.OrderItem",
      type: "many",
      keyMaps: [{ fieldName: "orderId", relatedFieldName: "orderId" }]
    }
  ],
  OrderHeader: [
    {
      relationshipName: "orderItem",
      title: "Order Items",
      relatedEntityName: "OrderItem",
      type: "many",
      keyMaps: [{ fieldName: "orderId", relatedFieldName: "orderId" }]
    }
  ]
};

export const mockDataDocumentFields = [
  {
    dataDocumentId: "PicklistRole",
    fieldSeqId: "01",
    fieldPath: "org.apache.ofbiz.shipment.picklist.Picklist:picklistId",
    fieldNameAlias: "picklistId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 1
  },
  {
    dataDocumentId: "PicklistRole",
    fieldSeqId: "02",
    fieldPath: "org.apache.ofbiz.shipment.picklist.Picklist:org.apache.ofbiz.shipment.picklist.PicklistShipment:org.apache.ofbiz.shipment.shipment.Shipment:Primary#org.apache.ofbiz.order.order.OrderHeader:statusId",
    fieldNameAlias: "primaryOrderStatusId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 2
  },
  {
    dataDocumentId: "PicklistRole",
    fieldSeqId: "03",
    fieldPath: "org.apache.ofbiz.shipment.picklist.Picklist:org.apache.ofbiz.shipment.picklist.PicklistShipment:org.apache.ofbiz.shipment.shipment.Shipment:statusId",
    fieldNameAlias: "shipmentStatusId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 3
  },
  {
    dataDocumentId: "PicklistRole",
    fieldSeqId: "04",
    fieldPath: "partyId",
    fieldNameAlias: "partyId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 4
  },
  {
    dataDocumentId: "PicklistRole",
    fieldSeqId: "05",
    fieldPath: "roleTypeId",
    fieldNameAlias: "roleTypeId",
    defaultDisplay: "Y",
    sortable: "N",
    functionName: "",
    sequenceNum: 5
  },
  {
    dataDocumentId: "PicklistRole",
    fieldSeqId: "06",
    fieldPath: "fromDate",
    fieldNameAlias: "fromDate",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 6
  },
  {
    dataDocumentId: "PicklistRole",
    fieldSeqId: "07",
    fieldPath: "thruDate",
    fieldNameAlias: "thruDate",
    defaultDisplay: "N",
    sortable: "Y",
    functionName: "",
    sequenceNum: 7
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    fieldSeqId: "10",
    fieldPath: "productId",
    fieldNameAlias: "productId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 10
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    fieldSeqId: "20",
    fieldPath: "product:internalName",
    fieldNameAlias: "productName",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 20
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    fieldSeqId: "30",
    fieldPath: "facilityId",
    fieldNameAlias: "facilityId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 30
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    fieldSeqId: "40",
    fieldPath: "facility:facilityName",
    fieldNameAlias: "facilityName",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 40
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    fieldSeqId: "50",
    fieldPath: "inventoryItem:quantityOnHandTotal",
    fieldNameAlias: "quantityOnHandTotal",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "sum",
    sequenceNum: 50
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    fieldSeqId: "60",
    fieldPath: "facility:facilityType:description",
    fieldNameAlias: "facilityType",
    defaultDisplay: "N",
    sortable: "N",
    functionName: "",
    sequenceNum: 60
  },
  {
    dataDocumentId: "NetSuiteShipmentReceiptEvent",
    fieldSeqId: "10",
    fieldPath: "shipmentId",
    fieldNameAlias: "shipmentId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 10
  },
  {
    dataDocumentId: "NetSuiteShipmentReceiptEvent",
    fieldSeqId: "20",
    fieldPath: "returnId",
    fieldNameAlias: "returnId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 20
  },
  {
    dataDocumentId: "NetSuiteShipmentReceiptEvent",
    fieldSeqId: "30",
    fieldPath: "product:internalName",
    fieldNameAlias: "productName",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 30
  },
  {
    dataDocumentId: "OrderFulfillmentExport",
    fieldSeqId: "10",
    fieldPath: "orderId",
    fieldNameAlias: "orderId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 10
  },
  {
    dataDocumentId: "OrderFulfillmentExport",
    fieldSeqId: "20",
    fieldPath: "orderItem:productId",
    fieldNameAlias: "productId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 20
  },
  {
    dataDocumentId: "OrderFulfillmentExport",
    fieldSeqId: "30",
    fieldPath: "shipment:primaryShipGroupSeqId",
    fieldNameAlias: "shipGroupSeqId",
    defaultDisplay: "Y",
    sortable: "Y",
    functionName: "",
    sequenceNum: 30
  }
];

export const mockDataDocumentConditions = [
  {
    dataDocumentId: "PicklistRole",
    conditionSeqId: "10",
    fieldNameAlias: "roleTypeId",
    operator: "equals",
    value: "PICKER",
    fieldValue: "PICKER",
    toFieldNameAlias: "",
    postQuery: "N"
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    conditionSeqId: "10",
    fieldNameAlias: "productId",
    operator: "is-not-empty",
    value: "",
    fieldValue: "",
    toFieldNameAlias: "",
    postQuery: "N"
  },
  {
    dataDocumentId: "ProductFacilityAndInventoryItem",
    conditionSeqId: "20",
    fieldNameAlias: "facilityId",
    operator: "is-not-empty",
    value: "",
    fieldValue: "",
    toFieldNameAlias: "",
    postQuery: "N"
  },
  {
    dataDocumentId: "NetSuiteShipmentReceiptEvent",
    conditionSeqId: "10",
    fieldNameAlias: "returnId",
    operator: "is-not-empty",
    value: "",
    fieldValue: "",
    toFieldNameAlias: "",
    postQuery: "N"
  },
  {
    dataDocumentId: "OrderFulfillmentExport",
    conditionSeqId: "10",
    fieldNameAlias: "orderId",
    operator: "is-not-empty",
    value: "",
    fieldValue: "",
    toFieldNameAlias: "",
    postQuery: "N"
  }
];

export const mockDataDocumentRelAliases = [
  {
    dataDocumentId: "PicklistRole",
    relationshipName: "org.apache.ofbiz.shipment.picklist.Picklist",
    documentAlias: "Picklist"
  },
  {
    dataDocumentId: "PicklistRole",
    relationshipName: "org.apache.ofbiz.shipment.picklist.PicklistShipment",
    documentAlias: "PicklistShipment"
  },
  {
    dataDocumentId: "PicklistRole",
    relationshipName: "Primary#org.apache.ofbiz.order.order.OrderHeader",
    documentAlias: "PrimaryOrder"
  }
];

export const mockDataDocumentLinks = [
  {
    dataDocumentId: "PicklistRole",
    linkSeqId: "10",
    label: "Open Picklist",
    linkUrl: "/qapps/fulfillment/Picklist?picklistId=${picklistId}",
    linkTypeEnumId: "DdlInternal",
    conditionExpression: ""
  }
];

export const mockDataDocumentPresets = [
  {
    presetId: "picklist-picker",
    dataDocumentId: "PicklistRole",
    presetName: "Active pickers",
    query: {
      selectedFields: ["picklistId", "partyId", "roleTypeId", "fromDate"],
      filters: [{ fieldNameAlias: "roleTypeId", operator: "equals", value: "PICKER" }],
      sort: [{ fieldNameAlias: "fromDate", direction: "DESC" }],
      distinct: false,
      pageSize: 25
    }
  },
  {
    presetId: "low-stock",
    dataDocumentId: "ProductFacilityAndInventoryItem",
    presetName: "Low stock inventory",
    query: {
      selectedFields: ["productId", "productName", "facilityId", "quantityOnHandTotal"],
      filters: [{ fieldNameAlias: "quantityOnHandTotal", operator: "less-than", value: "10" }],
      sort: [{ fieldNameAlias: "quantityOnHandTotal", direction: "ASC" }],
      distinct: false,
      pageSize: 25
    }
  },
  {
    presetId: "recent-receipts",
    dataDocumentId: "NetSuiteShipmentReceiptEvent",
    presetName: "Recent receipts",
    query: {
      selectedFields: ["shipmentId", "returnId", "productName"],
      filters: [],
      sort: [{ fieldNameAlias: "shipmentId", direction: "DESC" }],
      distinct: false,
      pageSize: 25
    }
  }
];

export const mockDataDocumentExports = [
  {
    systemMessageId: "DDX1000",
    systemMessageTypeId: "ExportDataDocument",
    dataDocumentId: "PicklistRole",
    presetName: "Active pickers",
    fileName: "picklist-role.csv",
    startedBy: "admin",
    initDate: "2026-04-24 12:05:00.000",
    processedDate: "",
    statusId: "SmsgProduced",
    recordCount: 0,
    errorSummary: "",
    filePath: ""
  },
  {
    systemMessageId: "DDX1001",
    systemMessageTypeId: "ExportDataDocument",
    dataDocumentId: "ProductFacilityAndInventoryItem",
    presetName: "Low stock inventory",
    fileName: "low-stock-inventory.csv",
    startedBy: "admin",
    initDate: "2026-04-22 10:15:00.000",
    processedDate: "2026-04-22 10:16:12.000",
    statusId: "SmsgSent",
    recordCount: 124,
    errorSummary: "",
    filePath: "/runtime/data-documents/low-stock-inventory.csv"
  },
  {
    systemMessageId: "DDX1002",
    systemMessageTypeId: "ExportDataDocument",
    dataDocumentId: "NetSuiteShipmentReceiptEvent",
    presetName: "",
    fileName: "shipment-receipts.json",
    startedBy: "operations",
    initDate: "2026-04-23 18:42:00.000",
    processedDate: "",
    statusId: "SmsgError",
    recordCount: 0,
    errorSummary: "Primary entity condition returned no rows.",
    filePath: ""
  }
];

export const mockDataDocumentPreviewRows = [
  {
    picklistId: "PCK1001",
    primaryOrderStatusId: "ORDER_APPROVED",
    shipmentStatusId: "SHIPMENT_PICKED",
    partyId: "EMP_100",
    roleTypeId: "PICKER",
    fromDate: "2026-04-24 09:30:00.000",
    thruDate: ""
  },
  {
    picklistId: "PCK1002",
    primaryOrderStatusId: "ORDER_APPROVED",
    shipmentStatusId: "SHIPMENT_INPUT",
    partyId: "EMP_102",
    roleTypeId: "PICKER",
    fromDate: "2026-04-24 10:15:00.000",
    thruDate: ""
  },
  {
    productId: "10001",
    productName: "Black denim jacket",
    facilityId: "WH1",
    facilityName: "Main Warehouse",
    quantityOnHandTotal: 8,
    facilityType: "Warehouse"
  },
  {
    productId: "10008",
    productName: "Canvas tote",
    facilityId: "STORE_01",
    facilityName: "Bleecker",
    quantityOnHandTotal: 4,
    facilityType: "Retail Store"
  },
  {
    shipmentId: "S10021",
    returnId: "R9002",
    productName: "Ribbed knit top"
  }
];
