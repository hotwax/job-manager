import { AbilityBuilder, Ability } from '@casl/ability';

export const ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete'
}

export const SUBJECTS = {
    JOB: 'Job'
}

const ability = new Ability();

export const defineAbilityForUser = (user?: any) => {
    if (user) {
        const { can, rules } = new AbilityBuilder(Ability);
        can(ACTIONS.READ, SUBJECTS.JOB);
        can(ACTIONS.UPDATE, SUBJECTS.JOB);
        ability.update(rules);
    } else {
        ability.update([]);
    }
}
export const resetAbility = () => {
    ability.update([]);
}


export default ability;