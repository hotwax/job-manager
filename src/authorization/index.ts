import { AbilityBuilder, PureAbility } from '@casl/ability';
import { getEvaluator, parse } from 'boon-js';
import { Tokens } from 'boon-js/lib/types'

// TODO Improve this
let Actions = {} as any;
let Rules = {} as any;

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

const getServerPermissionsFromRules = () => {
    // Iterate for each rule
    const permissions = Object.keys(Rules).reduce((permissions: any, rule: any) => {
        const permissionRule = Rules[rule];
        // some rules may be empty, no permission is required from server
        if (permissionRule) {
            // Each rule may have multiple permissions along with operators
            const tokens = parse(permissionRule);
            permissions = tokens.reduce((permissions: any, token: any) => {
                // Token object with name as identifier has permissionId 
                if (Tokens.IDENTIFIER === token.name) {
                    permissions.push(token.value);
                }
                return permissions;
            }, permissions)
        }
        return permissions;
    }, [])
    return permissions;
}

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
    const permissions = Object.keys(Rules).reduce((permissions: any, rule: any) => {
        const permissionRule = Rules[rule];
        if (!permissionRule || (permissionRule && getEvaluator(permissionRule)(serverPermissionsInput))) {
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

export { Actions, getServerPermissionsFromRules, hasPermission, prepareAppPermissions, resetPermissions, setPermissions};

// TODO Move this code to an external plugin, to be used across the apps
export default {
    install(app: any, options: any) {

        // Rules and Actions could be app and OMS package specific
        Rules = options.rules;
        Actions = options.actions;

        // TODO Check why global properties is not working and apply across.
        app.config.globalProperties.$permission = this;
    },
    getServerPermissionsFromRules, 
    hasPermission, 
    prepareAppPermissions, 
    resetPermissions, 
    setPermissions
}
