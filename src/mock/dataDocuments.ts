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
