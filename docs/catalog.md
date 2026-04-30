# Catalog

Implementation document for the catalog page.

## Overview

The catalog page lists all jobs available in the system and allows the user to find them by performing a keyword search on the job name and/or filter by category.

Jobs can also be created from this page. To create a job, the user must provide the following details:

1. Name
2. Description
3. Category
4. Service
5. Security group
6. Custom parameters

## Jobs list

Each job is displayed as a card with the following details:

1. Name
2. Service
3. From system to System
4. Cron expression
5. Status

## Filters

On the catalog page, users can filter jobs by category. Each category can have subcategories, which are found using category rollup.

For example, NetSuite integration jobs are part of the NetSuite category. The NetSuite category will also have Import and Export subcategories found through the rollup.

### Sample API Response

The following is a sample response for the category rollup data, showing the subcategories for NetSuite in a flat structure (based on a view entity join).

```json
{
  "categories": [
    {
      "productCategoryId": "NETSUITE",
      "categoryName": "NetSuite",
      "parentProductCategoryId": null
    },
    {
      "productCategoryId": "NS_ORDER",
      "categoryName": "Order",
      "parentProductCategoryId": "NETSUITE"
    },
    {
      "productCategoryId": "NS_INVENTORY",
      "categoryName": "Inventory",
      "parentProductCategoryId": "NETSUITE"
    },
    {
      "productCategoryId": "NS_TRANSFER_ORDER",
      "categoryName": "Transfer Order",
      "parentProductCategoryId": "NETSUITE"
    }
  ]
}
```



