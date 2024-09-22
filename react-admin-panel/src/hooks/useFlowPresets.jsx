import Formula from 'fparser';
import { isObject, safeObjectValues, zipToObject } from '../utils/misc';
import { calcMiddlePosition } from '../utils/reactFlow';
import { createMachineNode } from '../pages/NetworkPanel/NetworkPanel';

/**
 * @typedef {Object} RawVariables - non calculated, the values of the keys are uncalculated expressions
 * 
 * @typedef {Object} CalculatedVariables - with keys as the names of the variables used in other expressions
 * 
 * @typedef {Object} RawCustomFunction - function defined in a preset by the user
 * @property {string} expression - expression for the function
 * @property {Array} arguments - arguments the function should accept in order
 * 
 * @typedef {Object.<string, RawCustomFunction} RawCustomFunctions - object of custom functions defined in a preset by the user
 * 
 * @typedef {Object.<string, function>} CustomFunctions - preset custom functions turned into actuall javascript functions wrapping fparser calc methods.
 * 
 * @typedef {Object.<string, Formula>} CoreFunctions - necessary functions for calculating flow configuration
 */

/**
 * Functions built in to the interpreter
 */
const builtInFunctions = {
    ifElse: (predicate, trueValue, falseValue) => (predicate ? trueValue : falseValue),
    or: (...args) => args.some(e => e),
    and: (...args) => args.every(e => e),
}

/**
 * Turns custom variable expressions into values. Calculates each variable as an executed formula and pushes it to the scope for the future variables.
 * Next variables can reference past variables as their values have already been calculated.
 * 
 * VALID VARIABLES: {"a": "2 * 2", "b": "a * 8"}
 * 
 * b can reference a, as a's value has already been calulated.
 * 
 * INVALID VARIABLES:  {"a": "b * 2", "b": "2 * 8"}
 * 
 * a cannot reference b since b is yet to be added to the scope.
 * 
 * @param {RawVariables} variables - object where keys are the names of the variables and string values represent their expressions.
 * @param {CalculatedVariables} defaultScope - already calculated default variables
 * @returns {CalculatedVariables}
 */
const calculateVariables = (variables, defaultScope = {}) => {
    let calculatedVariables = isObject(defaultScope) ? defaultScope : {};
    for (const [key, expression] of Object.entries(variables)) {
        calculatedVariables[key] = Formula.calc(`${expression}`, calculatedVariables);
    }
    return calculatedVariables;
}

/**
 * Accepts custom function object as input and turns every function object into javascript function calling fparser calc method.
 * @param {RawCustomFunctions} customFunctions 
 * @param {CalculatedVariables} defaultScope - already calculated default variables
 * @returns {CustomFunctions}
 */
const getCustomFunctions = (customFunctions, defaultScope = {}) => {
    if (!customFunctions) return {};

    let functions = {};
    for (const [key, func] of Object.entries(customFunctions)) {
        // functions[key] is set to be a function accepting arguments for the expression and calling that expression using fparser
        functions[key] = (...args) => Formula.calc( 
            `${func.expression}`,                                       // formula's expression
            { ...zipToObject(func.arguments, args), ...defaultScope }   // formula's scope (CalculatedVariables)
        );
    }
    functions = { ...functions, ...builtInFunctions };

    return functions;
}

/**
 * Turns preset's core expressions into fparser Formulas. It then defines custom functions on the Formula objects.
 * @param {Object.<string, string>} coreFunctions - base functions needed for the main preset calculations
 * @param {CustomFunctions} customFunctions - additional functions to be used by the coreFunctions in calculations
 * @returns {CoreFunctions}
 */
const getCoreFunctions = (coreFunctions, customFunctions) => {
    const getIntnet = new Formula(coreFunctions.getIntnet);
    const getPosX = new Formula(coreFunctions.getPosX);
    const getPosY = new Formula(coreFunctions.getPosY);

    const setFormulasFunctions = (formula) => Object.entries(customFunctions).forEach(([key, func]) => formula[key] = func);

    setFormulasFunctions(getIntnet);
    setFormulasFunctions(getPosX);
    setFormulasFunctions(getPosY);

    return { getIntnet, getPosX, getPosY }
}

/**
 * Calculates all necessary data for flow initialization based on the preset.
 * @param {Array} machines - machine's network data fetched by the Network Panel and used to create machine nodes
 * @param {CoreFunctions} param - preset's core functions 
 * @param {CalculatedVariables} variables - calculated variables to be used by core functions 
 * @returns 
 */
const calculateConfig = (machines, {getIntnet, getPosX, getPosY}, variables) => {
    const nodes = [];
    const intnets = {};

    /**
     * Adds machine id to the machines array in the intnets object.
     * @param {number} intnetId
     * @param {number} machineId 
     */
    const addMachineToIntnet = (intnetId, machineId) => {
        if (!intnets[intnetId]) intnets[intnetId] = { id: intnetId, machines: [] };
        intnets[intnetId].machines.push(machineId)
    }

    /**
     * Creates machine nodes based on the core functions. It takes the machines array and goes through it, 
     * adding each machine to the approperiate intnet and setting its coordinates.
     * It uses core function getIntnet to evaluate the intnet for the machine and passes all needed arguments.
     * It uses core functions getPosX and getPosY to evaluate the machine's position;
     */
    const createMachineNodes = () => safeObjectValues(machines).forEach((machine, i) => {
        const evalArguments = { ...machine, i: i, ...variables }; //combined arguments to be used in the core functions

        addMachineToIntnet(getIntnet.evaluate(evalArguments), machine.id);
        nodes.push(createMachineNode(machine, {x: (getPosX.evaluate(evalArguments)) ?? 0, y: (getPosY.evaluate(evalArguments)) ?? 0}));
    });

    /**
     * Creates intnet nodes in the mean position of all the nodes in said intnets.
     */
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

/**
 * 
 * @param {object} preset - json body returned from the GET method. It includes all preset data.
 * @param {array} machines - array of machines loaded to the network panel
 * @returns 
 */
const generateConfigFromPreset = (preset, machines) => {
    const defaultScope = { machines: { length: safeObjectValues(machines).length } };

    const variables = calculateVariables(preset.data.variables, defaultScope);
    const customFunctions = getCustomFunctions(preset.data.customFunctions, defaultScope);
    const coreFunctions = getCoreFunctions(preset.data.coreFunctions, customFunctions);

    return calculateConfig(machines, coreFunctions, variables);
}

/**
 * Custom hook for using network panel's flow presets.
 * @returns {Object.<string,function>}
 */
export default function useFlowPresets() {
    return { generateConfigFromPreset }
}