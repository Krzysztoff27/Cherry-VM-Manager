/**
 * Checks if variable is type "Object".
 * @param {*} variable 
 * @returns {boolean}
 */
export const isObject = (variable) => typeof variable === 'object' && variable !== null && !Array.isArray(variable)

/**
 * Checks if variable is falsy or if it's length is 0
 * @param {*} variable 
 * @returns {boolean}
 */
export const noneOrEmpty = (variable) => !variable || !variable.length;

/**
 * Zips keys from keyArray and values from valueArray into one object
 * @param {Array} keyArray 
 * @param {Array} valueArray 
 * @returns {Object} ZippedObject
 */
export const zipToObject = (keyArray = [], valueArray = []) => noneOrEmpty(keyArray) || noneOrEmpty(valueArray) ? {} :
    keyArray.reduce((acc, key, i) => ({ ...acc, [key]: valueArray[i] }), {});

/**
 * Provides errorless Object.values experience
 * @param {Object} object
 * @returns {Array} array of values
 */
export const safeObjectValues = (obj = {}) => Object.values({ ...obj });

/**
 * Splits array into chunks
 * @param {Array} array - flat array
 * @param {Number} chunkSize - max number of elements in one chunk
 * @returns {Array} array of chunk arrays
 */
export const arrayIntoChunks = (array, chunkSize) => {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
};

/**
 * Returns string of current clock time.
 * @param {boolean} showSeconds - should seconds be also included in the returned value?
 * @returns {string} current clock time
 */
export const getCurrentTime = (showSeconds = true) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}${showSeconds ? `:${seconds}` : ''}`;
}

/**
 * setTimeout synchronized with real clock
 * @param {Function} func function to be called
 * @param {Number} secondsDelay delay in seconds
 * @returns clear timeout function
 */
export const clockSynchronizedTimeout = (func = () => { }, secondsDelay = 1) => {
    let timeout;
    const getDelay = () => 1000 * secondsDelay - new Date().getMilliseconds();;
    const syncLoadState = () => {
        func();
        timeout = setTimeout(syncLoadState, getDelay());
    };
    timeout = setTimeout(syncLoadState, getDelay());

    return () => clearTimeout(timeout);
}

export const isInRange = (value, min, max) => value >= min && value <= max;

export const startsWithLetter = (str = '') => str ? /[a-z]/i.test(str[0]) : false;

/**
 * Checks if element is occurs at multiple positions in the array
 * @param {any} element 
 * @param {Array} array 
 * @returns {boolean}
 */
export const hasMultipleOccurrences = (element, array = []) => array.filter(e => e === element).length > 1;

export const pluralize = (text, refAmount) => `${text}${refAmount > 1 ? 's' : ''}`

/**
 * Safely pushes to the array variable even if array given is undefined. Throws error if arr parameter is defined and is not an array.
 * @param {array|undefined} arr 
 * @param  {...any} elements
 * @returns array with pushed elements | error
 */
export const safePush = (arr, ...elements) => {
    if (arr === undefined) arr = [];
    if (!Array.isArray(arr)) throw (`Cannot push values into variable of type ${typeof arr}: ${arr}`)

    return [...arr, ...elements];
}

/**
 * Toggles the presence of a value in an array.
 * @param {Array} array - The array to toggle the value in.
 * @param {*} value - The value to toggle.
 * @returns {Array} - A new array with the value toggled (added or removed).
 */
export const toggleInArray = (array, value) => {
    const index = array.indexOf(value);

    return index === -1 ? [...array, value] : array.filter((_, i) => i !== index);
};

export const mergeObjectPropertiesToArray = (a, b) =>
    Object.keys({ ...a, ...b })?.map(key => ({ ...a[key], ...b?.[key] }));

export default {
    isObject,
    noneOrEmpty,
    safeObjectValues,
    arrayIntoChunks,
    getCurrentTime,
    clockSynchronizedTimeout,
    isInRange,
    startsWithLetter,
    hasMultipleOccurrences,
    pluralize,
    safePush,
    toggleInArray,
    mergeObjectPropertiesToArray
}