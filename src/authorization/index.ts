import {  AbilityBuilder, PureAbility } from '@casl/ability';
import { getEvaluator } from 'boon-js';
import Action from './Actions';
import permissionRules from './Rules'


// We are using CASL library to define permissions.
// Instead of using Action-Subject based authorisation we are going with Claim based Authorization.
// We would be defining the permissions for each action and case, map with server permissiosn based upon certain rules.
// https://casl.js.org/v5/en/cookbook/claim-authorization
// Following the comment of Sergii Stotskyi, author of CASL
// https://github.com/stalniy/casl/issues/525
// We are defining a PureAbility and creating an instance with AbilityBuilder.
type ClaimBasedAbility = PureAbility<string>;
const { build } = new AbilityBuilder<ClaimBasedAbility>(PureAbility);
const ability = build();
export default ability;


/**
 * 
 * @param serverPermissions 
 * @returns 
 */
const prepareAppPermissions = (serverPermissions: any) => {
    const serverPermissionsInput = serverPermissions.reduce((serverPermissionsInput: any, permission: any) => {
        serverPermissionsInput[permission] = true;
        return serverPermissionsInput;
    }, {})
    const permissions = Object.keys(permissionRules).reduce((permissions: any, rule: any) => {
        const permissionRule = permissionRules[rule];
        if (!permissionRule || (permissionRule&& getEvaluator(permissionRule)(serverPermissionsInput))) {
            permissions.push(rule);
        }
        return permissions;
    }, [])
    const { can, rules } = new AbilityBuilder<ClaimBasedAbility>(PureAbility);
    permissions.map((permission: any) => {
        can(permission);
    })
    return rules;
}

/**
 * 
 * @param permissions 
 * @returns 
 */
const setPermissions = (permissions: any) => {
    // If the user has passed undefined or null, it should not break the code
    if (!permissions) permissions = [];
    return ability.update(permissions)
};

/**
 * 
 */
const resetPermissions = () => setPermissions([]);


/**
 * 
 * @param permission 
 * @returns 
 */
const hasPermission = (permission: string) => ability.can(permission);

export { Action, hasPermission, prepareAppPermissions, resetPermissions, setPermissions};