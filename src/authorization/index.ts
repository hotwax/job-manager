import { defineAbility } from '@casl/ability';
import store from '@/store';


const ability = defineAbility((can, cannot) => {
    const token = store.getters['user/getUserToken'];

    // TODO Implement logic to check role, or permission and set accordingly
    // Additionaly pass user information
    if (token) {
        can("read", "Job");
        can("update", "Job");
    } else {
        cannot("read", "Job");
        cannot("update", "Job");
    }

});

export default ability;