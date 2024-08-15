import { Stack } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import CardGroup from "./components/CardGroup/CardGroup.jsx";
import MachineCard from "./components/MachineCard/MachineCard.jsx";

const mergeObjectPropertiesToArray = (a, b) =>
    Object.keys({ ...a, ...b })?.map(key => ({...a[key], ...b[key]}));

export default function MachineMainPage({authFetch, errorHandler}) {
    const navigate = useNavigate();
    const {loading: networkDataLoading, error: networkDataError, data: networkData} = authFetch('/vm/all/networkdata')
    const {loading: stateDataLoading, error: stateDataError, data: stateData} = authFetch('/vm/all/state')

    if(networkDataLoading || stateDataLoading) return;
    if(networkDataError || stateDataError) {
        errorHandler.handleErrorResponse(networkDataError || stateDataError);
        return;
    }

    const virtualMachines = mergeObjectPropertiesToArray(networkData, stateData);

    const getMachineCard = (machine) => (
        <MachineCard 
            machine={machine} 
            to={`./${machine.id}`} 
            navigate={navigate}
            key={machine.id}
        />
    )

    const getGroupedMachineCards = () => 
        virtualMachines.reduce((acc, machine) => {
            if (!acc[machine.group]) acc[machine.group] = [];

            acc[machine.group].push(getMachineCard(machine));
            return acc;
        }, {});

    const cards = getGroupedMachineCards();

    return (
        <Stack>
            {Object.keys(cards).map((group, i) => (
                <CardGroup key={i} group={group}>
                    {cards[group]}
                </CardGroup>
            ))}
        </Stack>        
    )
}
