import { safePush } from "../../utils/misc";

const stateMatches = [
    { value: 'fetching', match: (m) => m.loading === undefined && m.active === undefined },
    { value: 'loading', match: (m) => m.loading },
    { value: 'offline', match: (m) => !m.active && !m.loading },
    { value: 'online', match: (m) => m.active && !m.loading },
]
const getGroupFromMatches = (matchesList, obj) => matchesList.find(({ match }) => match(obj)).value;

const groupByKey = (machines, key) =>
    machines.reduce((acc, machine) => ({ ...acc, [machine[key]]: safePush(acc[machine[key]], machine) }), {});

const groupByGroup = (machines) => groupByKey(machines, 'group');

const groupByMembership = (machines) => groupByGroup(machines, 'group_member_id');

const groupByState = (machines) =>
    machines.reduce((acc, machine) => {
        const group = getGroupFromMatches(stateMatches, machine);
        return ({ ...acc, [group]: safePush(acc[group], machine) });
    }, {});


export default function groupMachines(machines, groupBy) {
    const groupByMatches = {
        group: groupByGroup,
        state: groupByState,
        membership: groupByMembership
    }
    
    try {
        return groupByMatches[groupBy](machines);
    } catch (err) {
        console.error(`Could not group by the property ${groupBy}\n`, err)
    }
}