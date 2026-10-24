/**
 * App actions mapped to the server permissions they require.
 *
 * Views, components and routes should always refer to an action from this file instead of
 * hardcoding a server permission, so that a permission change is a one line change here.
 *
 * The value is the permission expression evaluated by `hasPermission` of the user store.
 * It supports the `OR` and `AND` operators, and an empty value means the action is allowed
 * for every logged in user.
 */
export default {
  APP_PRODUCT_VIEW: "",
  APP_PWA_STANDALONE_ACCESS: "",
  APP_COMMERCE_VIEW: "COMMERCEUSER_VIEW",
  APP_SYSTEM_TASK_VIEW: "WORKEFFORT_TASK_ADMIN",
  APP_SYSTEM_MESSAGE_UPDATE: "COMMON_ADMIN"
} as const satisfies Record<string, string>
