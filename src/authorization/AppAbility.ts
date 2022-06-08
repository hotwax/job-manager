import { Ability, AbilityClass } from '@casl/ability';

type Actions = 'create' | 'read' | 'update';
type Subjects = 'Job'

// TODO use AppAbility across app.
export type AppAbility = Ability<[Actions, Subjects]>;
export const AppAbility = Ability as AbilityClass<AppAbility>;
