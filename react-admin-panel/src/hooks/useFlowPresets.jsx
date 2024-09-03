import Formula from 'fparser';
import { isObject, safeObjectValues, zipToObject } from '../utils/misc';
import { calcMiddlePosition } from '../utils/reactFlow';
import { createMachineNode } from '../pages/NetworkPanel/NetworkPanel';

const builtInFunctions = {
    ifElse: (predicate, trueValue, falseValue) => (predicate ? trueValue : falseValue),
    or: (...args) => args.some(e => e),
    and: (...args) => args.every(e => e),
}

const calculateVariables = (variables, defaultScope = {}) => {
    let calculatedVariables = isObject(defaultScope) ? defaultScope : {};
    for (const [key, expression] of Object.entries(variables)) {
        calculatedVariables[key] = Formula.calc(`${expression}`, calculatedVariables);
    }
    return calculatedVariables;
}

const getCustomFunctions = (customFunctions, defaultScope = {}) => {
    if (!customFunctions) return {};

    let functions = {};
    for (const [key, func] of Object.entries(customFunctions)) {
        functions[key] = (...args) => Formula.calc(
            `${func.expression}`,
            { ...zipToObject(func.arguments, args), ...defaultScope }
        );
    }
    functions = { ...functions, ...builtInFunctions };

    return functions;
}


const getCoreFunctions = (coreFunctions, variables, customFunctions) => {
    const getIntnet = new Formula(coreFunctions.getIntnet);
    const getPosX = new Formula(coreFunctions.getPosX);
    const getPosY = new Formula(coreFunctions.getPosY);

    const setFormulasFunctions = (formula) => Object.entries(customFunctions).forEach(([key, func]) => formula[key] = func);

    setFormulasFunctions(getIntnet);
    setFormulasFunctions(getPosX);
    setFormulasFunctions(getPosY);

    return { getIntnet, getPosX, getPosY }
}

const calculateConfig = (machines, {getIntnet, getPosX, getPosY}, variables) => {
    const nodes = [];
    const intnets = {};

    const addMachineToIntnet = (intnetId, machineId) => {
        if (!intnets[intnetId]) intnets[intnetId] = { id: intnetId, machines: [] };
        intnets[intnetId].machines.push(machineId)
    }

    const createMachineNodes = () => safeObjectValues(machines).forEach((machine, i) => {
        const evalArguments = { ...machine, i: i, ...variables };

        addMachineToIntnet(getIntnet.evaluate(evalArguments), machine.id);
        nodes.push(createMachineNode(machine, {x: (getPosX.evaluate(evalArguments)) ?? 0, y: (getPosY.evaluate(evalArguments)) ?? 0}));
    });

    const createIntnetNodes = () => {
        safeObjectValues(intnets).forEach(intnet => {
            nodes.push({
                id: `intnet-${intnet.id}`,
                position: calcMiddlePosition(...intnet.machines.map(machineId =>
                    nodes.find(node => node.id === `machine-${machineId}`).position)
                ),
            })
        })
    }

    createMachineNodes();
    createIntnetNodes();

    return {flow: {nodes}, intnets};
}

const generateConfigFromPreset = (preset, machines) => {
    const defaultScope = { machines: { length: safeObjectValues(machines).length } };

    const variables = calculateVariables(preset.data.variables, defaultScope);
    const customFunctions = getCustomFunctions(preset.data.customFunctions, defaultScope);
    const coreFunctions = getCoreFunctions(preset.data.coreFunctions, variables, customFunctions);

    return calculateConfig(machines, coreFunctions, variables);
}

export default function useFlowPresets() {
    return { generateConfigFromPreset }
}