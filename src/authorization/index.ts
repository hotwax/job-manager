import {  AbilityBuilder, PureAbility } from '@casl/ability';
import { getEvaluator } from 'boon-js';
import Action from './Actions';

const permissionRules = {
    "APP_JOB_SKIP": "JOB_CREATE AND JOB_UPDATE",
    "APP_JOB_CANCEL": "JOB_UPDATE AND JOB_CANCEL",
    "APP_JOB_CANCEL1": "JOB_UPDATE AND JOB_CANCEL",
} as any;


const prepareAppPermissions = (serverPermissions: any) => {
    const serverPermissionsInput = serverPermissions.reduce((serverPermissionsInput: any, permission: any) => {
        serverPermissionsInput[permission] = true;
        return serverPermissionsInput;
    }, {})
    const permissions = Object.keys(permissionRules).reduce((permissions: any, rule: any) => {
        if (getEvaluator(permissionRules[rule])(serverPermissionsInput)) {
            permissions.push(rule);
        }
        return permissions;
    }, [])
    return permissions;
}

type ClaimBasedAbility = PureAbility<string>;
const { build } = new AbilityBuilder<ClaimBasedAbility>(PureAbility);
const ability = build();
// TODO Define default
export default ability;

const initUserPermissions = (user?: any) => {
    // if (user) {
    //     ability.update(user.permissions);
    // } else {
    //     ability.update([]);
    // }
    if (user) {
        // Prepare app permission from server permission
        const { can, rules } = new AbilityBuilder<ClaimBasedAbility>(PureAbility);
        prepareAppPermissions([ "JOB_CREATE", "JOB_UPDATE"]).map((permission: any) => {
            can(permission);
        })
        console.log("rules", rules);
        ability.update(rules);
    } else {
        ability.update([]);
    }
}

const updatePermissions = (permissions: any) => {
    const { can, rules } = new AbilityBuilder<ClaimBasedAbility>(PureAbility);
    prepareAppPermissions(permissions).map((permission: any) => {
        can(permission);
    })
    ability.update(rules);
}

const setPermissions = (permissions: any) => ability.update(permissions);

const resetPermissions = () => {
    updatePermissions([]);
}

const hasPermission = (permission: string) => {
    return ability.can(permission);
}

export { Action, initUserPermissions, hasPermission, resetPermissions, setPermissions, updatePermissions };